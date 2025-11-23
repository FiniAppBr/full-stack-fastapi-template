"""
Lead Tool - Capture and manage lead information.

Provides:
- collect_lead_info: Explicitly collect/confirm lead information
"""
from langchain_core.tools import tool


@tool
def collect_lead_info_tool(
    agent_id: int,
    customer_name: str = "",
    phone: str = "",
    email: str = "",
    interest: str = "",
    notes: str = ""
) -> str:
    """
    Collect and save lead information.

    Use this tool when:
    - Customer provides contact information
    - Confirming/saving lead details before handoff
    - Creating a lead record for follow-up

    Args:
        agent_id: The agent's ID (provided automatically)
        customer_name: Customer's name
        phone: Phone number if provided
        email: Email address if provided
        interest: What they're interested in
        notes: Any additional notes about the lead

    Returns:
        Confirmation of lead capture
    """
    # TODO: Implement actual lead capture
    # - Create/update lead record in database
    # - Associate with conversation
    # - Trigger any lead workflows

    collected = []
    if customer_name:
        collected.append(f"Name: {customer_name}")
    if phone:
        collected.append(f"Phone: {phone}")
    if email:
        collected.append(f"Email: {email}")
    if interest:
        collected.append(f"Interest: {interest}")

    if collected:
        return f"Lead information saved: {', '.join(collected)}"
    return "No lead information provided to save."
