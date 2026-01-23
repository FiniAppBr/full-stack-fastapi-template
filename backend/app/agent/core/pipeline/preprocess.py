"""
Preprocess node - Date/time normalization before LLM processing.

Single responsibility: Normalize dates and times from user messages.
"""

from app.agent.core.state import GraphState
from app.agent.core.preprocessing import preprocess_message


def preprocess_node(state: GraphState) -> dict:
    """
    Normalize dates and times BEFORE LLM processing.

    This catches patterns like:
    - "sábado" → "2025-12-06"
    - "amanhã às 10h" → date + time

    All other data extraction (names, pet info, etc.) is handled by the LLM.

    Args:
        state: Current graph state with message

    Returns:
        Updated state with preprocessed results and normalized data in agent_state
    """
    print("-> [Node] Preprocess")

    message = state["message"]
    agent_state = state["agent_state"]

    # Run preprocessing (only date/time normalization)
    preprocessed = preprocess_message(message)

    if preprocessed:
        print(f"  Extracted: {preprocessed}")

        # Inject normalized date into collected_data for tools to use
        if "normalized_date" in preprocessed:
            agent_state.update_collected_data("_normalized_date", preprocessed["normalized_date"])
            print(f"  Date normalized: {preprocessed['normalized_date']}")

        if "normalized_time" in preprocessed:
            agent_state.update_collected_data("_normalized_time", preprocessed["normalized_time"])
            print(f"  Time normalized: {preprocessed['normalized_time']}")
    else:
        print("  No preprocessing matches")

    return {
        "preprocessed": preprocessed,
        "agent_state": agent_state
    }
