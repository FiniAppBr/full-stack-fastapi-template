"""
Tool Library - Platform-provided tools for agents.

Built-in tools (no integration needed):
- search_knowledge: RAG search over uploaded documents
- handoff_to_human: Transfer to human agent
- flag_urgent: Mark conversation as urgent

Stub tools (to be implemented):
- check_calendar, book_calendar, cancel_booking
- create_task, update_task
- send_document
- collect_lead_info
"""

from .base import BaseTool, ToolResult
from .knowledge import search_knowledge, search_knowledge_for_agent
from .handoff import handoff_to_human, flag_urgent, process_tool_results

# Tool registry - maps tool names to LangChain tool implementations
TOOL_REGISTRY = {
    # Core tools (always available)
    "search_knowledge": search_knowledge,
    "handoff_to_human": handoff_to_human,
    "flag_urgent": flag_urgent,

    # Stub tools (to be implemented)
    # "check_calendar": check_calendar,
    # "book_calendar": book_calendar,
    # "cancel_booking": cancel_booking,
    # "create_task": create_task,
    # "update_task": update_task,
    # "send_document": send_document,
    # "collect_lead_info": collect_lead_info,
}


def get_tools_for_agent(enabled_tools: list[str]) -> list:
    """
    Get tool implementations for an agent's enabled tools.

    Args:
        enabled_tools: List of tool names enabled for this agent

    Returns:
        List of LangChain tool objects
    """
    tools = []

    # Always include core tools
    always_on = ["handoff_to_human", "flag_urgent"]
    for tool_name in always_on:
        if tool_name in TOOL_REGISTRY:
            tools.append(TOOL_REGISTRY[tool_name])

    # Add agent-specific enabled tools
    for tool_name in enabled_tools:
        if tool_name in TOOL_REGISTRY and tool_name not in always_on:
            tools.append(TOOL_REGISTRY[tool_name])

    return tools


__all__ = [
    "BaseTool",
    "ToolResult",
    "TOOL_REGISTRY",
    "get_tools_for_agent",
    "search_knowledge",
    "search_knowledge_for_agent",
    "handoff_to_human",
    "flag_urgent",
    "process_tool_results",
]
