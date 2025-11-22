"""
Dynamic state class generation for LangGraph agents.
"""
from typing import TypedDict, Optional, List, Annotated, Type
import operator


def generate_state_class(agent_id: int, response_schema: dict) -> Type[TypedDict]:
    """
    Dynamically generate a TypedDict state class from agent's response_schema.

    Args:
        agent_id: Agent identifier for unique class name
        response_schema: Dict like {"budget_range": ["unknown", "low", "high"], ...}

    Returns:
        TypedDict class for LangGraph state
    """
    base_fields = {
        # Core identifiers
        "messages": Annotated[List[dict], operator.add],
        "customer_id": str,
        "agent_id": int,
        "turn_count": int,
        "conversation_ended": bool,
        # Processing fields
        "excluded_tags": Optional[List[str]],
        "rag_context": Optional[str],
        "response": Optional[str],
        "validation_passed": Optional[bool],
        "validation_message": Optional[str],
        # Response metadata
        "sentiment": Optional[str],
        "urgency": Optional[str],
        "requires_handoff": bool,
        # Config
        "multi_turn_config": Optional[dict],
        "response_schema": Optional[dict],
        # Token usage
        "tokens_used": Optional[dict],
    }

    # Add custom fields from response_schema
    if response_schema:
        for field_name in response_schema.keys():
            base_fields[field_name] = Optional[str]

    state_class = TypedDict(
        f"Agent{agent_id}State",
        base_fields
    )

    return state_class
