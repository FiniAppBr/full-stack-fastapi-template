"""
v3 Assemble Pipeline - Build context from RAG.

Input: config + state + message
Output: AssembleResult (chunks)

Search query is built from message + recent conversation history (2 turns).
No LLM call needed - just string concatenation.
"""

import json
from sqlmodel import Session, select

from app.core.db import engine
from app.llm.voyage import embed_text
from app.models import KnowledgeBase
from app.agent.core.schema import (
    AgentState,
    AssembleResult,
    ChunkMatch,
)
from app.agent.core.config import BaseAgentConfig


def _semantic_search(
    query: str,
    agent_ids: list[str],
    query_embedding: list[float],
    limit: int = 5,
    threshold: float = 0.3,
    categories: list[str] | None = None,
    exclude_categories: list[str] | None = None,
) -> list[ChunkMatch]:
    """
    Semantic search with category filtering.

    Args:
        query_embedding: Pre-computed embedding (to avoid re-embedding for each category)
        categories: Only include these categories (None = all)
        exclude_categories: Exclude these categories
    """
    if not query_embedding or not agent_ids:
        return []

    with Session(engine) as session:
        distance = KnowledgeBase.embedding.cosine_distance(query_embedding)
        similarity = (1 - distance).label("similarity")

        stmt = (
            select(KnowledgeBase, similarity)
            .where(KnowledgeBase.agent_id.in_(agent_ids))
            .where(KnowledgeBase.is_active == True)
            .where(KnowledgeBase.embedding.isnot(None))
            .where((1 - distance) >= threshold)
        )

        if categories:
            stmt = stmt.where(KnowledgeBase.category.in_(categories))
        if exclude_categories:
            stmt = stmt.where(KnowledgeBase.category.not_in(exclude_categories))

        stmt = stmt.order_by(similarity.desc()).limit(limit)
        rows = session.exec(stmt).all()

        matches = []
        for row, score in rows:
            is_entity = row.agent_id.startswith("entity:") if row.agent_id else False
            metadata = {}
            if row.metadata_json:
                try:
                    metadata = json.loads(row.metadata_json)
                except json.JSONDecodeError:
                    pass
            if row.category:
                metadata["category"] = row.category

            matches.append(ChunkMatch(
                id=row.id,
                content=row.content,
                title=row.title,
                labels=row.labels or [],
                score=float(score),
                token_count=row.token_count or 0,
                is_entity=is_entity,
                metadata=metadata
            ))

        return matches


# Category limits for RAG retrieval
CATEGORY_LIMITS = {
    "documents": 3,
    "products": 2,
    "policies": 1,
    "faq": 2,
    "people": 1,
    "objections": 1,
}
EXCLUDED_CATEGORIES = ["guardrails"]  # Never retrieve via RAG


def _category_based_search(
    query: str,
    agent_ids: list[str],
    threshold: float = 0.3,
    category_limits: dict[str, int] | None = None,
) -> list[ChunkMatch]:
    """RAG search with per-category limits. Guardrails excluded."""
    if not query or not agent_ids:
        return []

    # Use provided limits or fallback to defaults
    limits = category_limits or CATEGORY_LIMITS

    # Generate embedding once
    try:
        embeddings, _ = embed_text([query], input_type="query")
        query_embedding = embeddings[0]
    except Exception as e:
        print(f"    Embedding error: {e}")
        return []

    all_chunks = []
    for category, limit in limits.items():
        chunks = _semantic_search(
            query=query,
            agent_ids=agent_ids,
            query_embedding=query_embedding,
            limit=limit,
            threshold=threshold,
            categories=[category],
        )
        if chunks:
            print(f"    {category}: {len(chunks)} chunks")
        all_chunks.extend(chunks)

    # Sort all by score descending
    all_chunks.sort(key=lambda c: c.score, reverse=True)
    return all_chunks


def get_tool_context(chunks: list[ChunkMatch]) -> str:
    """
    Derive tool instructions from entity capabilities in chunk metadata.

    Returns instructions like:
    - Para 'Violão Yamaha C40': use check_stock (não invente quantidades)
    - Para 'Curso Violão': use check_availability ou book_appointment
    """
    instructions = []

    for chunk in chunks:
        if not chunk.is_entity:
            continue

        caps = chunk.metadata.get("capabilities", [])
        if not caps:
            continue

        entity_name = chunk.title or "item"

        if "bookable" in caps or "schedulable" in caps:
            instructions.append(
                f"Para '{entity_name}': use check_availability ou book_appointment"
            )
        if "stockable" in caps:
            instructions.append(
                f"Para '{entity_name}': use check_stock (não invente quantidades)"
            )

    return "\n".join(instructions)


def assemble(
    config: BaseAgentConfig,
    state: AgentState,
    message: str
) -> AssembleResult:
    """
    Assemble RAG context for generation.

    Search query = message + last 2 turns of conversation.
    No LLM call - just string concatenation.

    Args:
        config: Agent configuration
        state: Current conversation state
        message: User's message

    Returns:
        AssembleResult with chunks
    """
    print("-> Assemble (v3)")

    # 0. Skip RAG for simple greetings (token optimization)
    greeting_patterns = {"oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "oi!", "olá!", "hey", "hi", "hello"}
    msg_lower = message.lower().strip().rstrip("!.,?")
    if msg_lower in greeting_patterns or (len(msg_lower) < 15 and msg_lower.startswith(("oi ", "olá "))):
        print("  Greeting detected - skipping RAG")
        return AssembleResult(chunks=[], total_tokens=0, tool_context="")

    # 1. Build search query from message + history
    search_query = state.build_search_query(message, config.rag.context_turns)
    print(f"  Search query ({len(search_query)} chars): {search_query[:80]}...")

    # 2. Get agent IDs to search
    rag_agent_ids = [config.get_rag_agent_id()] + config.get_entity_agent_ids()
    print(f"  RAG agent_ids: {rag_agent_ids}")

    # 3. Category-based semantic search (guardrails excluded, per-category limits)
    chunks = _category_based_search(
        query=search_query,
        agent_ids=rag_agent_ids,
        threshold=config.rag.similarity_threshold,
        category_limits=config.rag.category_limits,
    )

    # 4. Build result
    total_tokens = sum(c.token_count for c in chunks)

    # 5. Derive tool instructions from entity capabilities
    tool_context = get_tool_context(chunks)

    print(f"  Retrieved: {len(chunks)} chunks, {total_tokens} tokens")
    for chunk in chunks:
        marker = "[ENTITY]" if chunk.is_entity else "[KNOWLEDGE]"
        caps = chunk.metadata.get("capabilities", [])
        caps_str = f" caps={caps}" if caps else ""
        print(f"    - [{chunk.score:.3f}] {marker} {chunk.title[:40] if chunk.title else 'No title'}{caps_str}")

    if tool_context:
        print(f"  Tool context: {tool_context[:80]}...")

    return AssembleResult(chunks=chunks, total_tokens=total_tokens, tool_context=tool_context)


# =============================================================================
# ASSEMBLE NODE (for LangGraph pipeline)
# =============================================================================

def assemble_node(state: "GraphState") -> dict:
    """
    Build RAG context from message + history.

    This is the LangGraph node wrapper around the assemble() function.
    It also builds the system prompt and react_messages for the agent.

    Args:
        state: Current graph state

    Returns:
        Updated state with assembled, react_messages, system_prompt
    """
    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

    from app.agent.core.prompts import build_generation_prompt
    from app.agent.tools.registry import get_available_tools_summary

    print("-> [Node] Assemble")

    config = state["config"]
    agent_state = state["agent_state"]
    message = state["message"]

    # Add user message to history
    agent_state.add_to_history("user", message)
    agent_state.turn_count += 1

    # Assemble RAG context
    assembled = assemble(config, agent_state, message)

    # Build system prompt
    system_prompt = build_generation_prompt(
        config=config,
        state=agent_state,
        chunks=assembled.chunks,
    )

    # Add collected data context if any
    if agent_state.collected_data:
        # Filter out internal keys (start with _)
        visible_data = {k: v for k, v in agent_state.collected_data.items() if not k.startswith("_")}
        if visible_data:
            system_prompt += f"\n\n## DADOS JÁ COLETADOS\nVocê já sabe sobre o cliente:\n"
            for key, value in visible_data.items():
                system_prompt += f"- {key}: {value}\n"
            system_prompt += "\nNÃO pergunte novamente informações que você já tem."

        # Add normalized date context for tools (from preprocessing)
        normalized_date = agent_state.collected_data.get("_normalized_date")
        normalized_time = agent_state.collected_data.get("_normalized_time")
        if normalized_date or normalized_time:
            system_prompt += "\n\n## CONTEXTO DE DATA/HORA"
            if normalized_date:
                system_prompt += f"\nData mencionada pelo cliente: {normalized_date} (formato YYYY-MM-DD)"
            if normalized_time:
                system_prompt += f"\nHorário mencionado: {normalized_time}"
            system_prompt += "\nUse estes valores ao chamar ferramentas de agendamento."

    # Add tool instructions if tools enabled
    if config.enabled_tool_categories:
        tools_summary = get_available_tools_summary(config.enabled_tool_categories)
        system_prompt += f"\n\n## Ferramentas Disponíveis\n{tools_summary}"

        # Add explicit tool usage instructions (compressed)
        tool_instructions = """
## USO DE FERRAMENTAS (OBRIGATÓRIO)
• Horários/datas → check_availability ANTES de responder
• Agendar/reservar → book_appointment ANTES de confirmar
• Cancelar → cancel_appointment
• Remarcar → reschedule_appointment
• Criar tarefa → create_task
⚠️ PROIBIDO dizer "agendado/confirmado" SEM chamar book_appointment primeiro."""
        system_prompt += tool_instructions

        # BOOKING FORCE: If previous turn showed availability and user provided time
        full_history = agent_state.history
        if agent_state.turn_count >= 2 and len(full_history) >= 2:
            prev_messages = [m for m in full_history if m["role"] == "assistant"]
            if prev_messages:
                last_assistant = prev_messages[-1]["content"].lower()
                availability_keywords = [
                    "disponível", "disponivel", "horário", "horario", "10:00", "11:00",
                    "segunda", "terça", "quarta", "quinta", "sexta", "sábado", "sabado",
                    "temos horários", "temos horario", "horários disponíveis"
                ]
                availability_shown = any(kw in last_assistant for kw in availability_keywords)
                if availability_shown:
                    msg_lower = message.lower()
                    time_keywords = [
                        "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h",
                        "10:00", "11:00", "12:00", "pode ser", "esse", "primeiro", "último"
                    ]
                    has_time = any(kw in msg_lower for kw in time_keywords)
                    if has_time:
                        system_prompt += """

## 🚨 AÇÃO OBRIGATÓRIA NESTE TURNO
O cliente escolheu um horário. VOCÊ DEVE chamar book_appointment AGORA.
Parâmetros necessários:
- booking_date: use a data normalizada acima
- booking_time: o horário que o cliente escolheu
- service_name: o serviço solicitado
- customer_name: nome do cliente (se fornecido)
- customer_phone: telefone do cliente (se fornecido)
- professional_name: o profissional disponível

⛔ NÃO responda sem chamar book_appointment primeiro."""

        if assembled.tool_context:
            system_prompt += f"\n\n## Instruções de Ferramentas\n{assembled.tool_context}"

    print(f"  System prompt: {len(system_prompt)} chars (~{len(system_prompt)//4} tokens)")

    # Build react_messages with conversation history
    react_messages = [SystemMessage(content=system_prompt)]

    # Add conversation history (excluding current message which was just added)
    history_turns = config.generation.history_turns
    history = agent_state.history[:-1] if agent_state.history else []
    recent_history = history[-(history_turns * 2):] if history else []

    for msg in recent_history:
        if msg["role"] == "user":
            react_messages.append(HumanMessage(content=msg["content"]))
        else:
            react_messages.append(AIMessage(content=msg["content"]))

    # Add current user message
    react_messages.append(HumanMessage(content=message))

    print(f"  History: {len(recent_history)} messages from {len(history)} total")

    return {
        "assembled": assembled,
        "react_messages": react_messages,
        "agent_state": agent_state,
        "system_prompt": system_prompt
    }


# Type hint import (avoid circular import)
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.agent.core.state import GraphState
