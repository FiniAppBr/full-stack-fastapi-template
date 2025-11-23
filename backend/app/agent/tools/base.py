"""
Base Tool Interface - Common structure for all tools.
"""
from typing import Any, Optional
from dataclasses import dataclass
from abc import ABC, abstractmethod


@dataclass
class ToolResult:
    """Standard result from tool execution."""
    success: bool
    data: Any = None
    error: Optional[str] = None
    message: str = ""

    def to_dict(self) -> dict:
        """Convert to dict for state updates."""
        return {
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "message": self.message
        }


class BaseTool(ABC):
    """
    Base class for all agent tools.

    Tools should:
    1. Have a clear, descriptive name
    2. Have comprehensive documentation
    3. Return ToolResult for consistent handling
    4. Handle errors gracefully
    """

    name: str
    description: str

    @abstractmethod
    def run(self, **kwargs) -> ToolResult:
        """
        Execute the tool.

        Args:
            **kwargs: Tool-specific parameters

        Returns:
            ToolResult with success/failure and data
        """
        pass

    def __call__(self, **kwargs) -> ToolResult:
        """Allow tools to be called directly."""
        return self.run(**kwargs)
