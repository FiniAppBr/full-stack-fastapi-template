"""Agent model - represents a configured AI agent."""

import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel, Column
from sqlalchemy import JSON


class Agent(SQLModel, table=True):
    """
    Agent: A configured AI assistant.

    One user can have multiple agents (though most will have just one).

    Examples:
    - Restaurant owner has 1 agent for reservations/menu questions
    - Course creator has 1 agent for student support
    - Agency owner might have 10 agents (one per client)

    The agent's behavior is defined by its blocks:
    - KnowledgeBlocks: What it knows
    - PersonalityBlocks: How it talks
    - ActionBlocks: What it can do
    """

    __tablename__ = "agent"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Owner - must match User.id type (UUID)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    # Agent info
    name: str = Field(
        max_length=255, description="Agent name (e.g., 'Restaurant Assistant')"
    )
    description: Optional[str] = Field(
        default=None, description="What this agent does"
    )

    # Status
    is_active: bool = Field(
        default=True, description="Whether agent is live and handling conversations"
    )
    is_published: bool = Field(
        default=False,
        description="Whether configuration is complete and ready for use",
    )

    # Integration settings (for v0.2+)
    whatsapp_number: Optional[str] = Field(
        default=None, description="WhatsApp Business number (if connected)"
    )
    webhook_url: Optional[str] = Field(
        default=None, description="Webhook for receiving messages"
    )

    # Response Configuration (for dynamic schemas)
    response_schema: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Custom response fields (e.g., {'order_type': ['inquiry', 'ordering']})",
    )
    multi_turn_config: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Multi-turn response settings (e.g., {'enabled': true, 'style': 'natural', 'max_splits': 3})",
    )
    media_rules: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Media trigger rules (e.g., {'menu_pdf': {'triggers': ['menu_request']}})",
    )

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    published_at: Optional[datetime] = Field(
        default=None, description="When agent was first published/activated"
    )

    # Relationships
    # Note: blocks relationship defined via back_populates in BaseBlock (future)
    # For v0.1, we'll query blocks via agent_id foreign key
