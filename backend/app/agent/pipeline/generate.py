"""
Generate Pipeline Stage - LLM response generation.

Input: context + history + state + mode + agent config
Output: Response messages + tool decisions

Uses structured output (JSON mode) to enforce WhatsApp-style
message formatting directly from the LLM.
"""

import json
from typing import Optional

from pydantic import BaseModel

from app.lib.retry import openai_retry
from app.agent.llm import get_openrouter_client, DEFAULT_MODEL
from app.agent.schema import RuntimeState, ChunkMatch, Tool, ToolCall, Mode, AgentResponse, Objective


class GenerateResult(BaseModel):
    """Result of response generation."""
    messages: list[str] = []  # WhatsApp-style message list
    tool_calls: list[ToolCall] = []
    tokens_used: dict = {}


def _build_system_prompt(
    agent_name: str,
    agent_description: str,
    personality: dict,
    mode: Optional[Mode],
    context_chunks: list[ChunkMatch],
    state: RuntimeState,
    tools: list[Tool],
    validation_rules: dict
) -> str:
    """Build system prompt with mode instructions and assembled context."""

    # Personality
    tone = personality.get("tone", "friendly")
    language = personality.get("language", "pt")
    emojis = personality.get("emoji_usage", "minimal")
    style = personality.get("style", "")

    # Response format config
    response_format = personality.get("response_format", {})

    # Mode instructions
    mode_section = ""
    if mode:
        mode_section = f"""
CURRENT MODE: {mode.name}
{mode.instructions}"""
        if mode.avoid:
            mode_section += f"\n\nNÃO FAÇA neste modo:\n- " + "\n- ".join(mode.avoid)

        # Compute missing objectives (targets not yet filled)
        if mode.objectives:
            missing_objectives = []
            for obj in mode.objectives:
                target = obj.target
                is_filled = False

                if target.startswith("trait."):
                    trait_id = target[6:]  # Remove "trait." prefix
                    val = state.traits.get(trait_id)
                    is_filled = val is not None and val != ""
                elif target.startswith("gate."):
                    gate_id = target[5:]  # Remove "gate." prefix
                    is_filled = state.gates.get(gate_id, False)

                if not is_filled:
                    missing_objectives.append(obj)

            if missing_objectives:
                hints = [obj.hint for obj in missing_objectives]
                mode_section += f"\n\nOBJETIVO: Termine a resposta com uma pergunta direcionada."
                mode_section += f"\nSugestões de pergunta:\n- " + "\n- ".join(hints)

    # Format context chunks
    context_text = ""
    if context_chunks:
        context_parts = []
        for cm in context_chunks:
            title = cm.chunk.title or "Info"
            context_parts.append(f"[{title}]\n{cm.chunk.content}")
        context_text = "\n\n".join(context_parts)

    # Format customer info from traits
    customer_info = []
    if state.traits:
        name = state.traits.get("customer_name")
        if name:
            customer_info.append(f"Nome: {name}")
        skill = state.traits.get("skill_level")
        if skill:
            customer_info.append(f"Nível: {skill}")
        use_case = state.traits.get("use_case")
        if use_case:
            customer_info.append(f"Objetivo: {use_case}")
    customer_text = ", ".join(customer_info) if customer_info else "Ainda não identificado"

    # Format validation rules
    validation_text = ""
    if validation_rules:
        never_say = validation_rules.get("never_say", [])
        if never_say:
            validation_text = "\n\nNUNCA diga: " + ", ".join(f'"{s}"' for s in never_say)
        never_do = validation_rules.get("never_do", [])
        if never_do:
            validation_text += "\n\nNUNCA faça:\n- " + "\n- ".join(never_do)

    # Build formatting section
    format_style = response_format.get("style", "whatsapp")
    max_messages = response_format.get("max_messages", 3)
    examples = response_format.get("examples", {})

    format_section = f"""
FORMATO DE RESPOSTA:
Responda como mensagens de WhatsApp - curtas, naturais, humanas.
- Máximo {max_messages} mensagens por resposta
- Cada mensagem = 1 pensamento ou pergunta
- Primeira letra maiúscula, resto natural
- Sem formalidade excessiva, como se fosse um amigo que manja do assunto
- Sempre termine com algo que avança a conversa"""

    if examples.get("good"):
        format_section += f"""

BOM exemplo:
{chr(10).join(f'"{m}"' for m in examples["good"])}"""

    if examples.get("bad"):
        format_section += f"""

EVITE (muito formal/robótico):
{chr(10).join(f'"{m}"' for m in examples["bad"])}"""

    return f"""Você é {agent_name}.

{agent_description}

PERSONALIDADE:
- Tom: {tone}
- Idioma: {language}
- Emojis: {emojis}
- Estilo: {style}
{format_section}
{mode_section}

SOBRE O CLIENTE:
{customer_text}

CONHECIMENTO RELEVANTE:
{context_text if context_text else "Nenhum contexto específico carregado."}
{validation_text}

Sua resposta será um JSON com formato: {{"messages": ["msg1", "msg2"]}}"""


# Strict JSON schema for structured output
RESPONSE_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "agent_response",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "messages": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of short WhatsApp-style messages, 1-3 items"
                }
            },
            "required": ["messages"],
            "additionalProperties": False
        }
    }
}


@openai_retry
def _call_generate_api(client, messages: list, model: str, temperature: float):
    """Call OpenRouter API for generation with strict structured output."""
    return client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=500,
        response_format=RESPONSE_SCHEMA,
        extra_headers={
            "HTTP-Referer": "https://connectai.com.br",
            "X-Title": "ConnectAI-Generation"
        }
    )


def generate(
    state: RuntimeState,
    context_chunks: list[ChunkMatch],
    messages: list[dict],
    agent_name: str = "Agent",
    agent_description: str = "",
    personality: dict = None,
    mode: Optional[Mode] = None,
    tools: list[Tool] = None,
    validation_rules: dict = None,
    model: str = DEFAULT_MODEL,
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
        mode: Current mode with instructions
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
        mode=mode,
        context_chunks=context_chunks,
        state=state,
        tools=tools,
        validation_rules=validation_rules
    )

    try:
        client = get_openrouter_client()
        response = _call_generate_api(
            client,
            messages=[
                {"role": "system", "content": system_prompt},
                *messages
            ],
            model=model,
            temperature=temperature
        )

        # Parse JSON response
        raw_content = response.choices[0].message.content
        parsed = json.loads(raw_content)
        messages_list = parsed.get("messages", [])

        # Ensure we have at least one message
        if not messages_list:
            messages_list = ["Desculpe, pode repetir?"]

        result = GenerateResult(
            messages=messages_list,
            tokens_used={
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        )

        print(f"  Messages: {result.messages}")
        print(f"  Tokens: {result.tokens_used['total_tokens']}")

        return result

    except json.JSONDecodeError as e:
        print(f"  JSON parse error: {e}")
        return GenerateResult(messages=["Desculpe, ocorreu um erro. Pode repetir?"])
    except Exception as e:
        print(f"  Generation error: {e}")
        return GenerateResult(messages=["Desculpe, ocorreu um erro. Pode repetir?"])
