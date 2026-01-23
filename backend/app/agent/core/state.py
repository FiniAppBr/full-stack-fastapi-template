"""
Graph state definition for the agent pipeline.

Single responsibility: Define the state that flows through the LangGraph pipeline.
"""

from typing import TypedDict, Annotated, Optional, Sequence

from langchain_core.messages import BaseMessage, SystemMessage

from app.agent.core.schema import AgentState, MessageWithTiming, AssembleResult
from app.agent.core.config import BaseAgentConfig


def react_messages_reducer(
    current: Sequence[BaseMessage],
    update: Sequence[BaseMessage]
) -> Sequence[BaseMessage]:
    """
    Custom reducer for react_messages.

    If update starts with SystemMessage, replace entirely (new turn).
    Otherwise append (tool results, etc.).
    """
    if update and len(update) > 0 and isinstance(update[0], SystemMessage):
        return list(update)
    return list(current) + list(update)


class GraphState(TypedDict):
    """State that flows through the LangGraph pipeline."""

    # Input
    message: str
    config: BaseAgentConfig

    # Agent state (persisted across conversations)
    agent_state: AgentState

    # Pipeline intermediates
    assembled: Optional[AssembleResult]

    # Preprocessing results (normalized dates, extracted entities)
    preprocessed: Optional[dict]

    # ReAct messages (for tool loop)
    react_messages: Annotated[Sequence[BaseMessage], react_messages_reducer]

    # Response (from generate node)
    response_messages: Optional[list[str]]

    # Tool tracking
    react_iterations: int
    tool_calls_made: list[dict]

    # Tool result cache (avoids redundant calls)
    cached_tool_results: Optional[dict]

    # Validation (for retry loop)
    validation_passed: Optional[bool]
    validation_issues: Optional[list[str]]
    retry_count: int

    # Output
    final_response: Optional[str]
    messages: list[MessageWithTiming]
    escalation: Optional[dict]
    tokens_used: int
    tokens_in: int
    tokens_out: int
    system_prompt: Optional[str]
