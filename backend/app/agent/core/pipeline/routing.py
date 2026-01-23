"""
Routing functions for the agent pipeline graph.

Single responsibility: Decide which node to route to next.
"""

from app.agent.core.state import GraphState


MAX_REACT_ITERATIONS = 3
MAX_VALIDATION_RETRIES = 2


def should_continue_after_agent(state: GraphState) -> str:
    """
    Route after agent node: tools if called, else extract_data.

    Args:
        state: Current graph state

    Returns:
        "tools" if agent called tools, "extract_data" otherwise
    """
    messages = state.get("react_messages", [])

    if not messages:
        return "extract_data"

    last_message = messages[-1]

    # If agent called tools, execute them
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "tools"

    # No tool calls → proceed to extraction
    return "extract_data"


def should_continue_after_tools(state: GraphState) -> str:
    """
    Route after tools node: back to agent or proceed to extract_data.

    Args:
        state: Current graph state

    Returns:
        "agent" for more tool calls, "extract_data" to proceed
    """
    iterations = state.get("react_iterations", 0)

    if iterations >= MAX_REACT_ITERATIONS:
        return "extract_data"

    # Go back to agent to potentially call more tools or finish
    return "agent"


def should_retry_generation(state: GraphState) -> str:
    """
    Route after validation: retry generation or proceed to post_process.

    Args:
        state: Current graph state

    Returns:
        "generate" to retry, "post_process" to proceed
    """
    if state.get("validation_passed", True):
        return "post_process"

    retry_count = state.get("retry_count", 0)

    if retry_count >= MAX_VALIDATION_RETRIES:
        print(f"  Max retries ({MAX_VALIDATION_RETRIES}) reached, proceeding anyway")
        return "post_process"

    print(f"  Retrying generation (attempt {retry_count + 1}/{MAX_VALIDATION_RETRIES})")
    return "generate"
