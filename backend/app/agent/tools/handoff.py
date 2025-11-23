"""
Handoff Tools - Transfer conversations to humans.

Provides:
- handoff_to_human: Transfer conversation to human agent
- flag_urgent: Mark conversation as needing urgent attention
"""
from langchain_core.tools import tool
from sqlmodel import Session, select

from app.core.db import engine
from app.models.conversation_log import ConversationLog


def update_conversation_handoff(
    customer_id: str,
    agent_id: int,
    requires_handoff: bool = True,
    urgency: str = "normal",
    reason: str = ""
) -> bool:
    """
    Update conversation log with handoff status.

    Args:
        customer_id: Customer identifier
        agent_id: Agent ID
        requires_handoff: Whether handoff is needed
        urgency: Priority level
        reason: Reason for handoff/urgency

    Returns:
        True if updated successfully
    """
    try:
        with Session(engine) as session:
            # Find most recent conversation for this customer+agent
            statement = (
                select(ConversationLog)
                .where(ConversationLog.customer_id == customer_id)
                .where(ConversationLog.agent_id == str(agent_id))
                .order_by(ConversationLog.created_at.desc())
                .limit(1)
            )
            log = session.exec(statement).first()

            if log:
                log.requires_handoff = requires_handoff
                log.urgency = urgency
                session.add(log)
                session.commit()
                return True

        return False
    except Exception as e:
        print(f"Error updating handoff status: {e}")
        return False


@tool
def handoff_to_human(reason: str) -> str:
    """
    Transfer this conversation to a human agent.

    Use this tool when:
    - Customer is frustrated, angry, or upset
    - Question is too complex to answer
    - Customer explicitly requests human assistance
    - Situation requires human judgment (legal, medical, financial advice)
    - You've failed to help after multiple attempts

    Args:
        reason: Why the handoff is needed (e.g., "customer frustrated", "complex question")

    Returns:
        Confirmation message about the handoff
    """
    # The graph will intercept this result and set state.requires_handoff = True
    return f"[HANDOFF:{reason}] A human agent will be notified to take over this conversation."


@tool
def flag_urgent(reason: str) -> str:
    """
    Flag this conversation as urgent for priority handling.

    Use this tool when:
    - Customer mentions emergency or urgent need
    - Time-sensitive situation (event today, deadline approaching)
    - VIP customer or high-value opportunity
    - Complaint that could escalate

    This does NOT transfer to a human, but marks for priority attention.

    Args:
        reason: Why this is urgent

    Returns:
        Confirmation that the conversation has been flagged
    """
    # The graph will intercept this result and set state.urgency = "urgent"
    return f"[URGENT:{reason}] This conversation has been marked as high priority."


def process_tool_results(tool_results: list[str], state: dict) -> dict:
    """
    Process tool results and extract state updates.

    Called by the graph after tool execution to update state
    based on special markers in tool outputs.

    Args:
        tool_results: List of tool output strings
        state: Current conversation state

    Returns:
        State updates to apply
    """
    updates = {}

    for result in tool_results:
        if not isinstance(result, str):
            continue

        # Check for handoff marker
        if "[HANDOFF:" in result:
            updates["requires_handoff"] = True
            start = result.find("[HANDOFF:") + 9
            end = result.find("]", start)
            if end > start:
                updates["handoff_reason"] = result[start:end]

        # Check for urgent marker
        if "[URGENT:" in result:
            updates["urgency"] = "urgent"
            start = result.find("[URGENT:") + 8
            end = result.find("]", start)
            if end > start and not updates.get("handoff_reason"):
                updates["handoff_reason"] = result[start:end]

    return updates
