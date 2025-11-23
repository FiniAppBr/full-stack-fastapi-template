"""
Webhook Tool - Custom user API calls (STUB).

Allows users to define custom API endpoints that the agent can call.
This enables integration with any external system.

STUB: Not implemented yet. Will be built when user demand requires it.
"""
from langchain_core.tools import tool


@tool
def call_webhook_tool(
    agent_id: int,
    webhook_name: str,
    payload: dict = None
) -> str:
    """
    Call a custom webhook defined by the user.

    Use this tool when:
    - Need to trigger an external action
    - Sending data to a user-defined API
    - Integration with external systems

    Args:
        agent_id: The agent's ID (provided automatically)
        webhook_name: Name of the configured webhook
        payload: Data to send to the webhook

    Returns:
        Response from the webhook or error message
    """
    # STUB: Not implemented
    return f"Webhook '{webhook_name}' is not configured. Please set up the webhook in your agent settings."
