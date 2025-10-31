"""
Knowledge search activity for RAG (workflow-safe, no heavy dependencies).
Used by Assistant workflow for semantic search over knowledge base.
"""
import os
from typing import Dict, Any
from temporalio import activity
from sqlmodel import Session, create_engine, text
import voyageai


def get_voyage_client():
    return voyageai.Client(api_key=os.getenv("VOYAGE_API_KEY"))


# Build database URL from environment variables
DB_USER = os.getenv("POSTGRES_USER", "connectai")
DB_PASS = os.getenv("POSTGRES_PASSWORD")
DB_HOST = os.getenv("POSTGRES_SERVER", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "connectai")
DATABASE_URI = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Database engine with connection pre-ping to avoid stale connections
engine = create_engine(
    DATABASE_URI,
    pool_pre_ping=True,  # Verify connections are alive before using
    pool_recycle=3600,   # Recycle connections after 1 hour
)


@activity.defn
async def search_knowledge(
    query: str,
    agent_id: str,
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
        model="voyage-3.5",
        input_type="query"  # Specify this is a query (vs document)
    )
    query_embedding = embedding_response.embeddings[0]
    embedding_tokens = embedding_response.total_tokens  # Get actual token count

    with Session(engine) as session:
        # Perform vector similarity search using pgvector's <=> operator
        # Note: <=> returns distance (lower is better), we convert to similarity
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

        print(f"DEBUG search_knowledge: query='{query}', agent_id='{agent_id}', threshold={similarity_threshold}, limit={limit}")

        results = session.execute(
            query_text,
            {
                "query_embedding": str(query_embedding),
                "agent_id": agent_id,
                "threshold": similarity_threshold,
                "limit": limit
            }
        ).fetchall()

        print(f"DEBUG search_knowledge: found {len(results)} results")

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
