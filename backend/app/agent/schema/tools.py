"""
Tools Schema - Executable capabilities.

Tools are actions the agent can take that affect the world.
Distinct from AssemblyActions which only affect context.
"""

from typing import Optional, Callable, Any
from pydantic import BaseModel, Field


class Tool(BaseModel):
    """
    An executable action the agent can take.

    Examples:
        - send_link: Send purchase link to customer
        - send_video: Send professor's video
        - handoff_human: Transfer to human agent
    """
    id: str
    name: str
    description: str = ""
    requires_gates: list[str] = Field(default_factory=list, description="Gates that must be set to use this tool")
    confirmation_required: bool = Field(False, description="Ask user before executing")

    def can_execute(self, gates: dict[str, bool]) -> bool:
        """Check if all required gates are set."""
        for gate_id in self.requires_gates:
            if not gates.get(gate_id, False):
                return False
        return True


class ToolCall(BaseModel):
    """
    A request to execute a tool.
    Generated during GENERATE stage, executed during EXECUTE stage.
    """
    tool_id: str
    arguments: dict[str, Any] = Field(default_factory=dict)
    awaiting_confirmation: bool = False


class ToolResult(BaseModel):
    """
    Result of tool execution.
    """
    tool_id: str
    success: bool
    result: Optional[str] = None
    error: Optional[str] = None
    gate_updates: dict[str, bool] = Field(default_factory=dict, description="Gates to set after execution")
