"""Block request/response schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class BlockBase(BaseModel):
    """Base block fields."""

    name: str
    description: Optional[str] = None
    is_active: bool = True


class KnowledgeBlockCreate(BlockBase):
    """Schema for creating a knowledge block."""

    block_type: str = Field(default="knowledge", frozen=True)
    content: Optional[str] = None
    content_type: Optional[str] = None  # "text", "pdf", "faq"
    file_path: Optional[str] = None
    file_type: Optional[str] = None


class PersonalityBlockCreate(BlockBase):
    """Schema for creating a personality block."""

    block_type: str = Field(default="personality", frozen=True)
    tone: Optional[str] = None
    languages: Optional[str] = None
    use_emojis: Optional[bool] = None
    emoji_frequency: Optional[str] = None  # "none", "low", "medium", "high"
    response_length: Optional[str] = None  # "concise", "moderate", "detailed"
    constraints: Optional[str] = None
    guidelines: Optional[str] = None
    example_conversations: Optional[dict] = None


class ActionBlockCreate(BlockBase):
    """Schema for creating an action block."""

    block_type: str = Field(default="action", frozen=True)
    action_type: str  # "appointment", "form_submission", "escalation"
    config: Optional[dict] = None
    integration_id: Optional[int] = None
    trigger_conditions: Optional[str] = None
    requires_confirmation: Optional[bool] = None


class BlockUpdate(BaseModel):
    """Generic block update schema."""

    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    # Allow any additional fields for different block types
    content: Optional[str] = None
    content_type: Optional[str] = None
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    tone: Optional[str] = None
    languages: Optional[str] = None
    use_emojis: Optional[bool] = None
    emoji_frequency: Optional[str] = None
    response_length: Optional[str] = None
    constraints: Optional[str] = None
    guidelines: Optional[str] = None
    example_conversations: Optional[dict] = None
    action_type: Optional[str] = None
    config: Optional[dict] = None
    integration_id: Optional[int] = None
    trigger_conditions: Optional[str] = None
    requires_confirmation: Optional[bool] = None


class BlockPublic(BaseModel):
    """Public block response schema."""

    id: int
    agent_id: int
    block_type: str
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # Optional fields (populated based on block_type)
    content: Optional[str] = None
    content_type: Optional[str] = None
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    tone: Optional[str] = None
    languages: Optional[str] = None
    use_emojis: Optional[bool] = None
    emoji_frequency: Optional[str] = None
    response_length: Optional[str] = None
    constraints: Optional[str] = None
    guidelines: Optional[str] = None
    example_conversations: Optional[dict] = None
    action_type: Optional[str] = None
    config: Optional[dict] = None
    integration_id: Optional[int] = None
    trigger_conditions: Optional[str] = None
    requires_confirmation: Optional[bool] = None
    metadata_: Optional[dict] = None

    model_config = {"from_attributes": True}


class BlocksPublic(BaseModel):
    """List of blocks response."""

    data: list[BlockPublic]
    count: int
