"""
Kanban Tools - Internal task/lead management.

Provides:
- create_task: Create a new kanban task
- update_task: Update existing task status

These work with the internal ConnectAI kanban system.
Used for lead tracking, follow-ups, and internal tasks.
"""
from langchain_core.tools import tool


@tool
def create_task_tool(
    agent_id: int,
    title: str,
    description: str = "",
    priority: str = "medium",
    due_date: str = "",
    task_type: str = "follow_up"
) -> str:
    """
    Create a new task in the kanban board.

    Use this tool when:
    - Need to create a follow-up task for a lead
    - Customer requests something that needs human action
    - Recording an action item from the conversation

    Args:
        agent_id: The agent's ID (provided automatically)
        title: Task title (brief description)
        description: Detailed task description
        priority: Task priority - "low", "medium", "high", "urgent"
        due_date: When task is due (YYYY-MM-DD format)
        task_type: Type of task - "follow_up", "lead", "support", "other"

    Returns:
        Confirmation of task creation
    """
    # TODO: Implement actual task creation
    # - Create task record in kanban table
    # - Assign to appropriate team member
    # - Set status to "todo"

    # Stub response
    return f"Task created: '{title}' (Priority: {priority})"


@tool
def update_task_tool(
    agent_id: int,
    task_id: str = "",
    task_title: str = "",
    new_status: str = "",
    notes: str = ""
) -> str:
    """
    Update an existing kanban task.

    Use this tool when:
    - Task status needs to change
    - Adding notes to an existing task
    - Marking a task as complete

    Args:
        agent_id: The agent's ID (provided automatically)
        task_id: Task ID if known
        task_title: Task title to search for if ID unknown
        new_status: New status - "todo", "in_progress", "done", "blocked"
        notes: Additional notes to add to task

    Returns:
        Confirmation of task update
    """
    # TODO: Implement actual task update
    # - Find task by ID or title
    # - Update status and/or notes
    # - Log the change

    # Stub response
    if new_status:
        return f"Task updated to: {new_status}"
    return "Task notes updated"
