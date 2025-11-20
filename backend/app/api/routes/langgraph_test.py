"""
LangGraph test endpoints
"""

from typing import Any
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api.deps import get_db
from app.models.agent import Agent
from app.langgraph.moveis_agent import create_moveis_graph, split_response_from_state

router = APIRouter()


@router.post("/moveis/chat")
async def test_moveis_chat(
    message: str,
    agent_id: int = 5,  # Default to moveis agent
    db: Session = Depends(get_db)
) -> Any:
    """
    Test endpoint for móveis agent using LangGraph with multi-turn support.

    Example:
    curl -X POST "http://localhost:5460/api/v1/langgraph-test/moveis/chat?message=ola"
    """
    # Load agent config from DB
    agent = db.get(Agent, agent_id)
    multi_turn_config = agent.multi_turn_config if agent else {"enabled": False}

    # Create graph
    graph = create_moveis_graph()

    # Initial state (include multi_turn_config)
    initial_state = {
        "messages": [{"role": "user", "content": message}],
        "budget_range": "unknown",
        "lead_quality": "browser",
        "contact_captured": "none",
        "catalogue_requested": "no",
        "competitor_mentioned": "no",
        "consultation_interest": "not_offered",
        "multi_turn_config": multi_turn_config
    }

    # Run graph
    result = graph.invoke(initial_state)

    # Split response if multi-turn enabled
    messages = split_response_from_state(result)

    # Return response (both array and single string for backward compat)
    return {
        "message": message,
        "messages": messages,  # Array of split messages
        "response": " ".join(messages) if messages else "",  # Backward compatibility
        "state": {
            "budget_range": result.get("budget_range"),
            "lead_quality": result.get("lead_quality"),
            "validation_passed": result.get("validation_passed"),
            "excluded_tags": result.get("excluded_tags")
        }
    }
