"""
Knowledge retrieval activities for RAG using pgvector semantic search.
"""
import os
from typing import List, Dict, Any
from temporalio import activity
from sqlmodel import Session, create_engine, select, text
from openai import OpenAI

# OpenAI client will be initialized lazily in the activity
def get_openai_client():
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Build database URL from environment variables
DB_USER = os.getenv("POSTGRES_USER", "connectai")
DB_PASS = os.getenv("POSTGRES_PASSWORD")
DB_HOST = os.getenv("POSTGRES_SERVER", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "connectai")
DATABASE_URI = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Database engine
engine = create_engine(DATABASE_URI)


@activity.defn
async def search_knowledge(
    query: str,
    agent_id: str,
    limit: int = 5,
    similarity_threshold: float = 0.7
) -> List[Dict[str, Any]]:
    """
    Semantic search over knowledge base using pgvector cosine similarity.

    Args:
        query: User's question or search query
        agent_id: Filter results to this agent/business
        limit: Maximum number of results to return
        similarity_threshold: Minimum similarity score (0.0-1.0)

    Returns:
        List of knowledge chunks sorted by relevance with metadata
    """
    # Generate embedding for the query
    client = get_openai_client()
    embedding_response = client.embeddings.create(
        model="text-embedding-3-small",
        input=query
    )
    query_embedding = embedding_response.data[0].embedding

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

        results = session.execute(
            query_text,
            {
                "query_embedding": str(query_embedding),
                "agent_id": agent_id,
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

        return knowledge_chunks
