"""
Tools node - Execute tool calls from agent.

Single responsibility: Execute tools and return results.
"""

import json

from langchain_core.messages import ToolMessage

from app.agent.core.state import GraphState
from app.agent.tools.registry import get_enabled_tools
from app.agent.tools import get_tools_for_agent


def tools_node(state: GraphState) -> dict:
    """
    Execute tools called by the agent.

    Features:
    - Caches check_availability results to avoid redundant calls
    - Enhanced error handling with recovery hints
    - Injects normalized date from preprocessing if tool needs it

    Args:
        state: Current graph state with tool calls in react_messages

    Returns:
        Updated state with tool results as ToolMessages
    """
    print("-> [Node] Tools")

    config = state["config"]
    agent_state = state["agent_state"]
    messages = state["react_messages"]
    last_message = messages[-1]

    if not hasattr(last_message, 'tool_calls') or not last_message.tool_calls:
        return {}

    enabled_tool_names = get_enabled_tools(config.enabled_tool_categories)
    tools = get_tools_for_agent(enabled_tool_names)
    tool_map = {tool.name: tool for tool in tools}

    tool_messages = []
    tool_calls_made = state.get("tool_calls_made", [])
    cached_results = state.get("cached_tool_results", {}) or {}

    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"].copy()  # Copy to avoid mutation

        # Inject normalized date if available and tool expects it
        if tool_name in ["check_availability", "book_appointment"]:
            if "preferred_date" in tool_args or "booking_date" in tool_args:
                date_key = "preferred_date" if "preferred_date" in tool_args else "booking_date"
                date_value = tool_args.get(date_key, "")
                # Check if it's not already in YYYY-MM-DD format
                if date_value and not (len(date_value) == 10 and date_value[4] == "-"):
                    normalized = agent_state.collected_data.get("_normalized_date")
                    if normalized:
                        print(f"  Injecting normalized date: {date_value} → {normalized}")
                        tool_args[date_key] = normalized

        # Check cache for check_availability (avoid redundant calls)
        cache_key = f"{tool_name}:{json.dumps(tool_args, sort_keys=True)}"
        if tool_name == "check_availability" and cache_key in cached_results:
            print(f"  Cache hit: {tool_name}")
            cached_result = cached_results[cache_key]
            tool_messages.append(
                ToolMessage(content=cached_result, tool_call_id=tool_call["id"])
            )
            tool_calls_made.append({
                "tool": tool_name,
                "args": tool_args,
                "result": "(cached) " + cached_result[:200],
                "success": True,
                "cached": True
            })
            continue

        print(f"  Executing: {tool_name}({tool_args})")

        tool = tool_map.get(tool_name)
        if tool:
            try:
                result = tool.invoke(tool_args)
                result_str = str(result)
                tool_messages.append(
                    ToolMessage(content=result_str, tool_call_id=tool_call["id"])
                )
                tool_calls_made.append({
                    "tool": tool_name,
                    "args": tool_args,
                    "result": result_str[:500],
                    "success": True
                })
                # Cache check_availability results
                if tool_name == "check_availability":
                    cached_results[cache_key] = result_str
                    print(f"  Cached result for: {cache_key[:50]}...")

            except Exception as e:
                error_msg = f"Error: {str(e)}\nTente novamente com parâmetros corrigidos."
                tool_messages.append(
                    ToolMessage(content=error_msg, tool_call_id=tool_call["id"])
                )
                tool_calls_made.append({
                    "tool": tool_name,
                    "args": tool_args,
                    "result": error_msg,
                    "success": False
                })
        else:
            tool_messages.append(
                ToolMessage(content=f"Tool {tool_name} not found", tool_call_id=tool_call["id"])
            )

    return {
        "react_messages": tool_messages,
        "tool_calls_made": tool_calls_made,
        "cached_tool_results": cached_results
    }
