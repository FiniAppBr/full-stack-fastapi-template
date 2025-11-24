"""
Entity model - Structured data (products, services, policies) that agents use.

Entities are:
- Source of truth for structured data (prices, URLs, features)
- Auto-chunked into knowledge base for RAG
- Accessed directly by tools (no hallucination risk)
- Account-level (shared across agents)
"""
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON


class EntityBase(SQLModel):
    """Base entity fields."""
    name: str = Field(description="Display name")
    type: str = Field(description="Entity type: product, service, policy, faq, custom")
    data: dict = Field(
        default_factory=dict,
        sa_column=Column(JSON),
        description="Flexible JSON data for entity fields"
    )
    description: Optional[str] = Field(default=None, description="Optional description")
    agent_id: Optional[str] = Field(default=None, description="Optional agent scope (null = account-level)")


class Entity(EntityBase, table=True):
    """
    Entity database model.

    Examples:
    - Product: {"name": "Curso Violão", "price": 297, "checkout_url": "...", "features": [...]}
    - Service: {"name": "Consulta", "duration": 60, "booking_url": "..."}
    - Policy: {"name": "Garantia", "days": 7, "description": "..."}
    - FAQ: {"question": "Como funciona?", "answer": "..."}
    """
    __tablename__ = "entities"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Auto-chunking tracking
    chunk_ids: Optional[list[int]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="IDs of auto-generated knowledge chunks"
    )

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Soft delete
    is_active: bool = Field(default=True)


class EntityCreate(EntityBase):
    """Schema for creating an entity."""
    pass


class EntityUpdate(SQLModel):
    """Schema for updating an entity."""
    name: Optional[str] = None
    type: Optional[str] = None
    data: Optional[dict] = None
    description: Optional[str] = None
    agent_id: Optional[str] = None


class EntityPublic(EntityBase):
    """Schema for public entity response."""
    id: int
    chunk_ids: Optional[list[int]] = None
    created_at: datetime
    updated_at: datetime


class EntitiesPublic(SQLModel):
    """Schema for list of entities."""
    data: list[EntityPublic]
    count: int
