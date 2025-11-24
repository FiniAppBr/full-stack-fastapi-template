"""
Neo Agent model for the new agent configuration system.
"""
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON, ARRAY, String


class NeoAgentBase(SQLModel):
    """Base model for Neo Agent."""
    name: str = Field(description="Agent display name")
    description: Optional[str] = Field(default=None, description="Agent description")
    template: str = Field(default="custom", description="Template ID used to create this agent")
    is_active: bool = Field(default=True, description="Whether the agent is active")

    # Channels as array
    channels: list[str] = Field(
        default_factory=list,
        sa_column=Column(ARRAY(String)),
        description="List of enabled channel IDs"
    )

    # Linked entities (IDs)
    linked_entities: list[int] = Field(
        default_factory=list,
        sa_column=Column(ARRAY(String)),
        description="List of linked entity IDs"
    )

    # Configuration as JSON
    config: dict = Field(
        default_factory=dict,
        sa_column=Column(JSON),
        description="Agent configuration (personality, guardrails, actions)"
    )


class NeoAgent(NeoAgentBase, table=True):
    """Neo Agent database model."""
    __tablename__ = "neo_agents"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Stats (updated by system)
    stats: dict = Field(
        default_factory=lambda: {"conversations": 0, "conversions": 0, "satisfaction": 0.0},
        sa_column=Column(JSON),
        description="Agent performance stats"
    )

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class NeoAgentCreate(NeoAgentBase):
    """Schema for creating a Neo Agent."""
    pass


class NeoAgentUpdate(SQLModel):
    """Schema for updating a Neo Agent."""
    name: Optional[str] = None
    description: Optional[str] = None
    template: Optional[str] = None
    is_active: Optional[bool] = None
    channels: Optional[list[str]] = None
    linked_entities: Optional[list[int]] = None
    config: Optional[dict] = None


class NeoAgentPublic(NeoAgentBase):
    """Schema for public Neo Agent response."""
    id: int
    stats: dict
    created_at: datetime
    updated_at: datetime
    entities_count: Optional[int] = None


class NeoAgentsPublic(SQLModel):
    """Schema for list of Neo Agents."""
    data: list[NeoAgentPublic]
    count: int
