"""
Tool Registry - Centralized tool metadata and resolution.

Usage:
    from app.agent.tools.registry import (
        get_tool_instructions_for_intents,
        get_enabled_tools,
        TOOL_CATEGORIES,
    )
"""

from .meta import ToolMeta
from .categories import TOOL_CATEGORIES
from .definitions import TOOL_METADATA
from .resolver import (
    get_tools_by_category,
    get_enabled_tools,
    get_tool_instructions_for_intents,
    get_available_tools_summary,
)

__all__ = [
    "ToolMeta",
    "TOOL_CATEGORIES",
    "TOOL_METADATA",
    "get_tools_by_category",
    "get_enabled_tools",
    "get_tool_instructions_for_intents",
    "get_available_tools_summary",
]
