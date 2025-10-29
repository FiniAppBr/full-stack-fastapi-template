"""
Mem0 Memory Configuration for ConnectAI Assistant
Handles long-term semantic memory for conversations.
"""

from mem0 import Memory
from app.core.config import settings

# Mem0 configuration for PostgreSQL + pgvector
config = {
    "vector_store": {
        "provider": "pgvector",
        "config": {
            "host": settings.POSTGRES_SERVER,
            "port": settings.POSTGRES_PORT,
            "user": settings.POSTGRES_USER,
            "password": settings.POSTGRES_PASSWORD,
            "dbname": settings.POSTGRES_DB,
            "collection_name": "memories",  # Table name for memories
        }
    },
    "embedder": {
        "provider": "openai",
        "config": {
            "model": "text-embedding-3-small",  # Cheap and fast
        }
    },
    "llm": {
        "provider": "openai",
        "config": {
            "model": "gpt-4o-mini",  # For fact extraction
            "temperature": 0.1,
        }
    },
    "version": "v1.1"
}

# Global memory instance
memory = Memory.from_config(config)


def get_memory() -> Memory:
    """Get the global memory instance."""
    return memory
