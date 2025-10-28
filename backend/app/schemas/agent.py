"""Agent request/response schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AgentCreate(BaseModel):
    """Schema for creating an agent."""

    name: str
    description: Optional[str] = None
    is_active: bool = True


class AgentUpdate(BaseModel):
    """Schema for updating an agent."""

    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    is_published: Optional[bool] = None
    whatsapp_number: Optional[str] = None
    webhook_url: Optional[str] = None


class AgentPublic(BaseModel):
    """Public agent response schema."""

    id: int
    name: str
    description: Optional[str] = None
    is_active: bool
    is_published: bool
    whatsapp_number: Optional[str] = None
    webhook_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AgentsPublic(BaseModel):
    """List of agents response."""

    data: list[AgentPublic]
    count: int
