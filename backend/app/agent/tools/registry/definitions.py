"""
Tool Definitions - Metadata for all available tools.

When adding new tools:
1. Create the tool in the appropriate module (calendar.py, inventory.py, etc.)
2. Add a ToolMeta entry here with appropriate triggers and instructions
3. The system auto-discovers and uses the metadata
"""

from .meta import ToolMeta


TOOL_METADATA: dict[str, ToolMeta] = {
    # -------------------------------------------------------------------------
    # CALENDAR TOOLS
    # -------------------------------------------------------------------------
    "check_availability": ToolMeta(
        name="check_availability",
        category="calendar",
        trigger_intents=["availability_check", "schedule_inquiry", "booking_request"],
        instruction="Use check_availability ANTES de responder sobre horários disponíveis.",
        priority=60,
    ),
    "book_appointment": ToolMeta(
        name="book_appointment",
        category="calendar",
        trigger_intents=["booking_request", "booking_confirmation"],
        instruction="Confirme data, horário e nome do cliente antes de usar book_appointment.",
        requires_confirmation=True,
        priority=50,
    ),
    "cancel_appointment": ToolMeta(
        name="cancel_appointment",
        category="calendar",
        trigger_intents=["booking_cancellation"],
        instruction="Confirme que o cliente realmente quer cancelar antes de usar cancel_appointment.",
        requires_confirmation=True,
        priority=50,
    ),
    "reschedule_appointment": ToolMeta(
        name="reschedule_appointment",
        category="calendar",
        trigger_intents=["booking_reschedule"],
        instruction="Obtenha o código da reserva e novo horário desejado, depois use reschedule_appointment.",
        requires_confirmation=True,
        priority=50,
    ),

    # -------------------------------------------------------------------------
    # INVENTORY TOOLS
    # -------------------------------------------------------------------------
    "check_stock": ToolMeta(
        name="check_stock",
        category="inventory",
        trigger_intents=["stock_inquiry", "product_availability"],
        instruction="Use check_stock para verificar disponibilidade. NUNCA invente quantidades.",
        priority=60,
    ),
    "reserve_stock": ToolMeta(
        name="reserve_stock",
        category="inventory",
        trigger_intents=["purchase_intent", "reservation_request"],
        instruction="Confirme o produto e quantidade com o cliente antes de usar reserve_stock.",
        requires_confirmation=True,
        priority=50,
    ),
    "release_stock": ToolMeta(
        name="release_stock",
        category="inventory",
        trigger_intents=["reservation_cancellation"],
        instruction="Use release_stock para liberar uma reserva de estoque.",
        priority=50,
    ),
    "update_stock": ToolMeta(
        name="update_stock",
        category="inventory",
        trigger_intents=[],  # Admin only, not triggered by customer intents
        instruction="",
        priority=50,
    ),

    # -------------------------------------------------------------------------
    # PIPELINE/CRM TOOLS
    # -------------------------------------------------------------------------
    "save_contact": ToolMeta(
        name="save_contact",
        category="pipeline",
        trigger_intents=["contact_info_provided", "lead_capture"],
        instruction="Use save_contact quando o cliente fornecer informações de contato.",
        priority=40,
    ),
    "move_contact_stage": ToolMeta(
        name="move_contact_stage",
        category="pipeline",
        trigger_intents=["stage_change"],
        instruction="",
        priority=30,
    ),
    "get_contact_info": ToolMeta(
        name="get_contact_info",
        category="pipeline",
        trigger_intents=["contact_lookup"],
        instruction="Use get_contact_info para buscar dados de um contato existente.",
        priority=40,
    ),
    "qualify_lead": ToolMeta(
        name="qualify_lead",
        category="pipeline",
        trigger_intents=["qualification_complete"],
        instruction="Use qualify_lead após coletar informações de qualificação (BANT).",
        priority=40,
    ),

    # -------------------------------------------------------------------------
    # KANBAN/TASK TOOLS
    # -------------------------------------------------------------------------
    "create_task": ToolMeta(
        name="create_task",
        category="kanban",
        trigger_intents=["follow_up_request", "task_creation"],
        instruction="Use create_task para criar lembretes ou tarefas de acompanhamento.",
        priority=40,
    ),
    "update_task_status": ToolMeta(
        name="update_task_status",
        category="kanban",
        trigger_intents=["task_update"],
        instruction="",
        priority=30,
    ),
    "list_pending_tasks": ToolMeta(
        name="list_pending_tasks",
        category="kanban",
        trigger_intents=["task_inquiry"],
        instruction="Use list_pending_tasks para listar tarefas pendentes.",
        priority=40,
    ),

    # -------------------------------------------------------------------------
    # CORE TOOLS (always available)
    # -------------------------------------------------------------------------
    "handoff_to_human": ToolMeta(
        name="handoff_to_human",
        category="core",
        trigger_intents=["wants_human", "escalation_request"],
        instruction="Use handoff_to_human quando o cliente solicitar atendente humano.",
        priority=100,
    ),
    "flag_urgent": ToolMeta(
        name="flag_urgent",
        category="core",
        trigger_intents=["urgent_issue", "complaint"],
        instruction="Use flag_urgent para marcar conversas que precisam atenção imediata.",
        priority=90,
    ),
    "search_knowledge": ToolMeta(
        name="search_knowledge",
        category="core",
        trigger_intents=[],  # Used internally by RAG
        instruction="",
        priority=20,
    ),
}
