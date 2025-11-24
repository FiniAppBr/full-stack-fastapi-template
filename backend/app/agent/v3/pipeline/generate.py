"""
v3 Generate Pipeline - Generate response using LLM.

Input: config + state + assembled context
Output: GenerateResult (messages, tokens_used)
"""

import json

from app.lib.retry import openai_retry
from app.agent.llm import get_openrouter_client
from app.agent.v3.schema import (
    AgentState,
    AssembleResult,
    GenerateResult,
)
from app.agent.v3.config import BaseAgentConfig
from app.agent.v3.prompts import (
    build_generation_prompt,
    format_context_chunks,
    format_examples,
)


@openai_retry
def _call_generation_api(
    client,
    messages: list,
    model: str,
    response_format: dict,
    temperature: float,
    max_tokens: int
) -> dict:
    """Call LLM API for generation with retry logic."""
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        response_format=response_format,
        temperature=temperature,
        max_tokens=max_tokens,
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


def generate(
    config: BaseAgentConfig,
    state: AgentState,
    assembled: AssembleResult,
) -> GenerateResult:
    """
    Generate response using LLM.

    Args:
        config: Agent configuration
        state: Current conversation state
        assembled: Assembled context (chunks + examples)

    Returns:
        GenerateResult with messages
    """
    print("-> Generate (v3)")

    # Build event labels for state display
    event_labels = {e.id: e.description or e.id for e in config.events}

    # Build system prompt
    system_prompt = build_generation_prompt(
        agent_name=config.agent_name,
        agent_description=config.agent_description,
        product_summary=config.format_product_summary(),
        state=state,
        objectives=config.objectives,
        event_labels=event_labels,
        chunks=assembled.chunks,
        examples=assembled.examples,
        guardrails=config.guardrails,
        max_messages=config.multi_message.max_messages,
        preferred_messages=config.multi_message.preferred_messages
    )

    # Build messages with history
    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history
    history = state.get_recent_history(config.generation.history_turns)
    messages.extend(history)

    # Build schema
    response_format = config.build_generation_schema()

    try:
        client = get_openrouter_client()
        result = _call_generation_api(
            client,
            messages=messages,
            model=config.generation.model,
            response_format=response_format,
            temperature=config.generation.temperature,
            max_tokens=config.generation.max_tokens
        )

        generated = result["content"]
        usage = result["usage"]

        # Extract messages
        response_messages = generated.get("messages", [])

        # Ensure we have at least one message
        if not response_messages:
            response_messages = ["Desculpe, pode repetir?"]

        print(f"  Messages: {len(response_messages)}")
        print(f"  Tokens: {usage['total_tokens']}")

        return GenerateResult(
            messages=response_messages,
            tokens_used=usage["total_tokens"],
            raw_response=generated
        )

    except json.JSONDecodeError as e:
        print(f"  JSON parse error: {e}")
        return GenerateResult(messages=["Desculpe, ocorreu um erro. Pode repetir?"])
    except Exception as e:
        print(f"  Generation error: {e}")
        return GenerateResult(messages=["Desculpe, ocorreu um erro. Pode repetir?"])


def update_state_from_generation(
    state: AgentState,
    generated: GenerateResult
) -> AgentState:
    """
    Update state after generation (add assistant messages to history).

    Args:
        state: Current state
        generated: Generation result

    Returns:
        Updated state
    """
    # Add each message to history as separate assistant turns
    for msg in generated.messages:
        state.add_to_history("assistant", msg)

    return state
