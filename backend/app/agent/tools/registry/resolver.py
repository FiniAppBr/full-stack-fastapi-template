"""
Tool Resolver - Functions to resolve tools based on intents and categories.
"""

from .definitions import TOOL_METADATA
from .categories import TOOL_CATEGORIES


def get_tools_by_category(category: str) -> list[str]:
    """Get all tool names in a category."""
    return [
        meta.name for meta in TOOL_METADATA.values()
        if meta.category == category
    ]


def get_enabled_tools(enabled_categories: list[str]) -> list[str]:
    """
    Get all tool names that should be enabled based on categories.

    Args:
        enabled_categories: List of category names to enable

    Returns:
        List of tool names that should be available
    """
    tools = []

    for cat_id, cat_info in TOOL_CATEGORIES.items():
        if cat_info.get("always_enabled") or cat_id in enabled_categories:
            tools.extend(get_tools_by_category(cat_id))

    return list(set(tools))


def get_tool_instructions_for_intents(
    intents: list[str],
    enabled_categories: list[str]
) -> str:
    """
    Get tool usage instructions based on detected intents and enabled categories.

    Args:
        intents: List of detected intents from extraction
        enabled_categories: List of enabled tool categories for this agent

    Returns:
        Formatted instruction string for the generation prompt
    """
    enabled_tools = get_enabled_tools(enabled_categories)

    # Find matching tools
    matching: list[tuple[int, str]] = []

    for tool_name in enabled_tools:
        meta = TOOL_METADATA.get(tool_name)
        if not meta or not meta.instruction:
            continue

        if any(intent in meta.trigger_intents for intent in intents):
            matching.append((meta.priority, meta.instruction))

    if not matching:
        return ""

    # Sort by priority (highest first)
    matching.sort(key=lambda x: -x[0])
    instructions = [inst for _, inst in matching]

    return "\n".join(f"• {inst}" for inst in instructions)


def get_available_tools_summary(enabled_categories: list[str]) -> str:
    """
    Get a summary of available tools for the agent prompt.
    """
    lines = []

    for cat_id in enabled_categories:
        if cat_id not in TOOL_CATEGORIES:
            continue

        cat_info = TOOL_CATEGORIES[cat_id]
        tools = get_tools_by_category(cat_id)

        if tools:
            tool_list = ", ".join(tools)
            lines.append(f"• {cat_info['name']}: {tool_list}")

    # Always include core
    core_tools = get_tools_by_category("core")
    if core_tools:
        lines.append(f"• Core: {', '.join(core_tools)}")

    return "\n".join(lines) if lines else "Nenhuma ferramenta habilitada."
