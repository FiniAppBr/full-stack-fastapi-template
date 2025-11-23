"""
Voyage AI Client - Embedding models.

Used for semantic search over knowledge base.
"""
import os
from typing import List
import voyageai

_client = None

# Model name
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "voyage-3.5")


def get_voyage_client() -> voyageai.Client:
    """Get or create Voyage AI client."""
    global _client
    if _client is None:
        _client = voyageai.Client(api_key=os.getenv("VOYAGE_API_KEY"))
    return _client


def embed_text(
    texts: List[str],
    input_type: str = "query"
) -> tuple[List[List[float]], int]:
    """
    Generate embeddings for texts.

    Args:
        texts: List of texts to embed
        input_type: "query" for search queries, "document" for indexed content

    Returns:
        Tuple of (embeddings list, total tokens used)
    """
    client = get_voyage_client()
    response = client.embed(
        texts=texts,
        model=EMBEDDING_MODEL,
        input_type=input_type
    )
    return response.embeddings, response.total_tokens
