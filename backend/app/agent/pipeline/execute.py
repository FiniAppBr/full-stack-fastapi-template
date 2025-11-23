"""
Execute Pipeline Stage - Tool execution.

Input: tool decisions from GENERATE
Output: tool results + gate updates
"""

from typing import Callable, Any

from app.agent.schema import Tool, ToolCall, ToolResult


# Tool registry - maps tool_id to implementation
_tool_registry: dict[str, Callable] = {}


def register_tool(tool_id: str, handler: Callable):
    """Register a tool handler function."""
    _tool_registry[tool_id] = handler


def execute(
    tool_calls: list[ToolCall],
    tools: list[Tool],
    gates: dict[str, bool]
) -> list[ToolResult]:
    """
    Execute tool calls.

    Args:
        tool_calls: List of tool calls from GENERATE stage
        tools: Tool definitions (for gate checking)
        gates: Current gate state (for permission checking)

    Returns:
        List of ToolResult with outcomes
    """
    print("-> Execute")

    if not tool_calls:
        print("  No tools to execute")
        return []

    # Build tool lookup
    tool_lookup = {t.id: t for t in tools}
    results = []

    for call in tool_calls:
        tool_def = tool_lookup.get(call.tool_id)

        if not tool_def:
            results.append(ToolResult(
                tool_id=call.tool_id,
                success=False,
                error=f"Tool '{call.tool_id}' not found"
            ))
            continue

        # Check gate permissions
        if not tool_def.can_execute(gates):
            results.append(ToolResult(
                tool_id=call.tool_id,
                success=False,
                error=f"Tool '{call.tool_id}' requires gates: {tool_def.requires_gates}"
            ))
            continue

        # Check confirmation requirement
        if tool_def.confirmation_required and not call.awaiting_confirmation:
            # Would normally ask user for confirmation
            results.append(ToolResult(
                tool_id=call.tool_id,
                success=False,
                error=f"Tool '{call.tool_id}' requires user confirmation"
            ))
            continue

        # Execute tool
        handler = _tool_registry.get(call.tool_id)
        if not handler:
            results.append(ToolResult(
                tool_id=call.tool_id,
                success=False,
                error=f"No handler registered for tool '{call.tool_id}'"
            ))
            continue

        try:
            result = handler(**call.arguments)
            results.append(ToolResult(
                tool_id=call.tool_id,
                success=True,
                result=str(result) if result else "Success",
                gate_updates=_get_gate_updates_for_tool(call.tool_id)
            ))
            print(f"  Executed '{call.tool_id}': Success")

        except Exception as e:
            results.append(ToolResult(
                tool_id=call.tool_id,
                success=False,
                error=str(e)
            ))
            print(f"  Executed '{call.tool_id}': Error - {e}")

    return results


def _get_gate_updates_for_tool(tool_id: str) -> dict[str, bool]:
    """
    Get gate updates triggered by tool execution.
    Some tools set gates when executed (e.g., link_sent after sending link).
    """
    # Map of tool_id -> gates to set
    tool_gate_map = {
        "send_link": {"link_sent": True},
        "offer_link": {"link_offered": True},
    }

    return tool_gate_map.get(tool_id, {})


# Default tool handlers (stubs)
def _stub_send_link(**kwargs):
    """Stub: Send purchase link."""
    return "Link sent successfully"


def _stub_send_video(**kwargs):
    """Stub: Send professor video."""
    return "Video sent successfully"


def _stub_handoff_human(**kwargs):
    """Stub: Transfer to human."""
    return "Transferred to human agent"


# Register default stubs
register_tool("send_link", _stub_send_link)
register_tool("send_video", _stub_send_video)
register_tool("handoff_human", _stub_handoff_human)
