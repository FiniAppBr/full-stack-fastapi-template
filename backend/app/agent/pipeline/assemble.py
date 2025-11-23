"""
Assemble Pipeline Stage - Build context from rules, RAG, and trait filtering.

Input: AgentConfig + RuntimeState + last_message
Output: AssembleResult (list of ChunkMatches from database)

Steps:
1. Evaluate rules in priority order
2. For each firing rule: inject/search/block by labels
3. Filter chunks by trait_filter (match current traits)
4. Filter by gate requirements (hard/soft enforcement)
5. Dedupe chunks
6. Trim to token budget (prioritize by rule priority)
"""

from typing import Optional
from sqlmodel import Session, text

from app.core.db import engine
from app.llm.voyage import embed_text
from app.agent.schema import (
    RuntimeState,
    Rule,
    Chunk,
    ChunkMatch,
    Gate,
)

# Default agent ID for Nina
NINA_AGENT_ID = "nina"


class AssembleResult:
    """Result of context assembly."""
    def __init__(self):
        self.chunks: list[ChunkMatch] = []
        self.blocked_labels: set[str] = set()
        self.rules_fired: list[str] = []
        self.token_count: int = 0


def _inject_by_labels(
    labels: list[str],
    agent_id: str,
    traits: dict,
    blocked_labels: set[str],
    limit: int = 10
) -> list[ChunkMatch]:
    """
    Inject chunks from database that have ANY of the specified labels.
    Uses PostgreSQL array overlap operator (&&).
    """
    if not labels:
        return []

    with Session(engine) as session:
        sql = text("""
            SELECT id, content, title, labels, trait_filter, token_count
            FROM knowledge_base
            WHERE agent_id = :agent_id
              AND is_active = true
              AND labels && :labels
            ORDER BY token_count ASC
            LIMIT :limit
        """)

        # Query more rows than needed (limit is applied after trait filtering)
        query_limit = limit * 5  # Get 5x to account for trait filtering
        result = session.execute(sql, {
            "agent_id": agent_id,
            "labels": labels,
            "limit": query_limit
        })

        rows = list(result)

        matches = []
        for row in rows:
            chunk = Chunk(
                id=row.id,
                labels=row.labels or [],
                title=row.title,
                content=row.content,
                trait_filter=row.trait_filter or {},
                token_count=row.token_count or 0
            )

            # Filter by traits
            if not chunk.matches_traits(traits):
                continue

            # Filter by blocked labels
            if any(label in blocked_labels for label in chunk.labels):
                continue

            matches.append(ChunkMatch(chunk=chunk, score=1.0))

            # Enforce limit after filtering
            if len(matches) >= limit:
                break

        return matches[:limit]  # Extra safety


def _search_by_query(
    query: str,
    labels: list[str],
    agent_id: str,
    traits: dict,
    blocked_labels: set[str],
    limit: int = 3,
    similarity_threshold: float = 0.4
) -> list[ChunkMatch]:
    """
    Semantic search for chunks matching query, filtered by labels.
    Uses pgvector cosine similarity.
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
        # Convert embedding to PostgreSQL vector literal format
        embedding_literal = "[" + ",".join(str(x) for x in query_embedding) + "]"

        if labels:
            sql = text("""
                SELECT
                    id, content, title, labels, trait_filter, token_count,
                    1 - (embedding <=> CAST(:query_embedding AS vector)) as similarity
                FROM knowledge_base
                WHERE agent_id = :agent_id
                  AND is_active = true
                  AND labels && :labels
                  AND embedding IS NOT NULL
                  AND 1 - (embedding <=> CAST(:query_embedding AS vector)) >= :threshold
                ORDER BY similarity DESC
                LIMIT :limit
            """)
            params = {
                "agent_id": agent_id,
                "labels": labels,
                "query_embedding": embedding_literal,
                "threshold": similarity_threshold,
                "limit": limit
            }
        else:
            sql = text("""
                SELECT
                    id, content, title, labels, trait_filter, token_count,
                    1 - (embedding <=> CAST(:query_embedding AS vector)) as similarity
                FROM knowledge_base
                WHERE agent_id = :agent_id
                  AND is_active = true
                  AND embedding IS NOT NULL
                  AND 1 - (embedding <=> CAST(:query_embedding AS vector)) >= :threshold
                ORDER BY similarity DESC
                LIMIT :limit
            """)
            params = {
                "agent_id": agent_id,
                "query_embedding": embedding_literal,
                "threshold": similarity_threshold,
                "limit": limit
            }

        result = session.execute(sql, params)

        matches = []
        for row in result:
            chunk = Chunk(
                id=row.id,
                labels=row.labels or [],
                title=row.title,
                content=row.content,
                trait_filter=row.trait_filter or {},
                token_count=row.token_count or 0
            )

            # Filter by traits
            if not chunk.matches_traits(traits):
                continue

            # Filter by blocked labels
            if any(label in blocked_labels for label in chunk.labels):
                continue

            matches.append(ChunkMatch(chunk=chunk, score=float(row.similarity)))

        return matches


def _resolve_query_reference(query_ref: str, state: RuntimeState, last_message: str) -> str:
    """Resolve query reference like 'signal.objection_type' or 'last_message'."""
    if query_ref == "last_message":
        return last_message

    if query_ref.startswith("signal."):
        signal_id = query_ref.split(".")[1]
        return state.signals.get(signal_id) or last_message

    if query_ref.startswith("trait."):
        trait_id = query_ref.split(".")[1]
        return state.traits.get(trait_id) or last_message

    return query_ref


def assemble(
    config,  # AgentConfig
    state: RuntimeState,
    last_message: str,
    token_budget: int = 2000,
    agent_id: str = NINA_AGENT_ID
) -> AssembleResult:
    """
    Assemble context based on current state and rules.

    Args:
        config: AgentConfig with rules and gates
        state: Current runtime state
        last_message: Customer's last message (for search queries)
        token_budget: Maximum tokens for assembled context
        agent_id: Agent ID for database queries

    Returns:
        AssembleResult with selected chunks
    """
    print("-> Assemble")

    result = AssembleResult()

    # Get blocked labels from gates first
    for gate in config.gates:
        if gate.enforcement == "hard" and not state.gates.get(gate.id, False):
            result.blocked_labels.update(gate.required_for)

    if result.blocked_labels:
        print(f"  Blocked by gates: {result.blocked_labels}")

    # Build evaluation state for rules
    eval_state = {
        "gates": state.gates,
        "traits": state.traits,
        "signals": state.signals,
        "mode": state.mode
    }

    # Sort rules by priority (lower = higher importance)
    sorted_rules = sorted(config.rules, key=lambda r: r.priority)

    # Track selected chunk IDs to avoid duplicates
    selected_ids: set[int] = set()

    for rule in sorted_rules:
        # Check token budget
        if result.token_count >= token_budget:
            print(f"  Budget reached ({result.token_count}/{token_budget})")
            break

        if not rule.evaluate(eval_state):
            continue

        result.rules_fired.append(rule.id)
        action = rule.assembly_action

        if not action:
            continue

        action_type = action.type
        action_labels = action.labels or []
        action_limit = action.limit or 5

        if action_type == "block":
            result.blocked_labels.update(action_labels)
            print(f"  Rule '{rule.id}' blocks: {action_labels}")

        elif action_type == "inject":
            matches = _inject_by_labels(
                labels=action_labels,
                agent_id=agent_id,
                traits=state.traits,
                blocked_labels=result.blocked_labels,
                limit=action_limit
            )

            added = 0
            for match in matches:
                if match.chunk.id in selected_ids:
                    continue
                if result.token_count + match.chunk.token_count > token_budget:
                    continue

                selected_ids.add(match.chunk.id)
                match.source_rule = rule.id
                result.chunks.append(match)
                result.token_count += match.chunk.token_count
                added += 1

            print(f"  Rule '{rule.id}' inject {action_labels}: +{added} chunks")

        elif action_type == "search":
            query_ref = action.query or "last_message"
            query = _resolve_query_reference(query_ref, state, last_message)

            matches = _search_by_query(
                query=query,
                labels=action_labels,
                agent_id=agent_id,
                traits=state.traits,
                blocked_labels=result.blocked_labels,
                limit=action_limit
            )

            added = 0
            for match in matches:
                if match.chunk.id in selected_ids:
                    continue
                if result.token_count + match.chunk.token_count > token_budget:
                    continue

                selected_ids.add(match.chunk.id)
                match.source_rule = rule.id
                result.chunks.append(match)
                result.token_count += match.chunk.token_count
                added += 1

            print(f"  Rule '{rule.id}' search '{query[:30]}...': +{added} chunks")

    # Sort by score (higher first)
    result.chunks.sort(key=lambda cm: cm.score, reverse=True)

    print(f"  Total: {len(result.chunks)} chunks, {result.token_count} tokens")

    return result


def format_context(result: AssembleResult) -> str:
    """Format assembled chunks into a context string for the LLM."""
    if not result.chunks:
        return ""

    parts = []
    for match in result.chunks:
        chunk = match.chunk
        if chunk.title:
            parts.append(f"**{chunk.title}**\n{chunk.content}")
        else:
            parts.append(chunk.content)

    return "\n\n---\n\n".join(parts)
