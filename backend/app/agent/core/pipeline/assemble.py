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
