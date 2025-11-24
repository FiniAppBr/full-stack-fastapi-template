"""
v3 Extract Pipeline - Extract traits, intent, objection from user message.

Input: message + history + state + config
Output: ExtractionResult (trait_updates, intent, objection_type)
"""

import json
from typing import Any

from app.lib.retry import openai_retry
from app.agent.llm import get_openrouter_client
from app.agent.v3.schema import AgentState, ExtractionResult
from app.agent.v3.config import BaseAgentConfig
from app.agent.v3.prompts import (
    build_extraction_prompt,
    format_traits_for_extraction,
    format_intents_for_extraction,
    format_objection_types_for_extraction,
)


@openai_retry
def _call_extraction_api(client, messages: list, model: str, response_format: dict) -> dict:
    """Call LLM API for extraction with retry logic."""
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        response_format=response_format,
        temperature=0.1,
        extra_body={
            "provider": {
                "order": ["Chutes"],
                "allow_fallbacks": True,
            }
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
    config: BaseAgentConfig,
    state: AgentState,
    message: str,
) -> ExtractionResult:
    """
    Extract structured information from user message.

    Args:
        config: Agent configuration
        state: Current conversation state
        message: User's message

    Returns:
        ExtractionResult with trait_updates, intent, objection_type
    """
    print("-> Extract (v3)")

    if not message:
        return ExtractionResult(intent="unknown")

    # Build prompt sections from config
    traits_section = format_traits_for_extraction(config.traits)
    intents_section = format_intents_for_extraction(config.intents)
    objection_section = format_objection_types_for_extraction(config.objection_types)

    # Build system prompt
    system_prompt = build_extraction_prompt(
        traits_section=traits_section,
        intents_section=intents_section,
        objection_types_section=objection_section,
        state=state
    )

    # Build messages with history
    messages = [{"role": "system", "content": system_prompt}]

    # Add recent history for context
    history = state.get_recent_history(config.extraction.history_turns)
    messages.extend(history)

    # Add current message
    messages.append({"role": "user", "content": f"Mensagem do cliente: {message}"})

    # Build schema from config
    response_format = config.build_extraction_schema()

    try:
        client = get_openrouter_client()
        result = _call_extraction_api(
            client,
            messages=messages,
            model=config.extraction.model,
            response_format=response_format
        )

        extracted = result["content"]
        usage = result["usage"]

        # Parse trait updates (filter None/null values)
        trait_updates = {}
        for key, value in extracted.get("trait_updates", {}).items():
            if value is not None and value != "" and str(value).lower() not in ["null", "none"]:
                trait_updates[key] = value

        # Parse intent
        intent = extracted.get("intent", "unknown")

        # Parse objection type
        objection_type = extracted.get("objection_type")
        if objection_type and str(objection_type).lower() in ["null", "none", ""]:
            objection_type = None

        print(f"  Intent: {intent}")
        print(f"  Trait updates: {trait_updates}")
        print(f"  Objection type: {objection_type}")
        print(f"  Tokens: {usage['total_tokens']}")

        return ExtractionResult(
            trait_updates=trait_updates,
            intent=intent,
            objection_type=objection_type,
            raw_response=extracted,
            tokens_used=usage["total_tokens"]
        )

    except Exception as e:
        print(f"  Extraction error: {e}")
        return ExtractionResult(intent="unknown")


def update_state_from_extraction(
    config: BaseAgentConfig,
    state: AgentState,
    extraction: ExtractionResult,
    message: str
) -> AgentState:
    """
    Update state based on extraction results.

    Args:
        config: Agent configuration
        state: Current state
        extraction: Extraction result
        message: User's message (for history)

    Returns:
        Updated state
    """
    # Update traits
    for trait_id, value in extraction.trait_updates.items():
        state.set_trait(trait_id, value)

    # Track objection
    if extraction.objection_type:
        state.add_objection(extraction.objection_type)

    # Check for events that trigger on intent
    for event in config.events:
        if event.detect_on_extraction and extraction.intent in event.trigger_intents:
            state.set_event(event.id, True)

    # Add message to history
    state.add_to_history("user", message)

    # Increment turn
    state.turn_count += 1

    return state
