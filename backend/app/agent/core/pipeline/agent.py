"""
Agent node - ReAct tool loop.

Single responsibility: Handle tool calls via ReAct pattern.
"""

from app.agent.core.state import GraphState
from app.agent.llm import get_chat_llm
from app.agent.tools.registry import get_enabled_tools
from app.agent.tools import get_tools_for_agent


MAX_REACT_ITERATIONS = 3


def agent_node(state: GraphState) -> dict:
    """
    ReAct agent - handles tool calls only.

    Response generation is handled separately by generate_node.
    This node only decides whether to call tools and executes the LLM
    with tools bound.

    Args:
        state: Current graph state with react_messages

    Returns:
        Updated state with new messages and token counts
    """
    print("-> [Node] Agent")

    config = state["config"]
    messages = state["react_messages"]
    iterations = state.get("react_iterations", 0)

    # Get available tools (NO SendResponse - that's handled by generate node)
    enabled_tool_names = get_enabled_tools(config.enabled_tool_categories)
    tools = get_tools_for_agent(enabled_tool_names)

    # If no tools or max iterations, skip to generate
    if not tools or iterations >= MAX_REACT_ITERATIONS:
        if iterations >= MAX_REACT_ITERATIONS:
            print(f"  Max iterations ({MAX_REACT_ITERATIONS}) reached")
        else:
            print("  No tools enabled, skipping to generate")
        return {"react_iterations": iterations}

    print(f"  Bound tools: {[t.name for t in tools]}")

    llm = get_chat_llm(
        model=config.generation.model,
        temperature=config.generation.temperature,
        max_tokens=config.generation.max_tokens,
    )
    llm_with_tools = llm.bind_tools(tools)

    response = llm_with_tools.invoke(messages)

    # Track tokens
    metadata = response.response_metadata if hasattr(response, "response_metadata") else {}
    usage = metadata.get("usage", metadata.get("token_usage", {}))
    input_tokens = usage.get("prompt_tokens", usage.get("input_tokens", 0))
    output_tokens = usage.get("completion_tokens", usage.get("output_tokens", 0))
    print(f"  Tokens: {input_tokens} in + {output_tokens} out")

    tokens_used = state.get("tokens_used", 0) + input_tokens + output_tokens
    tokens_in = state.get("tokens_in", 0) + input_tokens
    tokens_out = state.get("tokens_out", 0) + output_tokens

    has_tool_calls = hasattr(response, 'tool_calls') and response.tool_calls
    if has_tool_calls:
        print(f"  Tool calls: {[tc['name'] for tc in response.tool_calls]}")

    return {
        "react_messages": [response],
        "tokens_used": tokens_used,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "react_iterations": iterations + 1
    }
