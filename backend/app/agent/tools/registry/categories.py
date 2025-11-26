"""
Tool Categories - Defines available tool categories.

Categories group tools and can be enabled/disabled per agent.
"""

TOOL_CATEGORIES = {
    "core": {
        "name": "Core Tools",
        "description": "Essential tools (handoff, flagging) - always enabled",
        "always_enabled": True,
    },
    "calendar": {
        "name": "Calendar & Scheduling",
        "description": "Appointment booking, availability checking, rescheduling",
        "always_enabled": False,
    },
    "inventory": {
        "name": "Inventory & Stock",
        "description": "Stock checking, reservations, product availability",
        "always_enabled": False,
    },
    "pipeline": {
        "name": "CRM & Pipeline",
        "description": "Contact management, lead qualification, pipeline stages",
        "always_enabled": False,
    },
    "kanban": {
        "name": "Tasks & Follow-ups",
        "description": "Task creation, follow-up reminders, task management",
        "always_enabled": False,
    },
}
