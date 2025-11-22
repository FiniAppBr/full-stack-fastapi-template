"""
Knowledge search utilities - Voyage AI embeddings + pgvector similarity search.
Extracted from Temporal activities for use with LangGraph.
"""
import os
from typing import Dict, Any, List
from sqlmodel import Session, text
import voyageai

from app.core.db import engine


def get_voyage_client():
    """Get Voyage AI client."""
    return voyageai.Client(api_key=os.getenv("VOYAGE_API_KEY"))


def search_knowledge(
    query: str,
    agent_id: int,
    limit: int = 5,
    similarity_threshold: float = 0.7
) -> Dict[str, Any]:
    """
    Semantic search over knowledge base using pgvector cosine similarity.

    Args:
        query: User's question or search query
        agent_id: Filter results to this agent/business
        limit: Maximum number of results to return
        similarity_threshold: Minimum similarity score (0.0-1.0)

    Returns:
        Dictionary with:
        - chunks: List of knowledge chunks sorted by relevance
        - embedding_tokens: Actual token count from Voyage API
    """
    # Generate embedding for the query using Voyage AI
    client = get_voyage_client()
    embedding_response = client.embed(
        texts=[query],
        model="voyage-3",
        input_type="query"
    )
    query_embedding = embedding_response.embeddings[0]
    embedding_tokens = embedding_response.total_tokens

    with Session(engine) as session:
        # Perform vector similarity search using pgvector's <=> operator
        query_text = text("""
            SELECT
                id,
                content,
                category,
                title,
                metadata_json,
                1 - (embedding <=> :query_embedding) as similarity
            FROM knowledge_base
            WHERE agent_id = :agent_id
              AND is_active = true
              AND (1 - (embedding <=> :query_embedding)) >= :threshold
            ORDER BY embedding <=> :query_embedding
            LIMIT :limit
        """)

        results = session.execute(
            query_text,
            {
                "query_embedding": str(query_embedding),
                "agent_id": str(agent_id),
                "threshold": similarity_threshold,
                "limit": limit
            }
        ).fetchall()

        # Format results
        knowledge_chunks = []
        for row in results:
            knowledge_chunks.append({
                "id": row.id,
                "content": row.content,
                "category": row.category,
                "title": row.title,
                "similarity": float(row.similarity),
                "metadata": row.metadata_json
            })

        return {
            "chunks": knowledge_chunks,
            "embedding_tokens": embedding_tokens
        }
