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

{objectives_section}

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


def format_guardrails(guardrails: Guardrails) -> str:
    """Format guardrails for prompt."""
    lines = []

    if guardrails.never_say:
        lines.append("NUNCA DIGA:")
        for item in guardrails.never_say:
            lines.append(f'  - "{item}"')

    if guardrails.never_do:
        lines.append("\nNUNCA FAÇA:")
        for item in guardrails.never_do:
            lines.append(f"  - {item}")

    if guardrails.always_do:
        lines.append("\nSEMPRE FAÇA:")
        for item in guardrails.always_do:
            lines.append(f"  - {item}")

    return "\n".join(lines) if lines else ""


def build_generation_prompt(
    config: BaseAgentConfig,
    state: AgentState,
    chunks: list[ChunkMatch],
) -> str:
    """Build the generation system prompt."""

    # RAG section
    rag_section = format_rag_context(chunks)

    # Objectives section
    objectives = config.format_objectives()
    objectives_section = f"## OBJETIVOS\n{objectives}" if objectives else ""

    # Escalation section
    escalation = config.format_escalation_triggers()
    escalation_section = f"## ESCALAÇÃO\n{escalation}" if escalation else ""

    # Guardrails section
    guardrails = format_guardrails(config.guardrails)
    guardrails_section = f"## REGRAS\n{guardrails}" if guardrails else ""

    return GENERATION_SYSTEM_TEMPLATE.format(
        agent_name=config.agent_name,
        agent_description=config.agent_description,
        rag_section=rag_section,
        objectives_section=objectives_section,
        escalation_section=escalation_section,
        guardrails_section=guardrails_section,
        min_messages=config.multi_message.preferred_messages,
        max_messages=config.multi_message.max_messages,
        max_response_length=config.multi_message.max_response_length,
    )
