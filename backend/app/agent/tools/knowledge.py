"""
Knowledge Tool - RAG search over uploaded documents.

Uses pgvector for semantic similarity search over KnowledgeBase.
"""
from typing import Optional
from langchain_core.tools import tool
from sqlmodel import Session, select, text

from app.core.db import engine
from app.models.knowledge import KnowledgeBase
from app.llm.voyage import embed_text


def search_knowledge_base(
    query: str,
    agent_id: int,
    limit: int = 5,
    similarity_threshold: float = 0.6,
    tags: Optional[list[str]] = None
) -> list[dict]:
    """
    Search knowledge base using vector similarity.

    Searches chunks that belong to entities linked to this agent.

    Args:
        query: Search query
        agent_id: Agent ID - used to find linked entities
        limit: Max results
        similarity_threshold: Min similarity score (0-1)
        tags: Optional category tags to filter by

    Returns:
        List of matching chunks with content and score
    """
    from app.models.neo_agent import NeoAgent

    # Generate query embedding
    embeddings, _ = embed_text([query], input_type="query")
    query_embedding = embeddings[0]

    # Build pgvector query
    # Using cosine distance: 1 - distance = similarity
    with Session(engine) as session:
        # Get agent's linked entities
        agent = session.get(NeoAgent, agent_id)
        if not agent:
            return []

        linked_entity_ids = [int(x) for x in (agent.linked_entities or [])]
        if not linked_entity_ids:
            return []

        # Add category filter if tags provided
        if tags:
            sql = text("""
                SELECT
                    id,
                    content,
                    category,
                    title,
                    1 - (embedding <=> :query_embedding::vector) as similarity
                FROM knowledge_base
                WHERE entity_id = ANY(:entity_ids)
                  AND is_active = true
                  AND category = ANY(:tags)
                  AND 1 - (embedding <=> :query_embedding::vector) >= :threshold
                ORDER BY similarity DESC
                LIMIT :limit
            """)
            result = session.execute(
                sql,
                {
                    "query_embedding": str(query_embedding),
                    "entity_ids": linked_entity_ids,
                    "tags": tags,
                    "threshold": similarity_threshold,
                    "limit": limit
                }
            )
        else:
            sql = text("""
                SELECT
                    id,
                    content,
                    category,
                    title,
                    1 - (embedding <=> :query_embedding::vector) as similarity
                FROM knowledge_base
                WHERE entity_id = ANY(:entity_ids)
                  AND is_active = true
                  AND 1 - (embedding <=> :query_embedding::vector) >= :threshold
                ORDER BY similarity DESC
                LIMIT :limit
            """)
            result = session.execute(
                sql,
                {
                    "query_embedding": str(query_embedding),
                    "entity_ids": linked_entity_ids,
                    "threshold": similarity_threshold,
                    "limit": limit
                }
            )

        chunks = []
        for row in result:
            chunks.append({
                "id": row.id,
                "content": row.content,
                "category": row.category,
                "title": row.title,
                "similarity": float(row.similarity)
            })

        return chunks


def build_knowledge_context(chunks: list[dict], max_tokens: int = 2000) -> str:
    """
    Build formatted context from knowledge chunks.

    Args:
        chunks: List of knowledge chunks
        max_tokens: Approximate max tokens (4 chars per token)

    Returns:
        Formatted context string
    """
    if not chunks:
        return ""

    context_parts = []
    total_chars = 0
    max_chars = max_tokens * 4  # Approximate

    for chunk in chunks:
        title = chunk.get("title") or chunk.get("category", "Info")
        content = chunk.get("content", "")

        part = f"**{title}**\n{content}"

        if total_chars + len(part) > max_chars:
            break

        context_parts.append(part)
        total_chars += len(part)

    return "\n\n".join(context_parts)


@tool
def search_knowledge(query: str) -> str:
    """
    Search the knowledge base for relevant information.

    Use this tool when you need to:
    - Answer questions about products, services, or prices
    - Find specific information the customer is asking about
    - Get details about business policies, hours, or procedures

    Args:
        query: The search query (customer's question or topic)

    Returns:
        Relevant information from the knowledge base.
    """
    # Note: agent_id will be injected at runtime via tool binding
    # For now, return stub message
    return "Knowledge search requires agent_id binding. Use search_knowledge_for_agent instead."


def search_knowledge_for_agent(query: str, agent_id: int, tags: Optional[list[str]] = None) -> str:
    """
    Search knowledge base for a specific agent.

    This is the internal function called by the graph with proper agent context.

    Args:
        query: Search query
        agent_id: Agent ID
        tags: Optional category tags (from stage config)

    Returns:
        Formatted knowledge context
    """
    try:
        chunks = search_knowledge_base(
            query=query,
            agent_id=agent_id,
            limit=5,
            similarity_threshold=0.6,
            tags=tags
        )

        if not chunks:
            return "No relevant information found in the knowledge base."

        context = build_knowledge_context(chunks, max_tokens=2000)
        return context

    except Exception as e:
        print(f"Knowledge search error: {e}")
        return f"Error searching knowledge base: {str(e)}"
