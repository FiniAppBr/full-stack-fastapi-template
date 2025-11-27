"""
v3 Prompts - Generation prompt template.

Simple, focused prompt for LLM generation.
Escalation is handled by LLM based on user-defined conditions.
"""

from app.agent.v3.schema import (
    AgentState,
    ChunkMatch,
    Guardrails,
)
from app.agent.v3.config import BaseAgentConfig


# =============================================================================
# GENERATION PROMPT
# =============================================================================

GENERATION_SYSTEM_TEMPLATE = """Você é {agent_name}.

{agent_description}

{rag_section}

{objetivo_final_section}

{entities_section}

{escalation_section}

## COMO RESPONDER
- Responda de forma natural e direta
- DIVIDA sua resposta em {min_messages}-{max_messages} mensagens curtas (estilo WhatsApp)
- Cada mensagem deve ser CURTA (máximo ~{max_response_length} caracteres no total)
- Termine com uma pergunta que avança a conversa
- Se perguntar algo direto (preço, como funciona), RESPONDA DIRETO primeiro

## REGRAS IMPORTANTES
- NÃO invente informações - se não sabe, diga que vai verificar
- NÃO repita perguntas já respondidas na conversa
- NÃO diga "Olá", "Oi" ou se apresente após a primeira mensagem - vá direto ao ponto
- Use o contexto da conversa para manter continuidade

{guardrails_section}
"""


def format_rag_context(chunks: list[ChunkMatch]) -> str:
    """Format RAG chunks for prompt."""
    if not chunks:
        return ""

    entity_parts = []
    knowledge_parts = []

    for chunk in chunks:
        content = f"**{chunk.title}**\n{chunk.content}" if chunk.title else chunk.content
        if chunk.is_entity:
            entity_parts.append(content)
        else:
            knowledge_parts.append(content)

    sections = []

    if entity_parts:
        sections.append(f"""## REFERÊNCIA (dados potencialmente relevantes)
{chr(10).join(entity_parts)}""")

    if knowledge_parts:
        sections.append(f"""## CONHECIMENTO RELEVANTE
{chr(10).join(knowledge_parts)}""")

    return "\n\n".join(sections)


def format_guardrails(guardrails: Guardrails, turn_count: int = 0) -> str:
    """Format guardrails for prompt, filtered by turn count."""
    # Filter guardrails by turn
    filtered = guardrails.filter_by_turn(turn_count)
    lines = []

    if filtered.never_say:
        lines.append("NUNCA DIGA:")
        for rule in filtered.never_say:
            lines.append(f'  - "{rule.text}"')

    if filtered.never_do:
        lines.append("\nNUNCA FAÇA:")
        for rule in filtered.never_do:
            lines.append(f"  - {rule.text}")

    if filtered.always_do:
        lines.append("\nSEMPRE FAÇA:")
        for rule in filtered.always_do:
            lines.append(f"  - {rule.text}")

    return "\n".join(lines) if lines else ""


def build_generation_prompt(
    config: BaseAgentConfig,
    state: AgentState,
    chunks: list[ChunkMatch],
) -> str:
    """Build the generation system prompt."""

    # RAG section (knowledge from linked entities)
    rag_section = format_rag_context(chunks)

    # Objectives section (from config - includes data collection hints)
    objectives_text = config.format_objectives()
    if objectives_text:
        objetivo_final_section = f"""## OBJETIVOS DA CONVERSA
{objectives_text}

Conduza a conversa naturalmente em direção a esses objetivos."""
    else:
        objetivo_final_section = ""

    # Entities section - just use RAG, no hardcoded content
    entities_section = ""

    # Escalation section
    escalation = config.format_escalation_triggers()
    escalation_section = f"## ESCALAÇÃO\n{escalation}" if escalation else ""

    # Guardrails section (filtered by turn count)
    turn_count = state.turn_count if state else 0
    guardrails = format_guardrails(config.guardrails, turn_count)
    guardrails_section = f"## REGRAS\n{guardrails}" if guardrails else ""

    return GENERATION_SYSTEM_TEMPLATE.format(
        agent_name=config.agent_name,
        agent_description=config.agent_description,
        rag_section=rag_section,
        objetivo_final_section=objetivo_final_section,
        entities_section=entities_section,
        escalation_section=escalation_section,
        guardrails_section=guardrails_section,
        min_messages=config.multi_message.preferred_messages,
        max_messages=config.multi_message.max_messages,
        max_response_length=config.multi_message.max_response_length,
    )
