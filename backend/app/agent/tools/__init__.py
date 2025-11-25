"""
Tool Library - Platform-provided tools for agents.

Built-in tools (no integration needed):
- search_knowledge: RAG search over uploaded documents
- handoff_to_human: Transfer to human agent
- flag_urgent: Mark conversation as urgent

Calendar tools:
- check_availability: Check available time slots
- book_appointment: Create a booking
- cancel_appointment: Cancel an existing booking
- reschedule_appointment: Change booking date/time

Kanban tools (tasks):
- create_task: Create a follow-up or internal task
- update_task_status: Update task status or details
- list_pending_tasks: List tasks by status/priority

Pipeline tools (CRM/contacts):
- save_contact: Create or update a contact with collected information
- move_contact_stage: Move a contact through pipeline stages
- get_contact_info: Retrieve contact information
- qualify_lead: Qualify a lead using BANT criteria
"""

from .base import BaseTool, ToolResult
from .knowledge import search_knowledge, search_knowledge_for_agent
from .handoff import handoff_to_human, flag_urgent, process_tool_results
from .calendar import (
    check_availability,
    book_appointment,
    cancel_appointment,
    reschedule_appointment,
    CALENDAR_TOOLS,
)
from .kanban import (
    create_task,
    update_task_status,
    list_pending_tasks,
    KANBAN_TOOLS,
)
from .pipeline import (
    save_contact,
    move_contact_stage,
    get_contact_info,
    qualify_lead,
    PIPELINE_TOOLS,
)
from .inventory import (
    check_stock,
    reserve_stock,
    release_stock,
    update_stock,
    INVENTORY_TOOLS,
)

# Tool registry - maps tool names to LangChain tool implementations
TOOL_REGISTRY = {
    # Core tools (always available)
    "search_knowledge": search_knowledge,
    "handoff_to_human": handoff_to_human,
    "flag_urgent": flag_urgent,

    # Calendar tools
    "check_availability": check_availability,
    "book_appointment": book_appointment,
    "cancel_appointment": cancel_appointment,
    "reschedule_appointment": reschedule_appointment,

    # Kanban tools (tasks)
    "create_task": create_task,
    "update_task_status": update_task_status,
    "list_pending_tasks": list_pending_tasks,

    # Pipeline tools (CRM/contacts)
    "save_contact": save_contact,
    "move_contact_stage": move_contact_stage,
    "get_contact_info": get_contact_info,
    "qualify_lead": qualify_lead,

    # Inventory tools (stock management)
    "check_stock": check_stock,
    "reserve_stock": reserve_stock,
    "release_stock": release_stock,
    "update_stock": update_stock,
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
    # Calendar tools
    "check_availability",
    "book_appointment",
    "cancel_appointment",
    "reschedule_appointment",
    "CALENDAR_TOOLS",
    # Kanban tools (tasks)
    "create_task",
    "update_task_status",
    "list_pending_tasks",
    "KANBAN_TOOLS",
    # Pipeline tools (CRM/contacts)
    "save_contact",
    "move_contact_stage",
    "get_contact_info",
    "qualify_lead",
    "PIPELINE_TOOLS",
    # Inventory tools
    "check_stock",
    "reserve_stock",
    "release_stock",
    "update_stock",
    "INVENTORY_TOOLS",
]
