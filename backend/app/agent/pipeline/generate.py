"""
Generate Pipeline Stage - LLM response generation.

Input: context + history + state + agent config
Output: Response text + tool decisions
"""

import os
from typing import Optional

from openai import OpenAI
from pydantic import BaseModel

from app.lib.retry import openai_retry
from app.agent.schema import RuntimeState, ChunkMatch, Tool, ToolCall


class GenerateResult(BaseModel):
    """Result of response generation."""
    response: str = ""
    tool_calls: list[ToolCall] = []
    tokens_used: dict = {}


_client: Optional[OpenAI] = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client


def _build_system_prompt(
    agent_name: str,
    agent_description: str,
    personality: dict,
    context_chunks: list[ChunkMatch],
    state: RuntimeState,
    tools: list[Tool],
    validation_rules: dict
) -> str:
    """Build system prompt with assembled context."""

    # Format context
    context_text = ""
    if context_chunks:
        context_parts = []
        for cm in context_chunks:
            title = cm.chunk.title or "Info"
            context_parts.append(f"[{title}]\n{cm.chunk.content}")
        context_text = "\n\n".join(context_parts)

    # Format state
    state_text = f"""Current conversation state:
- Mode: {state.mode}
- Customer traits: {state.traits}
- Progress: {state.gates}"""

    # Format validation rules
    validation_text = ""
    if validation_rules:
        never_say = validation_rules.get("never_say", [])
        if never_say:
            validation_text = f"\n\nNEVER say: {', '.join(never_say)}"

    # Personality
    tone = personality.get("tone", "friendly")
    language = personality.get("language", "pt")
    emojis = personality.get("emoji_usage", "minimal")

    return f"""You are {agent_name}, a conversational agent.

{agent_description}

PERSONALITY:
- Tone: {tone}
- Language: {language}
- Emojis: {emojis}

{state_text}

RELEVANT KNOWLEDGE:
{context_text if context_text else "No specific context loaded."}
{validation_text}

Respond naturally to the customer's message. Be helpful and guide them forward."""


@openai_retry
def _call_generate_api(client: OpenAI, messages: list, model: str, temperature: float):
    """Call OpenAI API for generation."""
    return client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=500
    )


def generate(
    state: RuntimeState,
    context_chunks: list[ChunkMatch],
    messages: list[dict],
    agent_name: str = "Agent",
    agent_description: str = "",
    personality: dict = None,
    tools: list[Tool] = None,
    validation_rules: dict = None,
    model: str = "gpt-4o-mini",
    temperature: float = 0.7
) -> GenerateResult:
    """
    Generate response using LLM.

    Args:
        state: Current runtime state
        context_chunks: Assembled context from ASSEMBLE stage
        messages: Conversation history
        agent_name: Name of the agent
        agent_description: Agent's business description
        personality: Tone, language, emoji settings
        tools: Available tools (for future tool calling)
        validation_rules: Rules for response constraints
        model: LLM model to use
        temperature: Generation temperature

    Returns:
        GenerateResult with response text and tool calls
    """
    print("-> Generate")

    personality = personality or {}
    tools = tools or []
    validation_rules = validation_rules or {}

    system_prompt = _build_system_prompt(
        agent_name=agent_name,
        agent_description=agent_description,
        personality=personality,
        context_chunks=context_chunks,
        state=state,
        tools=tools,
        validation_rules=validation_rules
    )

    try:
        client = _get_client()
        response = _call_generate_api(
            client,
            messages=[
                {"role": "system", "content": system_prompt},
                *messages
            ],
            model=model,
            temperature=temperature
        )

        result = GenerateResult(
            response=response.choices[0].message.content,
            tokens_used={
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        )

        print(f"  Response: {result.response[:100]}...")
        print(f"  Tokens: {result.tokens_used['total_tokens']}")

        return result

    except Exception as e:
        print(f"  Generation error: {e}")
        return GenerateResult(response="Desculpe, ocorreu um erro. Pode repetir?")
