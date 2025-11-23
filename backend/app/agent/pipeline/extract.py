"""
Extract Pipeline Stage - 2x2 state extraction from conversation.

Input: last message + history + current state + agent config
Output: ExtractionResult (signals, trait_updates, gate_updates, mode_shift)

This is the first LLM call in the pipeline. It reads the conversation
and extracts structured state using the 2x2 model:
- Signals (ephemeral): intent, objection_type, etc.
- Traits (permanent): skill_level, use_case, customer_name
- Gates (derived): set based on trait/signal conditions
- Mode (derived): shift based on signal/gate conditions
"""

import json
from typing import Optional

from pydantic import BaseModel

from app.lib.retry import openai_retry
from app.agent.llm import get_openrouter_client, DEFAULT_MODEL
from app.agent.schema import (
    Signal,
    Trait,
    Gate,
    Mode,
    RuntimeState,
    ExtractionResult,
    Rule,
)


class AgentConfig(BaseModel):
    """Extraction-relevant agent configuration."""
    signals: list[Signal]
    traits: list[Trait]
    gates: list[Gate]
    modes: list[Mode]
    rules: list[Rule]  # For mode transition rules


def _build_extraction_prompt(
    config: AgentConfig,
    state: RuntimeState,
    last_message: str,
) -> str:
    """Build the system prompt for extraction.

    Note: Conversation history is passed as separate messages in the API call,
    not embedded in the system prompt. This gives the LLM proper context.
    """

    # Build signals section
    signals_desc = []
    for s in config.signals:
        if s.type == "enum" and s.options:
            signals_desc.append(f"- {s.id}: {s.detection_hint} (options: {', '.join(s.options)})")
        else:
            signals_desc.append(f"- {s.id}: {s.detection_hint}")
    signals_section = "\n".join(signals_desc) if signals_desc else "None defined"

    # Build traits section
    traits_desc = []
    for t in config.traits:
        current_val = state.traits.get(t.id, "unknown")
        if t.type == "enum" and t.options:
            traits_desc.append(f"- {t.id}: {t.detection_hint} (options: {', '.join(t.options)}) [current: {current_val}]")
        else:
            traits_desc.append(f"- {t.id}: {t.detection_hint} [current: {current_val}]")
    traits_section = "\n".join(traits_desc) if traits_desc else "None defined"

    # Current state summary
    state_summary = f"""Current state:
- Mode: {state.mode}
- Gates: {json.dumps(state.gates)}
- Traits: {json.dumps(state.traits)}
- Turn: {state.turn_count}"""

    return f"""You are a state extraction system. Analyze the customer's message and extract structured information.

SIGNALS TO DETECT (what just happened this message):
{signals_section}

TRAITS TO EXTRACT (who the user is - update only if new info):
{traits_section}

{state_summary}

RULES:
1. Signals are per-message - detect what's happening NOW
2. Traits persist - only update if the message reveals NEW information
3. If unsure about a signal, use "other" or null
4. If a trait was already set and not contradicted, keep it

Output JSON with:
- signals: detected signals for this message
- trait_updates: only traits that changed (empty if no changes)"""


def _build_json_schema(config: AgentConfig) -> dict:
    """Build JSON schema for structured output."""

    # Signal properties
    signal_props = {}
    for s in config.signals:
        if s.type == "enum" and s.options:
            signal_props[s.id] = {
                "type": "string",
                "enum": s.options + ["null"],
                "description": s.detection_hint
            }
        elif s.type == "boolean":
            signal_props[s.id] = {
                "type": "string",
                "enum": ["true", "false", "null"],
                "description": s.detection_hint
            }
        else:
            signal_props[s.id] = {
                "type": "string",
                "description": s.detection_hint
            }

    # Trait properties (for updates only)
    trait_props = {}
    for t in config.traits:
        if t.type == "enum" and t.options:
            trait_props[t.id] = {
                "type": "string",
                "enum": t.options + [""],
                "description": f"{t.detection_hint} (empty string if no update)"
            }
        else:
            trait_props[t.id] = {
                "type": "string",
                "description": f"{t.detection_hint} (empty string if no update)"
            }

    return {
        "type": "json_schema",
        "json_schema": {
            "name": "extraction_result",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "signals": {
                        "type": "object",
                        "properties": signal_props,
                        "required": list(signal_props.keys()),
                        "additionalProperties": False
                    },
                    "trait_updates": {
                        "type": "object",
                        "properties": trait_props,
                        "required": list(trait_props.keys()),
                        "additionalProperties": False
                    }
                },
                "required": ["signals", "trait_updates"],
                "additionalProperties": False
            }
        }
    }


def _derive_gate_updates(
    config: AgentConfig,
    state: RuntimeState,
    signals: dict,
    trait_updates: dict
) -> dict[str, bool]:
    """
    Derive gate updates from signals and traits.
    Gates are set based on their conditions, never unset.
    Fully data-driven - no hardcoded gate logic.
    """
    updates = {}

    # Merge current traits with updates for evaluation
    merged_traits = {**state.traits, **{k: v for k, v in trait_updates.items() if v}}

    # Build evaluation state
    eval_state = {
        "gates": state.gates,
        "traits": merged_traits,
        "signals": signals,
        "mode": state.mode
    }

    for gate in config.gates:
        # Skip if already set (gates never unset)
        if state.gates.get(gate.id, False):
            continue

        # Skip if no condition defined (set by other means, e.g., tool execution)
        if not gate.condition:
            continue

        # Evaluate condition
        if gate.condition.evaluate(eval_state):
            updates[gate.id] = True

    return updates


def _derive_mode_shift(
    config: AgentConfig,
    state: RuntimeState,
    signals: dict,
    gate_updates: dict
) -> Optional[str]:
    """
    Derive mode shift from signals, gates, and rules.
    Lower priority = higher importance (priority 1 wins over priority 50).
    """
    # Merge current gates with updates for evaluation
    merged_gates = {**state.gates, **gate_updates}

    # Build evaluation state
    eval_state = {
        "gates": merged_gates,
        "traits": state.traits,
        "signals": signals,
        "mode": state.mode
    }

    # Get all rules with mode shifts, sorted by priority (lower = more important)
    mode_shift_rules = [r for r in config.rules if r.mode_shift]
    mode_shift_rules.sort(key=lambda r: r.priority)

    for rule in mode_shift_rules:
        if rule.evaluate(eval_state):
            return rule.mode_shift

    return None


@openai_retry
def _call_extraction_api(client, messages: list, response_format: dict) -> dict:
    """Call OpenRouter API with retry logic."""
    print("  [API] Extraction call with X-Title: ConnectAI-Extraction")
    response = client.chat.completions.create(
        model=DEFAULT_MODEL,
        messages=messages,
        response_format=response_format,
        temperature=0.1,  # Low temperature for consistent extraction
        extra_headers={
            "HTTP-Referer": "https://connectai.com.br",
            "X-Title": "ConnectAI-Extraction"
        }
    )

    return {
        "content": json.loads(response.choices[0].message.content),
        "usage": {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens
        }
    }


def extract(
    config: AgentConfig,
    state: RuntimeState,
    last_message: str,
    history: list[dict] = None,
) -> ExtractionResult:
    """
    Main extraction function.

    Args:
        config: Agent configuration with signals, traits, gates, modes, rules
        state: Current runtime state
        last_message: The customer's last message
        history: Optional conversation history as list of {"role": "user"|"assistant", "content": "..."}
                 Last 5 turns (10 messages) recommended for context.

    Returns:
        ExtractionResult with signals, trait_updates, gate_updates, mode_shift

    # TODO: When integrated with LangGraph, history will come from graph state:
    #       messages = graph_state.get("messages", [])
    #       history = messages[-10:]  # Last 5 turns
    #       This function should be called from the extract_node in graph.py
    """
    print("-> Extract")

    if not last_message:
        return ExtractionResult(reasoning="No message to extract from")

    # Build prompt and schema
    system_prompt = _build_extraction_prompt(config, state, last_message)
    json_schema = _build_json_schema(config)

    # Build messages array with history context
    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history if provided (last 5 turns = 10 messages max)
    if history:
        messages.extend(history[-10:])

    # Add current message to extract from
    messages.append({"role": "user", "content": f"Customer message: {last_message}"})

    # Call LLM
    try:
        client = get_openrouter_client()
        result = _call_extraction_api(
            client,
            messages=messages,
            response_format=json_schema
        )

        extracted = result["content"]
        usage = result["usage"]

        # Parse signals (convert "null" strings to None)
        signals = {}
        for k, v in extracted.get("signals", {}).items():
            signals[k] = None if v == "null" else v

        # Parse trait updates (filter empty strings)
        trait_updates = {
            k: v for k, v in extracted.get("trait_updates", {}).items()
            if v and v.strip()
        }

        # Derive gate updates
        gate_updates = _derive_gate_updates(config, state, signals, trait_updates)

        # Derive mode shift
        mode_shift = _derive_mode_shift(config, state, signals, gate_updates)

        reasoning = extracted.get("reasoning", "")

        print(f"  Signals: {signals}")
        print(f"  Trait updates: {trait_updates}")
        print(f"  Gate updates: {gate_updates}")
        print(f"  Mode shift: {mode_shift}")
        print(f"  Tokens: {usage['total_tokens']}")

        return ExtractionResult(
            signals=signals,
            trait_updates=trait_updates,
            gate_updates=gate_updates,
            mode_shift=mode_shift,
            reasoning=reasoning
        )

    except Exception as e:
        print(f"  Extraction error: {e}")
        return ExtractionResult(reasoning=f"Extraction failed: {str(e)}")
