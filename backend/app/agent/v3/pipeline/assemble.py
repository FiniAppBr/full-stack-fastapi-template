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
    agent_id: str,
    limit: int = 5,
    threshold: float = 0.4,
    boost_labels: list[str] = None,
    boost_weight: float = 0.1
) -> list[ChunkMatch]:
    """
    Semantic search with optional label boosting.

    Args:
        query: Search query
        agent_id: Agent ID for filtering
        limit: Max results
        threshold: Minimum similarity
        boost_labels: Labels to boost (not filter)
        boost_weight: How much to boost matching labels

    Returns:
        List of ChunkMatch
    """
    if not query:
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

        stmt = (
            select(KnowledgeBase, similarity)
            .where(KnowledgeBase.agent_id == agent_id)
            .where(KnowledgeBase.is_active == True)
            .where(KnowledgeBase.embedding.isnot(None))
            .where((1 - distance) >= threshold)
            .order_by(similarity.desc())
            .limit(limit * 3)  # Fetch extra for boosting/filtering
        )

        rows = session.exec(stmt).all()

        matches = []
        for row, score in rows:
            chunk = ChunkMatch(
                id=row.id,
                content=row.content,
                title=row.title,
                labels=row.labels or [],
                score=float(score),
                token_count=row.token_count or 0
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


def assemble(
    config: BaseAgentConfig,
    state: AgentState,
    extraction: ExtractionResult,
    message: str
) -> AssembleResult:
    """
    Assemble context for generation.

    Args:
        config: Agent configuration
        state: Current conversation state
        extraction: Extraction result (for intent-based boosting)
        message: User's message (for semantic search)

    Returns:
        AssembleResult with chunks and examples
    """
    print("-> Assemble (v3)")

    result = AssembleResult()
    selected_ids: set[int] = set()

    # 1. Base semantic search on message
    base_results = _semantic_search(
        query=message,
        agent_id=config.agent_id,
        limit=config.assembly.base_search_limit,
        threshold=config.assembly.similarity_threshold
    )

    for chunk in base_results:
        if chunk.id not in selected_ids:
            selected_ids.add(chunk.id)
            result.chunks.append(chunk)
            result.total_tokens += chunk.token_count

    print(f"  Base search: {len(base_results)} chunks")

    # 2. Intent-based boosting
    boost_labels = config.get_rag_boost_labels(extraction.intent)

    if boost_labels:
        boost_results = _semantic_search(
            query=message,
            agent_id=config.agent_id,
            limit=config.assembly.boost_search_limit,
            threshold=config.assembly.similarity_threshold - 0.1,  # Slightly lower threshold
            boost_labels=boost_labels,
            boost_weight=0.15
        )

        added = 0
        for chunk in boost_results:
            if chunk.id not in selected_ids:
                if result.total_tokens + chunk.token_count <= config.assembly.token_budget:
                    selected_ids.add(chunk.id)
                    result.chunks.append(chunk)
                    result.total_tokens += chunk.token_count
                    added += 1

        print(f"  Intent boost ({extraction.intent}): +{added} chunks")

    # 3. Objection-specific search
    if extraction.objection_type:
        objection_label = f"objecao:{extraction.objection_type}"
        objection_results = _get_chunks_by_label(
            label=objection_label,
            agent_id=config.agent_id,
            limit=2
        )

        added = 0
        for chunk in objection_results:
            if chunk.id not in selected_ids:
                if result.total_tokens + chunk.token_count <= config.assembly.token_budget:
                    selected_ids.add(chunk.id)
                    result.chunks.append(chunk)
                    result.total_tokens += chunk.token_count
                    added += 1

        print(f"  Objection ({extraction.objection_type}): +{added} chunks")

    # 4. Trait-based personalization
    for trait in config.traits:
        trait_value = state.get_trait(trait.id)
        if trait_value:
            trait_label = f"{trait.id}:{trait_value}"
            trait_results = _get_chunks_by_label(
                label=trait_label,
                agent_id=config.agent_id,
                limit=1
            )

            for chunk in trait_results:
                if chunk.id not in selected_ids:
                    if result.total_tokens + chunk.token_count <= config.assembly.token_budget:
                        selected_ids.add(chunk.id)
                        result.chunks.append(chunk)
                        result.total_tokens += chunk.token_count

    # 5. Select few-shot examples
    result.examples = config.select_examples(extraction.intent, state)
    print(f"  Examples selected: {len(result.examples)}")

    # 6. Sort by score (higher first)
    result.chunks.sort(key=lambda c: c.score, reverse=True)

    # 7. Trim to budget (in case we went over)
    trimmed_chunks = []
    current_tokens = 0
    for chunk in result.chunks:
        if current_tokens + chunk.token_count <= config.assembly.token_budget:
            trimmed_chunks.append(chunk)
            current_tokens += chunk.token_count
    result.chunks = trimmed_chunks
    result.total_tokens = current_tokens

    print(f"  Total: {len(result.chunks)} chunks, {result.total_tokens} tokens")

    return result
