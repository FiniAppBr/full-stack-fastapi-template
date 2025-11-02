"""
LangGraph test endpoints
"""

from typing import Any
from fastapi import APIRouter

from app.langgraph.moveis_agent import create_moveis_graph

router = APIRouter()


@router.post("/moveis/chat")
async def test_moveis_chat(message: str) -> Any:
    """
    Test endpoint for móveis agent using LangGraph.

    Example:
    curl -X POST "http://localhost:5460/api/v1/langgraph-test/moveis/chat?message=Oi,%20quero%20ver%20sofás"
    """
    # Create graph
    graph = create_moveis_graph()

    # Initial state
    initial_state = {
        "messages": [{"role": "user", "content": message}],
        "budget_range": "unknown",
        "lead_quality": "browser",
        "contact_captured": "none",
        "catalogue_requested": "no",
        "competitor_mentioned": "no",
        "consultation_interest": "not_offered"
    }

    # Run graph
    result = graph.invoke(initial_state)

    # Return response
    return {
        "message": message,
        "response": result.get("response", ""),
        "state": {
            "budget_range": result.get("budget_range"),
            "lead_quality": result.get("lead_quality"),
            "validation_passed": result.get("validation_passed"),
            "excluded_tags": result.get("excluded_tags")
        }
    }
