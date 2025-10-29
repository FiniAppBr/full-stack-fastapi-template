"""
Knowledge base model for RAG retrieval with pgvector.
"""
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel
from pgvector.sqlalchemy import Vector


class KnowledgeBase(SQLModel, table=True):
    """
    Store business knowledge chunks with embeddings for semantic search.

    Each row represents a discrete piece of knowledge (FAQ, policy, pricing, etc.)
    that can be retrieved via vector similarity search.
    """
    __tablename__ = "knowledge_base"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Core content
    content: str = Field(description="The actual knowledge text")
    category: str = Field(description="Type of knowledge: faq, pricing, hours, policy, service")

    # Metadata for filtering and display
    agent_id: str = Field(description="Which agent/business this knowledge belongs to")
    title: Optional[str] = Field(default=None, description="Short title for the knowledge chunk")
    metadata_json: Optional[str] = Field(default=None, description="Additional metadata as JSON string")

    # Vector embedding for semantic search
    embedding: Optional[str] = Field(
        default=None,
        sa_column=Vector(1024),  # voyage-3.5 dimension (changed from 1536)
        description="Voyage AI embedding vector"
    )

    # Timestamps
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

    # Soft delete
    is_active: bool = Field(default=True, description="Soft delete flag")
