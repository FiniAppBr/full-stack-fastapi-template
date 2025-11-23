"""
Tool Library - Platform-provided tools for agents.

Built-in tools (no integration needed):
- search_knowledge: RAG search over uploaded documents
- check_calendar: Internal calendar availability
- book_calendar: Book on internal calendar
- cancel_booking: Cancel internal booking
- create_task: Create kanban task
- update_task: Update kanban task
- send_document: Send document to customer
- collect_lead_info: Capture lead information
- handoff_to_human: Transfer to human agent
- flag_urgent: Mark conversation as urgent

External tools (require integration - STUBBED):
- google_calendar: Sync with Google Calendar
- calendly: Calendly integration
- slack_notify: Send Slack notifications
"""

from .base import BaseTool, ToolResult
from .knowledge import search_knowledge_tool
from .handoff import handoff_to_human_tool, flag_urgent_tool

# Tool registry - maps tool names to implementations
TOOL_REGISTRY = {
    # Built-in (always available)
    "search_knowledge": search_knowledge_tool,
    "handoff_to_human": handoff_to_human_tool,
    "flag_urgent": flag_urgent_tool,

    # Built-in (when enabled)
    # "check_calendar": check_calendar_tool,  # TODO: Phase 4
    # "book_calendar": book_calendar_tool,
    # "cancel_booking": cancel_booking_tool,
    # "create_task": create_task_tool,
    # "update_task": update_task_tool,
    # "send_document": send_document_tool,
    # "collect_lead_info": collect_lead_info_tool,
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
    always_on = ["search_knowledge", "handoff_to_human", "flag_urgent"]
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
    "search_knowledge_tool",
    "handoff_to_human_tool",
    "flag_urgent_tool",
]
