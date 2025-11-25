"""
Entity model - Structured data (products, services, policies) that agents use.

Entities are:
- Source of truth for structured data (prices, URLs, features)
- Auto-chunked into knowledge base for RAG
- Accessed directly by tools (no hallucination risk)
- Account-level (shared across agents)

Categories:
- products: Produtos & Serviços (what you sell)
- policies: Políticas & Regras (terms and conditions)
- faq: FAQ & Dúvidas (frequently asked questions)
- people: Pessoas & Contatos (team and contacts)
- locations: Locais & Horários (where and when)
- processes: Processos & Fluxos (how things work)
- brand: Marca & Identidade (voice and values)
- custom: Personalizado (custom entities)
"""
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON


# Valid categories (maps to frontend entity-schemas.json)
ENTITY_CATEGORIES = [
    "products",
    "policies",
    "faq",
    "people",
    "locations",
    "processes",
    "brand",
    "custom",
]


class EntityBase(SQLModel):
    """Base entity fields."""
    name: str = Field(description="Display name")
    category: str = Field(
        default="custom",
        description="Entity category: products, policies, faq, people, locations, processes, brand, custom"
    )
    template: Optional[str] = Field(
        default=None,
        description="Template ID used to create this entity (e.g., 'digital_course', 'guarantee')"
    )
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

    # Processing state
    is_processed: bool = Field(default=False, description="Whether entity has been chunked for RAG")
    processed_at: Optional[datetime] = Field(default=None, description="When entity was last processed")

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
    category: Optional[str] = None
    template: Optional[str] = None
    data: Optional[dict] = None
    description: Optional[str] = None
    agent_id: Optional[str] = None


class EntityPublic(EntityBase):
    """Schema for public entity response."""
    id: int
    chunk_ids: Optional[list[int]] = None
    is_processed: bool = False
    processed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # For backwards compatibility - return category as type
    @property
    def type(self) -> str:
        return self.category


class EntitiesPublic(SQLModel):
    """Schema for list of entities."""
    data: list[EntityPublic]
    count: int
