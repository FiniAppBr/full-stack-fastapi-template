"""Block model - single table for all block types."""

from datetime import datetime
from typing import Optional

from sqlmodel import Column, Field, JSON, SQLModel


class Block(SQLModel, table=True):
    """
    Block: Configuration unit for an AI agent.

    Uses single-table design with discriminator field (block_type).
    All block types share this table.

    Block types:
    - "knowledge": Information the agent knows (menu, FAQs, policies)
    - "personality": How the agent communicates (tone, language, style)
    - "action": What the agent can do (appointments, forms, escalations)

    Note: Not all fields are used by all block types.
    Pydantic schemas enforce which fields are required per type.
    """

    __tablename__ = "blocks"

    # Primary key
    id: Optional[int] = Field(default=None, primary_key=True)

    # Foreign keys
    agent_id: int = Field(foreign_key="agent.id", index=True)

    # Discriminator (knowledge, personality, action)
    block_type: str = Field(index=True)

    # Common fields (all block types)
    name: str = Field(max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    is_active: bool = Field(default=True)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None)  # Soft delete

    # Knowledge block fields
    content: Optional[str] = Field(default=None)
    content_type: Optional[str] = Field(default=None)
    file_path: Optional[str] = Field(default=None)
    file_type: Optional[str] = Field(default=None)

    # Personality block fields
    tone: Optional[str] = Field(default=None)
    languages: Optional[str] = Field(default=None)
    use_emojis: Optional[bool] = Field(default=None)
    emoji_frequency: Optional[str] = Field(default=None)
    response_length: Optional[str] = Field(default=None)
    constraints: Optional[str] = Field(default=None)
    guidelines: Optional[str] = Field(default=None)
    example_conversations: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    # Action block fields
    action_type: Optional[str] = Field(default=None)
    config: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    integration_id: Optional[int] = Field(default=None)
    trigger_conditions: Optional[str] = Field(default=None)
    requires_confirmation: Optional[bool] = Field(default=None)

    # Shared metadata (flexible JSON for any block type)
    metadata_: Optional[dict] = Field(default=None, sa_column=Column(JSON))
