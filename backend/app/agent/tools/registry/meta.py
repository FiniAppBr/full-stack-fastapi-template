"""
Tool Metadata - Defines the ToolMeta dataclass.
"""

from dataclasses import dataclass, field


@dataclass
class ToolMeta:
    """
    Metadata for a tool - defines when and how to use it.

    Attributes:
        name: Tool function name (must match the @tool decorated function)
        category: Tool category for enabling groups (calendar, inventory, pipeline, etc.)
        trigger_intents: Intents that should prompt use of this tool
        instruction: Context-aware instruction for when this tool is relevant
        requires_confirmation: If True, agent should confirm with user before executing
        priority: When multiple tools match, higher priority wins (default 50)
    """
    name: str
    category: str
    trigger_intents: list[str] = field(default_factory=list)
    instruction: str = ""
    requires_confirmation: bool = False
    priority: int = 50
