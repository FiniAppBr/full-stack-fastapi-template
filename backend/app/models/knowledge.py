"""
Knowledge base model for RAG retrieval with pgvector.
"""
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import ARRAY, String, JSON
from pgvector.sqlalchemy import Vector


class KnowledgeBase(SQLModel, table=True):
    """
    Store business knowledge chunks with embeddings for semantic search.

    Each row represents a discrete piece of knowledge (FAQ, policy, pricing, etc.)
    that can be retrieved via vector similarity search.

    V2 additions:
    - labels: Array of string labels for flexible categorization
    - trait_filter: JSON dict for trait-based filtering
    """
    __tablename__ = "knowledge_base"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Core content
    content: str = Field(description="The actual knowledge text")
    category: str = Field(description="Type of knowledge: faq, pricing, hours, policy, service")

    # Entity reference - pattern: "entity:{id}"
    agent_id: str = Field(default="", description="Entity reference in 'entity:{id}' format")
    title: Optional[str] = Field(default=None, description="Short title for the knowledge chunk")
    metadata_json: Optional[str] = Field(default=None, description="Additional metadata as JSON string")

    # V2: Labels for flexible categorization (e.g., ["stage:conexao", "rapport", "objection:talent"])
    labels: Optional[list[str]] = Field(
        default=None,
        sa_column=Column(ARRAY(String)),
        description="Array of labels for context assembly rules"
    )

    # V2: Trait filter for personalized content (e.g., {"skill_level": "zero", "use_case": "igreja"})
    trait_filter: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Filter content by user traits"
    )

    # V2: Token count for budget management
    token_count: int = Field(default=0, description="Approximate token count for budget management")

    # Vector embedding for semantic search
    embedding: Optional[str] = Field(
        default=None,
        sa_column=Column(Vector(1024)),  # voyage-3.5 dimension
        description="Voyage AI embedding vector"
    )

    # Timestamps
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

    # Soft delete
    is_active: bool = Field(default=True, description="Soft delete flag")
