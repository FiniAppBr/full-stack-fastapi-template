"""
LangGraph implementation of Móveis Premium agent
Uses dynamic state schema based on response_schema
"""

from typing import TypedDict, Optional, List, Annotated
from langgraph.graph import StateGraph, END
import operator


# Dynamic state schema for móveis agent
class MoveisAgentState(TypedDict):
    """State schema for móveis agent - matches response_schema from DB"""
    messages: Annotated[List[dict], operator.add]  # LangGraph requires messages
    budget_range: Optional[str]  # "unknown", "under_5k", "5k_to_20k", "20k_plus"
    lead_quality: Optional[str]  # "browser", "warm", "hot"
    contact_captured: Optional[str]  # "none", "email_only", "phone_only", "both"
    catalogue_requested: Optional[str]  # "yes", "no"
    competitor_mentioned: Optional[str]  # "yes", "no"
    consultation_interest: Optional[str]  # "yes", "no", "not_offered"
    # Internal processing fields
    excluded_tags: Optional[List[str]]  # Tags to exclude from RAG
    rag_context: Optional[str]  # Context from RAG search
    response: Optional[str]  # Generated response
    validation_passed: Optional[bool]  # Validation result
    validation_message: Optional[str]  # Validation message


# Node 1: Extract State
def extract_state_node(state: MoveisAgentState) -> MoveisAgentState:
    """
    Extracts structured fields from latest message using OpenAI structured outputs.
    Updates state with extracted values.
    """
    # TODO: Implement OpenAI structured outputs extraction
    # For now, just pass through
    print("→ Extract State Node")
    return state


# Node 2: Apply Gating
def apply_gating_node(state: MoveisAgentState) -> dict:
    """
    Applies gating rules based on current state.
    Determines which knowledge tags to exclude from RAG search.
    """
    print("→ Apply Gating Node")

    excluded_tags = []

    # Gating Rule 1: Don't show prices until budget is known
    if state.get("budget_range") == "unknown":
        excluded_tags.append("pricing")
        print("  ✓ Gating: Excluding pricing (budget unknown)")

    # Gating Rule 2: Don't waste time on premium products for low budget
    if state.get("budget_range") == "under_5k":
        excluded_tags.append("premium_products")
        print("  ✓ Gating: Excluding premium products (budget under_5k)")

    # Return state updates
    return {"excluded_tags": excluded_tags}


# Node 3: RAG Search
def rag_search_node(state: MoveisAgentState) -> dict:
    """
    Searches knowledge base with filtered tags.
    """
    print("→ RAG Search Node")
    excluded_tags = state.get("excluded_tags", [])
    print(f"  Searching with excluded tags: {excluded_tags}")

    # TODO: Implement actual RAG search
    # For now, mock response
    return {"rag_context": "Mock RAG context"}


# Node 4: Generate Response
def generate_response_node(state: MoveisAgentState) -> dict:
    """
    Generates response using LLM with RAG context and state.
    """
    print("→ Generate Response Node")

    # TODO: Implement actual OpenAI call with:
    # - System prompt (agent instructions)
    # - RAG context
    # - Current state
    # - Conversation history

    # Mock response for now
    return {"response": "Oi! Como posso ajudar com móveis hoje?"}


# Node 5: Validation
def validate_node(state: MoveisAgentState) -> dict:
    """
    Validates response against validation rules.
    Returns validation status.
    """
    print("→ Validation Node")

    response = state.get("response", "")

    # Validation Rule 1: Don't show prices if budget unknown
    if state.get("budget_range") == "unknown":
        if "R$" in response or "reais" in response:
            print("  ✗ Validation failed: Prices mentioned but budget unknown")
            return {
                "validation_passed": False,
                "validation_message": "Removing prices - budget not qualified yet"
            }

    # Validation Rule 2: Don't send catalogue if not requested
    if state.get("catalogue_requested") == "no":
        # TODO: Check if media contains catalogue.pdf
        pass

    print("  ✓ Validation passed")
    return {"validation_passed": True}


# Conditional edge: Route after validation
def route_after_validation(state: MoveisAgentState) -> str:
    """
    Determines next node after validation.
    - If validation passed → "end"
    - If validation failed → retry generate_response (max 2 attempts)
    """
    validation_passed = state.get("validation_passed", False)
    print(f"  → Routing: validation_passed={validation_passed}")

    if validation_passed:
        print("  → Going to END")
        return "end"
    else:
        print("  → Retrying generate_response")
        # TODO: Implement retry counter
        return "generate_response"  # Retry


# Build the graph
def create_moveis_graph():
    """Creates and compiles the móveis agent graph."""

    # Create StateGraph with móveis state schema
    graph = StateGraph(MoveisAgentState)

    # Add nodes
    graph.add_node("extract_state", extract_state_node)
    graph.add_node("apply_gating", apply_gating_node)
    graph.add_node("rag_search", rag_search_node)
    graph.add_node("generate_response", generate_response_node)
    graph.add_node("validate", validate_node)

    # Add edges (fixed pipeline)
    graph.set_entry_point("extract_state")
    graph.add_edge("extract_state", "apply_gating")
    graph.add_edge("apply_gating", "rag_search")
    graph.add_edge("rag_search", "generate_response")
    graph.add_edge("generate_response", "validate")

    # Add conditional edge after validation
    graph.add_conditional_edges(
        "validate",
        route_after_validation,
        {
            "end": END,
            "generate_response": "generate_response"  # Retry if validation fails
        }
    )

    # TODO: Add PostgreSQL checkpointer
    # checkpointer = PostgresCheckpointer(connection_string)
    # return graph.compile(checkpointer=checkpointer)

    return graph.compile()


# Test function
def test_moveis_agent():
    """Test the móveis agent graph."""
    graph = create_moveis_graph()

    # Test input
    initial_state = {
        "messages": [{"role": "user", "content": "Oi, quero ver sofás"}],
        "budget_range": "unknown",  # Not yet qualified
        "lead_quality": "browser",
        "contact_captured": "none",
        "catalogue_requested": "no",
        "competitor_mentioned": "no",
        "consultation_interest": "not_offered"
    }

    print("\n" + "="*60)
    print("Testing Móveis Agent Graph")
    print("="*60)

    # Run the graph
    result = graph.invoke(initial_state)

    print("\n" + "="*60)
    print("Final State:")
    print("="*60)
    for key, value in result.items():
        if key != "messages":  # Skip messages for brevity
            print(f"  {key}: {value}")

    return result


if __name__ == "__main__":
    test_moveis_agent()
