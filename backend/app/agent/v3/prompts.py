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

    # =========================================================================
    # HARDCODED TEST: Objetivo Final + Entities with Gates
    # =========================================================================

    objetivo_final_section = """## OBJETIVO FINAL
Seu objetivo é **agendar uma aula experimental**.

Para agendar, você PRECISA coletar:
- nome (obrigatório)
- telefone (obrigatório)

Conduza a conversa naturalmente em direção a esse objetivo."""

    # Entities with gates - simulating what RAG would return with gate info
    # We check collected_data to see if gates are satisfied
    collected = state.collected_data or {}

    entities_parts = []

    # Entity 1: Greeting (no gates, but opportunity to collect name)
    entities_parts.append("""### SITUAÇÃO: Saudação
Quando o usuário cumprimentar, responda de forma amigável e pergunte o nome dele.""")

    # Entity 2: Price info (soft gate on budget)
    budget_collected = collected.get("budget") or collected.get("orcamento")
    budget_asked = state.collected_data.get("_gate_price_budget_asked", False)

    if budget_collected:
        entities_parts.append("""### PRODUTO: Aula de Violão
Preço: R$150/mês (4 aulas)
Aula experimental: GRÁTIS
Inclui: Material didático, acesso ao app de prática""")
    elif budget_asked:
        # Soft gate broken - show anyway
        entities_parts.append("""### PRODUTO: Aula de Violão
Preço: R$150/mês (4 aulas)
Aula experimental: GRÁTIS
Inclui: Material didático, acesso ao app de prática
(Nota: cliente não informou orçamento)""")
    else:
        entities_parts.append("""### PRODUTO: Aula de Violão
⚠️ ANTES de falar o preço, pergunte: "Qual seria seu orçamento pra investir nas aulas?"
(Gate SOFT - só pergunte uma vez)""")

    # Entity 3: Scheduling (hard gate on name + phone)
    has_name = collected.get("name") or collected.get("nome")
    has_phone = collected.get("phone") or collected.get("telefone")

    if has_name and has_phone:
        entities_parts.append("""### AÇÃO: Agendar Aula Experimental
✅ Você pode agendar! Dados coletados.
Ofereça horários: Segunda a Sexta, 14h-20h
Confirme: nome, telefone, e horário escolhido""")
    else:
        missing = []
        if not has_name:
            missing.append("nome")
        if not has_phone:
            missing.append("telefone")
        entities_parts.append(f"""### AÇÃO: Agendar Aula Experimental
🔒 BLOQUEADO - Falta coletar: {', '.join(missing)}
Não é possível agendar sem esses dados. Colete-os primeiro.""")

    entities_section = "## CONTEXTO ATIVO\n" + "\n\n".join(entities_parts)

    # =========================================================================
    # END HARDCODED TEST
    # =========================================================================

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
        objetivo_final_section=objetivo_final_section,
        entities_section=entities_section,
        escalation_section=escalation_section,
        guardrails_section=guardrails_section,
        min_messages=config.multi_message.preferred_messages,
        max_messages=config.multi_message.max_messages,
        max_response_length=config.multi_message.max_response_length,
    )
