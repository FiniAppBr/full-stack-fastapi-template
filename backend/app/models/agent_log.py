"""AgentLog model - analytics data for agent conversations."""

from datetime import datetime
from typing import Optional

from sqlmodel import Field, JSON, Column, SQLModel


class AgentLog(SQLModel, table=True):
    """
    Log of agent conversation turns for analytics.
    Each row = one turn in a conversation.
    """

    __tablename__ = "agent_log"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Conversation identification
    thread_id: str = Field(index=True, description="Conversation thread ID")
    agent_id: int = Field(index=True, description="Neo agent ID")
    turn_number: int = Field(description="Turn number in conversation (1-indexed)")

    # Input/Output
    user_message: str = Field(description="User input message")
    agent_response: str = Field(description="Agent response (joined messages)")

    # Intent & Classification
    intent: str = Field(default="unknown", index=True, description="Classified intent")
    objection_type: Optional[str] = Field(default=None, description="Objection type if detected")

    # Customer context snapshot
    traits: dict = Field(default={}, sa_column=Column(JSON), description="Customer traits snapshot")
    events: dict = Field(default={}, sa_column=Column(JSON), description="Conversation events snapshot")

    # RAG/Assembly info
    chunks_used: int = Field(default=0, description="Number of knowledge chunks retrieved")
    chunk_ids: list = Field(default=[], sa_column=Column(JSON), description="IDs of chunks used")
    examples_used: list = Field(default=[], sa_column=Column(JSON), description="Example types used")

    # Token usage & cost
    input_tokens: int = Field(default=0, description="Input tokens for this turn")
    output_tokens: int = Field(default=0, description="Output tokens for this turn")
    total_tokens: int = Field(default=0, description="Total tokens for this turn")
    estimated_cost_usd: float = Field(default=0.0, description="Estimated cost in USD")
    model_used: str = Field(default="gpt-4o-mini", description="LLM model used")

    # Escalation/Handoff
    escalation: Optional[str] = Field(default=None, description="Escalation type if triggered")
    requires_handoff: bool = Field(default=False, description="Whether handoff was required")

    # Performance
    latency_ms: int = Field(default=0, description="Response latency in milliseconds")

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class AgentLogCreate(SQLModel):
    """Schema for creating an agent log entry."""
    thread_id: str
    agent_id: int
    turn_number: int
    user_message: str
    agent_response: str
    intent: str = "unknown"
    objection_type: Optional[str] = None
    traits: dict = {}
    events: dict = {}
    chunks_used: int = 0
    chunk_ids: list = []
    examples_used: list = []
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: float = 0.0
    model_used: str = "gpt-4o-mini"
    escalation: Optional[str] = None
    requires_handoff: bool = False
    latency_ms: int = 0


class AgentLogPublic(SQLModel):
    """Public schema for agent log."""
    id: int
    thread_id: str
    agent_id: int
    turn_number: int
    user_message: str
    agent_response: str
    intent: str
    objection_type: Optional[str]
    traits: dict
    events: dict
    chunks_used: int
    examples_used: list
    total_tokens: int
    estimated_cost_usd: float
    escalation: Optional[str]
    requires_handoff: bool
    latency_ms: int
    model_used: str
    created_at: datetime
