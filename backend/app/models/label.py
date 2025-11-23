"""
Label model for structured content tagging with hierarchy support.

Labels are first-class entities that can be:
- Organized in hierarchies (objecao -> objecao:dinheiro)
- Attached to chunks via junction table
- Referenced by rules for assembly/generation
- Audited for coverage (which labels have chunks, which are orphans)
"""
from datetime import datetime
from typing import Optional, List, ClassVar, TYPE_CHECKING
from uuid import UUID
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from .knowledge import KnowledgeBase


class Label(SQLModel, table=True):
    """
    A label that can be attached to knowledge chunks.

    Supports hierarchy via parent_id for patterns like:
    - objecao (parent)
      - objecao:dinheiro (child)
      - objecao:tempo (child)
    """
    __tablename__ = "labels"

    # Valid categories for label organization
    CATEGORIES: ClassVar[List[str]] = ["stages", "objections", "use_cases", "gated", "content"]

    id: Optional[int] = Field(default=None, primary_key=True)

    # Owner - labels are user-scoped
    user_id: UUID = Field(foreign_key="user.id", index=True, description="Owner of this label")

    # Core fields
    name: str = Field(index=True, description="Label name (e.g., 'objecao:dinheiro') - unique per user")
    category: str = Field(index=True, description="Category: stages, objections, use_cases, gated, content")
    description: Optional[str] = Field(default=None, description="Human-readable description")

    # Hierarchy
    parent_id: Optional[int] = Field(default=None, foreign_key="labels.id", description="Parent label for hierarchy")

    # Status
    deprecated: bool = Field(default=False, description="Soft deprecation - warn but allow")

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    chunk_links: List["ChunkLabel"] = Relationship(back_populates="label")


class ChunkLabel(SQLModel, table=True):
    """
    Junction table linking chunks to labels.
    Replaces the varchar[] array for proper relational integrity.
    """
    __tablename__ = "chunk_labels"

    chunk_id: int = Field(foreign_key="knowledge_base.id", primary_key=True)
    label_id: int = Field(foreign_key="labels.id", primary_key=True)

    # When this association was created
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    label: Label = Relationship(back_populates="chunk_links")


