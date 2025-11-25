"""
Pipeline models - Kanban board for managing contacts/leads through stages.

A Pipeline is a configurable board with:
- Columns (stages) that can be customized
- Cards that represent contacts in each stage
- Support for drag-and-drop reordering
"""
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON


# Default pipeline stages
DEFAULT_PIPELINE_STAGES = [
    {"id": "new", "name": "Novos Leads", "color": "#00B8D9", "order": 0},
    {"id": "contacted", "name": "Em Contato", "color": "#FFAB00", "order": 1},
    {"id": "qualified", "name": "Qualificado", "color": "#36B37E", "order": 2},
    {"id": "negotiation", "name": "Negociação", "color": "#6554C0", "order": 3},
    {"id": "won", "name": "Fechado", "color": "#00875A", "order": 4},
    {"id": "lost", "name": "Perdido", "color": "#DE350B", "order": 5},
]


class PipelineColumnBase(SQLModel):
    """Base column fields."""
    name: str = Field(description="Column/stage name")
    color: Optional[str] = Field(default="#00B8D9", description="Column color (hex)")
    order: int = Field(default=0, description="Column order in the board")


class PipelineColumn(PipelineColumnBase, table=True):
    """
    Pipeline column (stage) database model.

    Represents a stage in the pipeline (e.g., "New Leads", "Qualified", "Won").
    """
    __tablename__ = "pipeline_columns"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Soft delete
    is_active: bool = Field(default=True)


class PipelineColumnCreate(PipelineColumnBase):
    """Schema for creating a column."""
    pass


class PipelineColumnUpdate(SQLModel):
    """Schema for updating a column."""
    name: Optional[str] = None
    color: Optional[str] = None
    order: Optional[int] = None


class PipelineColumnPublic(PipelineColumnBase):
    """Schema for public column response."""
    id: int
    created_at: datetime
    updated_at: datetime


class PipelineCardBase(SQLModel):
    """Base card fields."""
    contact_id: int = Field(description="Contact this card represents")
    column_id: int = Field(description="Column/stage the card is in")
    order: int = Field(default=0, description="Card order within the column")
    priority: Optional[str] = Field(
        default="medium",
        description="Card priority: low, medium, high"
    )
    due_date: Optional[datetime] = Field(default=None, description="Due date for follow-up")
    notes: Optional[str] = Field(default=None, description="Card-specific notes")


class PipelineCard(PipelineCardBase, table=True):
    """
    Pipeline card database model.

    Represents a contact in a specific stage of the pipeline.
    Each card links to a contact and tracks their position in the funnel.
    """
    __tablename__ = "pipeline_cards"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Card metadata
    labels: Optional[list[str]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Labels/tags for the card"
    )

    # Activity tracking
    last_activity_at: Optional[datetime] = Field(default=None, description="Last activity on this card")
    moved_at: Optional[datetime] = Field(default=None, description="When card was last moved")

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Soft delete
    is_active: bool = Field(default=True)


class PipelineCardCreate(PipelineCardBase):
    """Schema for creating a card."""
    labels: Optional[list[str]] = None


class PipelineCardUpdate(SQLModel):
    """Schema for updating a card."""
    column_id: Optional[int] = None
    order: Optional[int] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    labels: Optional[list[str]] = None


class PipelineCardPublic(PipelineCardBase):
    """Schema for public card response."""
    id: int
    labels: Optional[list[str]] = None
    last_activity_at: Optional[datetime] = None
    moved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# Board response (for kanban view)
class PipelineBoardColumn(SQLModel):
    """Column with its cards for board view."""
    id: int
    name: str
    color: Optional[str] = None
    order: int


class PipelineBoardCard(SQLModel):
    """Card with contact info for board view."""
    id: int
    contact_id: int
    contact_name: str
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    labels: Optional[list[str]] = None
    order: int


class PipelineBoardResponse(SQLModel):
    """Full board response for kanban view."""
    columns: list[PipelineBoardColumn]
    # tasks is a dict with column_id as key and list of cards as value
    # Using dict for frontend compatibility with existing kanban
