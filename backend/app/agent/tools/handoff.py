"""
Handoff Tools - Transfer conversations to humans.

Provides:
- handoff_to_human: Transfer conversation to human agent
- flag_urgent: Mark conversation as needing urgent attention
"""
from langchain_core.tools import tool


@tool
def handoff_to_human_tool(reason: str, summary: str = "") -> str:
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
        summary: Brief summary of the conversation and customer's need

    Returns:
        Confirmation message about the handoff
    """
    # TODO: Implement actual handoff logic
    # - Create handoff record in database
    # - Notify human agents (Slack, email, etc.)
    # - Update conversation status

    return f"Handoff initiated. Reason: {reason}. A human agent will take over shortly."


@tool
def flag_urgent_tool(reason: str) -> str:
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
    # TODO: Implement actual flagging logic
    # - Update conversation priority in database
    # - Send notification to appropriate channel

    return f"Conversation flagged as urgent. Reason: {reason}. Priority handling enabled."
