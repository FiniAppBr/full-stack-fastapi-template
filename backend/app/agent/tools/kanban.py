"""
Kanban Tools - Task management for AI agents.

Provides LangGraph-compatible tools for:
- create_task: Create a follow-up or internal task
- update_task: Update task status or details
- list_tasks: List tasks by status/priority

These work with the internal ConnectAI task system.
Used for lead tracking, follow-ups, and internal tasks.
"""
from datetime import datetime, date, timedelta
from typing import Optional, Annotated

from langchain_core.tools import tool
from sqlmodel import Session, select

from app.core.db import engine
from app.models.scheduling import (
    Task, TaskCreate, TaskStatus, TaskPriority, TaskType
)


@tool
def create_task(
    title: Annotated[str, "Brief task title (e.g., 'Follow up with Maria about course')"],
    description: Annotated[str, "Detailed description of what needs to be done"] = "",
    task_type: Annotated[str, "Type: follow_up, lead, support, internal, other"] = "follow_up",
    priority: Annotated[str, "Priority: low, medium, high, urgent"] = "medium",
    due_days: Annotated[int, "Days from now until due (0=today, 1=tomorrow, etc)"] = 1,
    customer_name: Annotated[str, "Customer name if task is related to a customer"] = "",
    customer_phone: Annotated[str, "Customer phone for follow-up"] = "",
    customer_email: Annotated[str, "Customer email for follow-up"] = ""
) -> str:
    """
    Create a new task in the kanban board.

    Use this tool when:
    - Need to create a follow-up task for a lead
    - Customer requests something that needs human action
    - Recording an action item from the conversation
    - Creating a reminder for the team

    Returns confirmation with task details.
    """
    with Session(engine) as session:
        # Map string values to enums
        type_map = {
            "follow_up": TaskType.FOLLOW_UP,
            "lead": TaskType.LEAD,
            "support": TaskType.SUPPORT,
            "internal": TaskType.INTERNAL,
            "other": TaskType.OTHER
        }
        priority_map = {
            "low": TaskPriority.LOW,
            "medium": TaskPriority.MEDIUM,
            "high": TaskPriority.HIGH,
            "urgent": TaskPriority.URGENT
        }

        task_type_enum = type_map.get(task_type.lower(), TaskType.FOLLOW_UP)
        priority_enum = priority_map.get(priority.lower(), TaskPriority.MEDIUM)

        # Calculate due date
        due_date = date.today() + timedelta(days=due_days)

        # Create task
        task = Task(
            title=title,
            description=description or None,
            task_type=task_type_enum,
            priority=priority_enum,
            status=TaskStatus.TODO,
            due_date=due_date,
            customer_name=customer_name or None,
            customer_phone=customer_phone or None,
            customer_email=customer_email or None,
            source="agent"
        )

        session.add(task)
        session.commit()
        session.refresh(task)

        # Format priority display
        priority_emoji = {
            TaskPriority.LOW: "🟢",
            TaskPriority.MEDIUM: "🟡",
            TaskPriority.HIGH: "🟠",
            TaskPriority.URGENT: "🔴"
        }

        weekdays = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
        day_name = weekdays[due_date.weekday()]

        customer_info = ""
        if customer_name:
            customer_info = f"\n👤 Cliente: {customer_name}"
            if customer_phone:
                customer_info += f" ({customer_phone})"

        return f"""✅ **Tarefa criada**

{priority_emoji.get(priority_enum, '🟡')} **{title}**
📅 Para: {day_name}, {due_date.strftime('%d/%m/%Y')}
📋 Tipo: {task_type}{customer_info}

A equipe será notificada."""


@tool
def update_task_status(
    task_id: Annotated[int, "ID of the task to update"] = 0,
    task_title: Annotated[str, "Title of the task (if ID not known)"] = "",
    new_status: Annotated[str, "New status: todo, in_progress, blocked, done"] = "",
    notes: Annotated[str, "Additional notes to add"] = ""
) -> str:
    """
    Update an existing kanban task status.

    Use this tool when:
    - Task status needs to change
    - Adding notes to an existing task
    - Marking a task as complete

    Returns confirmation of update.
    """
    with Session(engine) as session:
        task = None

        # Find task by ID or title
        if task_id:
            task = session.get(Task, task_id)
        elif task_title:
            task = session.exec(
                select(Task)
                .where(Task.title.ilike(f"%{task_title}%"))
                .where(Task.is_active == True)
                .where(Task.status != TaskStatus.DONE)
                .order_by(Task.created_at.desc())
            ).first()

        if not task or not task.is_active:
            return "Não encontrei a tarefa. Verifique o ID ou título e tente novamente."

        # Update status if provided
        status_map = {
            "todo": TaskStatus.TODO,
            "in_progress": TaskStatus.IN_PROGRESS,
            "blocked": TaskStatus.BLOCKED,
            "done": TaskStatus.DONE
        }

        old_status = task.status.value
        updates = []

        if new_status:
            status_enum = status_map.get(new_status.lower())
            if status_enum:
                task.status = status_enum
                updates.append(f"Status: {old_status} → {new_status}")

                if status_enum == TaskStatus.DONE:
                    task.completed_at = datetime.utcnow()

        if notes:
            existing = task.description or ""
            timestamp = datetime.utcnow().strftime("%d/%m %H:%M")
            task.description = f"{existing}\n\n[{timestamp}] {notes}".strip()
            updates.append("Notas adicionadas")

        task.updated_at = datetime.utcnow()
        session.add(task)
        session.commit()

        if not updates:
            return "Nenhuma alteração foi feita. Especifique novo status ou notas."

        status_emoji = {
            TaskStatus.TODO: "📋",
            TaskStatus.IN_PROGRESS: "🔄",
            TaskStatus.BLOCKED: "⛔",
            TaskStatus.DONE: "✅"
        }

        return f"""{status_emoji.get(task.status, '📋')} **Tarefa atualizada**

**{task.title}**
{chr(10).join(f'• {u}' for u in updates)}"""


@tool
def list_pending_tasks(
    status: Annotated[str, "Filter by status: todo, in_progress, blocked (empty for all pending)"] = "",
    priority: Annotated[str, "Filter by priority: low, medium, high, urgent"] = "",
    limit: Annotated[int, "Maximum number of tasks to return"] = 5
) -> str:
    """
    List pending tasks from the kanban board.

    Use this tool when:
    - Need to check what tasks are pending
    - Looking for follow-up tasks
    - Reviewing workload

    Returns list of tasks matching criteria.
    """
    with Session(engine) as session:
        query = select(Task).where(Task.is_active == True)

        # Filter by status
        if status:
            status_map = {
                "todo": TaskStatus.TODO,
                "in_progress": TaskStatus.IN_PROGRESS,
                "blocked": TaskStatus.BLOCKED
            }
            status_enum = status_map.get(status.lower())
            if status_enum:
                query = query.where(Task.status == status_enum)
        else:
            # Default: all non-done tasks
            query = query.where(Task.status != TaskStatus.DONE)

        # Filter by priority
        if priority:
            priority_map = {
                "low": TaskPriority.LOW,
                "medium": TaskPriority.MEDIUM,
                "high": TaskPriority.HIGH,
                "urgent": TaskPriority.URGENT
            }
            priority_enum = priority_map.get(priority.lower())
            if priority_enum:
                query = query.where(Task.priority == priority_enum)

        # Order by priority (urgent first) then due date
        query = query.order_by(Task.priority.desc(), Task.due_date, Task.created_at)
        query = query.limit(limit)

        tasks = session.exec(query).all()

        if not tasks:
            return "Nenhuma tarefa pendente encontrada."

        # Format response
        priority_emoji = {
            TaskPriority.LOW: "🟢",
            TaskPriority.MEDIUM: "🟡",
            TaskPriority.HIGH: "🟠",
            TaskPriority.URGENT: "🔴"
        }
        status_emoji = {
            TaskStatus.TODO: "📋",
            TaskStatus.IN_PROGRESS: "🔄",
            TaskStatus.BLOCKED: "⛔"
        }

        lines = [f"**Tarefas pendentes ({len(tasks)}):**\n"]

        for task in tasks:
            due_str = ""
            if task.due_date:
                days_until = (task.due_date - date.today()).days
                if days_until < 0:
                    due_str = f" (⚠️ atrasado {-days_until}d)"
                elif days_until == 0:
                    due_str = " (hoje)"
                elif days_until == 1:
                    due_str = " (amanhã)"
                else:
                    due_str = f" ({task.due_date.strftime('%d/%m')})"

            p_emoji = priority_emoji.get(task.priority, "🟡")
            s_emoji = status_emoji.get(task.status, "📋")

            lines.append(f"{p_emoji}{s_emoji} **{task.title}**{due_str}")
            if task.customer_name:
                lines.append(f"   👤 {task.customer_name}")

        return "\n".join(lines)


# Export all tools
KANBAN_TOOLS = [
    create_task,
    update_task_status,
    list_pending_tasks,
]
