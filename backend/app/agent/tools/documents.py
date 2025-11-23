"""
Documents Tool - Send documents to customers.

Provides:
- send_document: Send a document (PDF, image, etc.) to the customer
"""
from langchain_core.tools import tool


@tool
def send_document_tool(
    agent_id: int,
    document_type: str,
    document_name: str = ""
) -> str:
    """
    Send a document to the customer.

    Use this tool when:
    - Customer asks for a menu, catalog, or price list
    - Need to share a PDF or document
    - Customer asks for more information that's in a document

    Args:
        agent_id: The agent's ID (provided automatically)
        document_type: Type of document - "menu", "catalog", "price_list", "portfolio", etc.
        document_name: Specific document name if known

    Returns:
        Confirmation that document was sent or error if not found
    """
    # TODO: Implement actual document sending
    # - Look up document by type/name for agent
    # - Get document URL
    # - Return URL or send via messaging platform

    # Stub response
    return f"Sending {document_type} document now..."
