"""
v3 Prompts - Base prompt templates for all agents.

These templates use placeholders that get filled with agent-specific data.
Universal guidance (mirroring, empathy, etc.) lives here as it helps all agents.
"""

from typing import Optional
from app.agent.v3.schema import (
    AgentState,
    Objective,
    ConversationExample,
    Guardrails,
    ChunkMatch,
)


# =============================================================================
# EXTRACTION PROMPT
# =============================================================================

EXTRACTION_SYSTEM_TEMPLATE = """
Analise a mensagem do cliente e extraia informações estruturadas.

## TRAITS (só extraia se EXPLICITAMENTE mencionado na mensagem)
{traits_section}

## INTENTS (o que está acontecendo AGORA nesta mensagem - pode ser MÚLTIPLOS)
{intents_section}

## OBJECTION_TYPE (só se intent indica objeção/resistência)
{objection_types_section}

## SEARCH_QUERY (query para busca semântica)
Gere uma query de busca que capture o que o cliente quer saber.
- Inclua: produto/serviço sendo discutido, dúvidas específicas, contexto relevante
- Resolva pronomes e referências implícitas usando o histórico
- Exemplo: "preço parcelamento violão Yamaha C40" (não apenas "quanto custa?")
- Se múltiplos tópicos, inclua todos na query

## REGRAS
1. Traits: só extraia se EXPLÍCITO. Não inferir de contexto geral.
2. Intents: LISTE TODOS os intents presentes. "quanto custa? e tem parcelamento?" = ["price_inquiry", "payment_inquiry"]
3. Use null para campos não detectados.
4. Objection_type só é relevante se algum intent indica resistência/objeção.
5. Search_query: SEMPRE gere uma query rica e contextualizada para busca.

## ESTADO ATUAL DO CLIENTE
{current_state_section}
"""


def build_extraction_prompt(
    traits_section: str,
    intents_section: str,
    objection_types_section: str,
    state: AgentState
) -> str:
    """Build the extraction system prompt."""

    # Format current state
    state_lines = []
    for trait_id, value in state.traits.items():
        if value:
            state_lines.append(f"- {trait_id}: {value}")
    current_state = "\n".join(state_lines) if state_lines else "Nenhum trait identificado ainda."

    return EXTRACTION_SYSTEM_TEMPLATE.format(
        traits_section=traits_section,
        intents_section=intents_section,
        objection_types_section=objection_types_section,
        current_state_section=current_state
    )


# =============================================================================
# GENERATION PROMPT
# =============================================================================

GENERATION_SYSTEM_TEMPLATE = """
Você é {agent_name}.

{agent_description}

## PRODUTO/SERVIÇO (USE ESTES DADOS - NÃO INVENTE)
{product_summary}

## SOBRE O CLIENTE
{traits_section}

## OBJETIVOS PENDENTES
{objectives_section}

## ESTADO DA CONVERSA
{state_section}

{entity_section}

{knowledge_section}

## EXEMPLOS DE BOAS RESPOSTAS
{examples_section}

## COMO RESPONDER
{generation_guidance}

## REGRAS
{guardrails_section}

## FORMATO
JSON: {{"messages": ["msg1", "msg2", ...]}}
- Máximo {max_messages} mensagens, prefira {preferred_messages}
- Cada mensagem = 1 pensamento completo
- Última mensagem = pergunta que avança a conversa
"""


# =============================================================================
# UNIVERSAL GENERATION GUIDANCE
# =============================================================================

GENERATION_GUIDANCE = """
### Espelhamento
- TAMANHO: Usuário breve → seja breve. Usuário elabora → elabore um pouco.
- EMOCIONAL: Se compartilhar algo pessoal, conecte-se ANTES de avançar.

### Contexto Implícito e Memória
- NÃO repita o que o usuário disse. Vocês já sabem do que estão falando.
- Use referências implícitas como conversa real.
- NÃO faça perguntas já respondidas no histórico
- NÃO ofereça novamente algo já oferecido/explicado (ex: parcelamento, link)
- SE o link já foi enviado e usuário pede novamente: apenas confirme e reenvie

### Perguntas Diretas
- Se perguntar algo direto (preço, como funciona), RESPONDA DIRETO primeiro.
- Depois avance a conversa.

### Fechamento e Envio de Link
- Se usuário pedir o link EXPLICITAMENTE ("me envia o link", "quero comprar", "me passa o link"):
  → ENVIE O LINK IMEDIATAMENTE sem fazer mais perguntas de qualificação
  → Use o checkout_url do produto
  → Não perifrase sobre "enviar" - envie de fato
- Para todos os outros casos: termine com pergunta que guia pro próximo passo
- Perguntas que avançam > perguntas abertas genéricas

### Formato
- Mensagens curtas (1-2 frases cada)
- Quebre em múltiplas mensagens para criar pausas naturais
- Última mensagem = pergunta
"""


# =============================================================================
# FORMATTING HELPERS
# =============================================================================

def format_traits_for_extraction(traits: list) -> str:
    """Format trait definitions for extraction prompt."""
    lines = []
    for trait in traits:
        if trait.type == "enum" and trait.options:
            options_str = ", ".join(trait.options)
            lines.append(f"- {trait.id}: {trait.extract_hint} (opções: {options_str})")
        else:
            lines.append(f"- {trait.id}: {trait.extract_hint}")
    return "\n".join(lines) if lines else "Nenhum trait definido."


def format_intents_for_extraction(intents: list) -> str:
    """Format intent definitions for extraction prompt."""
    lines = []
    for intent in intents:
        lines.append(f"- {intent.id}: {intent.description}")
    return "\n".join(lines) if lines else "Nenhum intent definido."


def format_objection_types_for_extraction(objection_types: list) -> str:
    """Format objection type definitions for extraction prompt."""
    lines = []
    for obj_type in objection_types:
        lines.append(f"- {obj_type.id}: {obj_type.description}")
    return "\n".join(lines) if lines else "Nenhum tipo de objeção definido."


def format_traits_for_generation(state: AgentState) -> str:
    """Format current traits for generation prompt."""
    lines = []
    for trait_id, value in state.traits.items():
        if value:
            lines.append(f"- {trait_id}: {value}")
    return "\n".join(lines) if lines else "Ainda não identificado."


def format_objectives(objectives: list[Objective], state: AgentState) -> str:
    """Format objectives as checklist."""
    lines = []
    for obj in objectives:
        # Check if fulfilled
        fulfilled = False
        if obj.is_trait_objective():
            trait_id = obj.get_target_id()
            fulfilled = bool(state.get_trait(trait_id))
        elif obj.is_event_objective():
            event_id = obj.get_target_id()
            fulfilled = state.get_event(event_id)

        marker = "[x]" if fulfilled else "[ ]"
        lines.append(f"{marker} {obj.hint}")

    return "\n".join(lines) if lines else "Nenhum objetivo definido."


def format_state_for_generation(state: AgentState, event_labels: dict[str, str]) -> str:
    """Format current state for generation prompt."""
    lines = []
    for event_id, is_set in state.events.items():
        label = event_labels.get(event_id, event_id)
        status = "sim" if is_set else "não"
        lines.append(f"- {label}: {status}")

    if state.objections_raised:
        lines.append(f"- Objeções tratadas: {', '.join(state.objections_raised)}")

    return "\n".join(lines) if lines else "Conversa iniciando."


def format_context_chunks(chunks: list[ChunkMatch]) -> tuple[str, str]:
    """
    Format RAG chunks for generation prompt.
    Returns (entity_section, knowledge_section) separately.
    """
    entity_parts = []
    knowledge_parts = []

    for chunk in chunks:
        content = f"**{chunk.title}**\n{chunk.content}" if chunk.title else chunk.content

        if chunk.is_entity:
            entity_parts.append(content)
        else:
            knowledge_parts.append(content)

    entity_section = "\n\n---\n\n".join(entity_parts) if entity_parts else ""
    knowledge_section = "\n\n---\n\n".join(knowledge_parts) if knowledge_parts else ""

    return entity_section, knowledge_section


def format_examples(examples: list[ConversationExample]) -> str:
    """Format few-shot examples for generation prompt."""
    if not examples:
        return "Nenhum exemplo selecionado."

    parts = []
    for example in examples:
        lines = [f"### {example.scenario}"]
        if example.context:
            lines.append(f"Contexto: {example.context}")

        for msg in example.messages:
            prefix = "Cliente:" if msg.role == "user" else "Você:"
            lines.append(f"{prefix} {msg.content}")

        if example.bad_example:
            lines.append(f"EVITE: {example.bad_example}")

        parts.append("\n".join(lines))

    return "\n\n".join(parts)


def format_guardrails(guardrails: Guardrails, state: AgentState) -> str:
    """Format guardrails for generation prompt."""
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

    # Evaluate conditional guardrails
    if guardrails.conditional:
        active_conditionals = []
        for condition, rule in guardrails.conditional.items():
            # Simple condition evaluation
            if _evaluate_condition(condition, state):
                active_conditionals.append(rule)

        if active_conditionals:
            lines.append("\nATENÇÃO (baseado no estado atual):")
            for rule in active_conditionals:
                lines.append(f"  - {rule}")

    return "\n".join(lines) if lines else "Sem guardrails definidos."


def _evaluate_condition(condition: str, state: AgentState) -> bool:
    """
    Evaluate a simple condition string against state.

    Supports:
    - "not event_id" -> event is False
    - "event_id" -> event is True
    - "event_id and not other_event" -> compound
    """
    condition = condition.strip()

    # Handle "not X"
    if condition.startswith("not "):
        event_id = condition[4:].strip()
        return not state.get_event(event_id)

    # Handle "X and Y"
    if " and " in condition:
        parts = condition.split(" and ")
        return all(_evaluate_condition(p.strip(), state) for p in parts)

    # Handle "X or Y"
    if " or " in condition:
        parts = condition.split(" or ")
        return any(_evaluate_condition(p.strip(), state) for p in parts)

    # Simple event check
    return state.get_event(condition)


def build_prompt_sections(state: AgentState, has_rag_context: bool) -> dict:
    """
    Determine which prompt sections to include based on turn/context.

    Progressive loading: only include what's relevant to THIS message.
    Saves ~500 tokens per turn after first few.
    """
    sections = {
        "rag_data": True,  # Always include RAG if available
        "guardrails": True,  # Always include guardrails
        "generation_guidance": state.turn_count <= 3,  # Only on early turns
        "objectives": state.turn_count <= 5,  # Show objectives early
        "examples": state.turn_count <= 4,  # Examples help early, less needed later
        "product_summary": state.turn_count <= 2,  # Product info mostly needed early
        "traits": True,  # Always show what we know about customer
        "state": True,  # Always show conversation state
    }
    return sections


def build_generation_prompt(
    agent_name: str,
    agent_description: str,
    product_summary: str,
    state: AgentState,
    objectives: list[Objective],
    event_labels: dict[str, str],
    chunks: list[ChunkMatch],
    examples: list[ConversationExample],
    guardrails: Guardrails,
    max_messages: int,
    preferred_messages: int
) -> str:
    """Build the full generation system prompt with progressive loading."""

    # Determine which sections to include
    sections = build_prompt_sections(state, bool(chunks))

    # Separate entity chunks from knowledge chunks
    entity_content, knowledge_content = format_context_chunks(chunks)

    # Format entity section (MUST use)
    if entity_content:
        entity_section = f"""## ⚠️ DADOS OFICIAIS - USE OBRIGATORIAMENTE ⚠️
{entity_content}

🚨 ATENÇÃO: As informações ACIMA são dados oficiais da empresa e DEVEM ser usados na sua resposta.
- Use EXATAMENTE as informações fornecidas (problema, solução, passos, contato)
- NÃO invente informações diferentes
- NÃO use seu conhecimento geral - use APENAS o que está escrito acima
- Se a pergunta do cliente se relaciona com esses dados, RESPONDA COM BASE NELES"""
    else:
        entity_section = ""

    # Format knowledge section (strong suggestion)
    if knowledge_content:
        knowledge_section = f"""## CONHECIMENTO RELEVANTE (USE COMO REFERÊNCIA)
{knowledge_content}"""
    else:
        knowledge_section = ""

    # Progressive loading: conditionally include sections
    product_section = product_summary if sections["product_summary"] else "(ver histórico)"
    objectives_section = format_objectives(objectives, state) if sections["objectives"] else ""
    examples_section = format_examples(examples) if sections["examples"] else ""
    guidance_section = GENERATION_GUIDANCE if sections["generation_guidance"] else "Responda de forma natural e direta."

    return GENERATION_SYSTEM_TEMPLATE.format(
        agent_name=agent_name,
        agent_description=agent_description,
        product_summary=product_section,
        traits_section=format_traits_for_generation(state),
        objectives_section=objectives_section if objectives_section else "Continuar conversa naturalmente.",
        state_section=format_state_for_generation(state, event_labels),
        entity_section=entity_section,
        knowledge_section=knowledge_section,
        examples_section=examples_section if examples_section else "Nenhum exemplo necessário neste ponto.",
        generation_guidance=guidance_section,
        guardrails_section=format_guardrails(guardrails, state),
        max_messages=max_messages,
        preferred_messages=preferred_messages
    )
