"""
v3 Assemble Pipeline - Build context from RAG and select examples.

Input: config + state + extraction + message
Output: AssembleResult (chunks, examples, total_tokens)

Key principle: BOOST labels, don't FILTER. Let relevance scoring do its job.
"""

from typing import Optional
from sqlmodel import Session, select
from sqlalchemy import exists, and_

from app.core.db import engine
from app.llm.voyage import embed_text
from app.models import KnowledgeBase, ChunkLabel, Label
from app.agent.v3.schema import (
    AgentState,
    ExtractionResult,
    AssembleResult,
    ChunkMatch,
    ConversationExample,
)
from app.agent.v3.config import BaseAgentConfig


def _semantic_search(
    query: str,
    agent_ids: list[str],
    limit: int = 5,
    threshold: float = 0.4,
    boost_labels: list[str] = None,
    boost_weight: float = 0.1
) -> list[ChunkMatch]:
    """
    Semantic search with optional label boosting.

    Args:
        query: Search query
        agent_ids: List of agent IDs to search (e.g., ["nina", "entity:1", "entity:5"])
        limit: Max results
        threshold: Minimum similarity
        boost_labels: Labels to boost (not filter)
        boost_weight: How much to boost matching labels

    Returns:
        List of ChunkMatch
    """
    if not query or not agent_ids:
        return []

    # Generate query embedding
    try:
        embeddings, _ = embed_text([query], input_type="query")
        query_embedding = embeddings[0]
    except Exception as e:
        print(f"    Embedding error: {e}")
        return []

    with Session(engine) as session:
        # Build base query with cosine distance
        distance = KnowledgeBase.embedding.cosine_distance(query_embedding)
        similarity = (1 - distance).label("similarity")

        # Search across all agent_ids (entity-based: "entity:1", "entity:5")
        stmt = (
            select(KnowledgeBase, similarity)
            .where(KnowledgeBase.agent_id.in_(agent_ids))
            .where(KnowledgeBase.is_active == True)
            .where(KnowledgeBase.embedding.isnot(None))
            .where((1 - distance) >= threshold)
            .order_by(similarity.desc())
            .limit(limit * 3)  # Fetch extra for boosting/filtering
        )

        rows = session.exec(stmt).all()

        matches = []
        for row, score in rows:
            # Check if this is an entity chunk (agent_id starts with "entity:")
            is_entity = row.agent_id.startswith("entity:") if row.agent_id else False

            chunk = ChunkMatch(
                id=row.id,
                content=row.content,
                title=row.title,
                labels=row.labels or [],
                score=float(score),
                token_count=row.token_count or 0,
                is_entity=is_entity
            )

            # Apply label boosting
            if boost_labels:
                for label in chunk.labels:
                    if label in boost_labels:
                        chunk.score += boost_weight
                        break

            matches.append(chunk)

        # Re-sort by boosted score and limit
        matches.sort(key=lambda m: m.score, reverse=True)
        return matches[:limit]


def _get_chunks_by_label(
    label: str,
    agent_id: str,
    limit: int = 1
) -> list[ChunkMatch]:
    """Get chunks with a specific label."""
    with Session(engine) as session:
        label_subq = (
            select(ChunkLabel.chunk_id)
            .join(Label, Label.id == ChunkLabel.label_id)
            .where(Label.name == label)
        )

        stmt = (
            select(KnowledgeBase)
            .where(KnowledgeBase.agent_id == agent_id)
            .where(KnowledgeBase.is_active == True)
            .where(KnowledgeBase.id.in_(label_subq))
            .order_by(KnowledgeBase.token_count.asc())
            .limit(limit)
        )

        rows = session.exec(stmt).all()

        return [
            ChunkMatch(
                id=row.id,
                content=row.content,
                title=row.title,
                labels=row.labels or [],
                score=1.0,
                token_count=row.token_count or 0
            )
            for row in rows
        ]


def _get_search_query(
    message: str,
    extraction: ExtractionResult
) -> str:
    """
    Get search query for RAG - prefer LLM-generated, fallback to message.

    The LLM has full conversation context and generates optimal search queries
    that handle pronouns, implicit references, and multiple topics.
    """
    # Use LLM-generated search_query if available
    if extraction.search_query and extraction.search_query.strip():
        print(f"  Using LLM search_query: {extraction.search_query[:60]}...")
        return extraction.search_query

    # Fallback to raw message
    print(f"  Fallback to message: {message[:60]}...")
    return message


def assemble(
    config: BaseAgentConfig,
    state: AgentState,
    extraction: ExtractionResult,
    message: str
) -> AssembleResult:
    """
    Assemble context for generation.

    Pure semantic retrieval - no label boosting.
    Query is enhanced with conversation context for better relevance.

    Args:
        config: Agent configuration
        state: Current conversation state
        extraction: Extraction result (for query enhancement)
        message: User's message

    Returns:
        AssembleResult with chunks and examples
    """
    print("-> Assemble (v3)")

    result = AssembleResult()
    selected_ids: set[int] = set()

    # 1. Get search query (LLM-generated or fallback to message)
    search_query = _get_search_query(message, extraction)

    # 2. Pure semantic search (no boosting)
    # Search both legacy chunks (by agent_slug) and entity-based chunks (by linked_entities)
    rag_agent_ids = [config.get_rag_agent_id()] + config.get_entity_agent_ids()
    print(f"  RAG agent_ids: {rag_agent_ids}")

    search_results = _semantic_search(
        query=search_query,  # Use LLM-generated search query
        agent_ids=rag_agent_ids,
        limit=config.assembly.base_search_limit,
        threshold=config.assembly.similarity_threshold,
        boost_labels=None,  # No boosting
        boost_weight=0.0
    )

    for chunk in search_results:
        if chunk.id not in selected_ids:
            selected_ids.add(chunk.id)
            result.chunks.append(chunk)
            result.total_tokens += chunk.token_count

    print(f"  Retrieved: {len(search_results)} chunks")

    # 3. Trait-based personalization (metadata filtering only)
    # Only if trait-specific content exists (e.g., igreja vs hobby)
    for trait in config.traits:
        trait_value = state.get_trait(trait.id)
        if trait_value and trait.id in ["use_case"]:  # Only for specific traits
            trait_label = f"{trait.id}:{trait_value}"
            trait_results = _get_chunks_by_label(
                label=trait_label,
                agent_id=config.get_rag_agent_id(),  # Legacy chunks only for trait matching
                limit=1
            )

            for chunk in trait_results:
                if chunk.id not in selected_ids:
                    if result.total_tokens + chunk.token_count <= config.assembly.token_budget:
                        selected_ids.add(chunk.id)
                        result.chunks.append(chunk)
                        result.total_tokens += chunk.token_count
                        print(f"  Added trait-specific chunk: {trait_label}")

    # 4. Select few-shot examples
    result.examples = config.select_examples(extraction.intent, state)
    print(f"  Examples selected: {len(result.examples)}")

    # 5. Sort by score (higher first)
    result.chunks.sort(key=lambda c: c.score, reverse=True)

    # 6. Trim to budget
    trimmed_chunks = []
    current_tokens = 0
    for chunk in result.chunks:
        if current_tokens + chunk.token_count <= config.assembly.token_budget:
            trimmed_chunks.append(chunk)
            current_tokens += chunk.token_count
    result.chunks = trimmed_chunks
    result.total_tokens = current_tokens

    print(f"  Final: {len(result.chunks)} chunks, {result.total_tokens} tokens")
    for chunk in result.chunks:
        entity_marker = "[ENTITY]" if chunk.is_entity else "[KNOWLEDGE]"
        print(f"    - [{chunk.score:.3f}] {entity_marker} {chunk.title[:40] if chunk.title else 'No title'}")

    return result
