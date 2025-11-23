"""
Knowledge Tool - RAG search over uploaded documents.

This is the primary tool for retrieving relevant business information
from the agent's knowledge base.
"""
from langchain_core.tools import tool

from app.agents.utils.knowledge import search_knowledge
from app.agents.utils.rag import build_knowledge_context


@tool
def search_knowledge_tool(query: str, agent_id: int) -> str:
    """
    Search the knowledge base for relevant information.

    Use this tool when you need to:
    - Answer questions about products, services, or prices
    - Find specific information the customer is asking about
    - Get details about business policies, hours, or procedures

    Args:
        query: The search query (customer's question or topic)
        agent_id: The agent's ID (provided automatically)

    Returns:
        Relevant information from the knowledge base, or a message
        indicating no relevant information was found.
    """
    try:
        result = search_knowledge(
            query=query,
            agent_id=agent_id,
            limit=5,
            similarity_threshold=0.6
        )

        chunks = result.get("chunks", [])

        if not chunks:
            return "No relevant information found in the knowledge base for this query."

        # Build formatted context
        context = build_knowledge_context(chunks, max_tokens=500)

        return context

    except Exception as e:
        return f"Error searching knowledge base: {str(e)}"
