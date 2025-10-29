"""ConversationLog model - analytics data for agent conversations."""

from datetime import datetime
from typing import Optional

from sqlmodel import Field, JSON, Column, SQLModel


class ConversationLog(SQLModel, table=True):
    """
    Log of agent conversation executions for analytics and debugging.

    Written at the end of each AssistantWorkflow execution.
    """

    __tablename__ = "conversation_log"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Workflow identification
    workflow_id: str = Field(index=True, description="Temporal workflow ID")
    customer_id: str = Field(index=True, description="Customer identifier")
    agent_id: str = Field(index=True, description="Agent identifier")

    # Input/Output
    message: str = Field(description="Customer message")
    response: str = Field(description="Agent response")

    # Intent classification
    intent: str = Field(description="Classified intent (question, booking, etc.)")
    confidence: float = Field(description="Intent confidence (0.0-1.0)")

    # Performance metrics
    duration_seconds: float = Field(description="Total workflow execution time")
    agent_timings: dict = Field(
        default={},
        sa_column=Column(JSON),
        description="Time per agent: {intent_classifier: 1.2, ...}"
    )

    # Status
    status: str = Field(
        default="completed",
        description="Workflow status: completed, failed, timeout"
    )
    error_message: Optional[str] = Field(
        default=None,
        description="Error details if status=failed"
    )

    # Token usage and cost tracking
    input_tokens: int = Field(default=0, description="Total input tokens across all agents")
    output_tokens: int = Field(default=0, description="Total output tokens across all agents")
    total_tokens: int = Field(default=0, description="Total tokens (input + output)")
    token_details: dict = Field(
        default={},
        sa_column=Column(JSON),
        description="Per-agent token usage: {intent_classifier: {input: 50, output: 20}, ...}"
    )
    model_used: str = Field(default="gpt-4o-mini", description="LLM model used")
    estimated_cost_usd: float = Field(default=0.0, description="Estimated cost in USD")

    # Character counts (legacy, kept for reference)
    input_chars: int = Field(default=0, description="Input character count")
    output_chars: int = Field(default=0, description="Output character count")

    # Timestamp
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
