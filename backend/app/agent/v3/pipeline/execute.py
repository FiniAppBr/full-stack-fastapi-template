"""
v3 Execute Pipeline - Execute tools/actions based on LLM response.

This stage analyzes the generated response and determines if any tools
should be executed (booking, task creation, contact saving, etc.)

Input: config + state + generated response + message
Output: ExecuteResult (tool calls, tool outputs)
"""

import re
from typing import Optional
from pydantic import BaseModel, Field

from app.agent.v3.schema import AgentState, GenerateResult
from app.agent.v3.config import BaseAgentConfig
from app.agent.tools import TOOL_REGISTRY


class ToolCall(BaseModel):
    """A tool call that was executed."""
    tool_id: str
    arguments: dict = Field(default_factory=dict)
    result: str = ""
    success: bool = True


class ExecuteResult(BaseModel):
    """Result of tool execution stage."""
    tool_calls: list[ToolCall] = Field(default_factory=list)
    should_append_to_response: bool = False  # Whether tool results should be shown to user


# Patterns that indicate tool execution should happen
TOOL_TRIGGERS = {
    # Calendar tools
    "check_availability": [
        r"horários?\s*(disponíve|livr)",
        r"disponibilidade",
        r"quando\s+(posso|podemos)",
        r"agendar\s+para\s+quando",
    ],
    "book_appointment": [
        r"agend(ado|amento)\s+confirmado",
        r"✅.*agend",
        r"reserv(ado|ei)",
        r"marcado\s+para",
    ],
    # Kanban tools
    "create_task": [
        r"vou\s+criar\s+uma?\s+tarefa",
        r"tarefa\s+criada",
        r"✅.*tarefa",
        r"anotei\s+para\s+follow",
    ],
    # Pipeline tools
    "save_contact": [
        r"salvei\s+(seu|o)\s+contato",
        r"contato\s+salvo",
        r"✅.*contato",
        r"anotei\s+(seu|o)\s+(nome|telefone|email)",
    ],
    # Inventory tools
    "check_stock": [
        r"em\s+estoque",
        r"disponível.*unidades?",
        r"temos\s+\d+",
        r"quantidade\s+disponível",
    ],
    "reserve_stock": [
        r"reserv(ado|ei).*estoque",
        r"✅.*reserva",
        r"separei\s+para\s+você",
    ],
}


def detect_tool_intent(
    config: BaseAgentConfig,
    state: AgentState,
    message: str,
    generated: GenerateResult
) -> list[str]:
    """
    Detect which tools should be executed based on context.

    Analyzes:
    1. User message patterns
    2. Generated response patterns
    3. Agent's enabled tools

    Returns list of tool IDs that should be executed.
    """
    tools_to_execute = []
    enabled_tools = set(config.enabled_actions)

    # Check user message for intent
    message_lower = message.lower()

    # Check generated response for tool execution markers
    response_text = " ".join(generated.messages).lower()

    for tool_id, patterns in TOOL_TRIGGERS.items():
        if tool_id not in enabled_tools:
            continue

        for pattern in patterns:
            # Check both message and response
            if re.search(pattern, message_lower) or re.search(pattern, response_text):
                if tool_id not in tools_to_execute:
                    tools_to_execute.append(tool_id)
                break

    return tools_to_execute


def extract_tool_arguments(
    tool_id: str,
    message: str,
    generated: GenerateResult,
    state: AgentState
) -> dict:
    """
    Extract arguments for a tool from context.

    This is a simplified extraction - a full implementation would
    use structured extraction from the LLM.
    """
    args = {}
    response_text = " ".join(generated.messages)

    if tool_id == "check_availability":
        # Try to extract service/professional name from context
        # For now, use defaults
        args = {"days_to_check": 3}

    elif tool_id == "book_appointment":
        # Extract date/time from response
        # This is simplified - would need proper date parsing
        args = {}

    elif tool_id == "create_task":
        # Extract task title from response
        # Look for patterns like "criar tarefa: X" or "follow-up com Y"
        match = re.search(r"tarefa[:\s]+(.+?)(?:\.|$)", response_text, re.I)
        if match:
            args["title"] = match.group(1).strip()[:100]
        else:
            args["title"] = f"Follow-up: {message[:50]}"
        args["task_type"] = "follow_up"
        args["priority"] = "medium"
        args["due_days"] = 1

    elif tool_id == "save_contact":
        # Extract contact info from traits
        traits = state.traits
        args["name"] = traits.get("name", "")
        args["phone"] = traits.get("phone", "")
        args["email"] = traits.get("email", "")
        args["interest"] = traits.get("interest", "")

    elif tool_id == "check_stock":
        # Extract product name from message
        args["product_name"] = ""  # Would need extraction

    return args


def execute_tool(tool_id: str, arguments: dict) -> ToolCall:
    """
    Execute a single tool and return the result.
    """
    tool = TOOL_REGISTRY.get(tool_id)

    if not tool:
        return ToolCall(
            tool_id=tool_id,
            arguments=arguments,
            result=f"Tool '{tool_id}' not found",
            success=False
        )

    try:
        # Execute the LangChain tool
        result = tool.invoke(arguments)

        return ToolCall(
            tool_id=tool_id,
            arguments=arguments,
            result=str(result),
            success=True
        )
    except Exception as e:
        return ToolCall(
            tool_id=tool_id,
            arguments=arguments,
            result=f"Error: {str(e)}",
            success=False
        )


def execute(
    config: BaseAgentConfig,
    state: AgentState,
    message: str,
    generated: GenerateResult,
) -> ExecuteResult:
    """
    Execute tools based on conversation context.

    This is an automatic tool execution stage that:
    1. Detects tool intent from user message and LLM response
    2. Extracts arguments from context
    3. Executes enabled tools
    4. Returns results

    For now, this is a simple pattern-based detector.
    Future: Use tool_calls from LLM with function calling.

    Args:
        config: Agent configuration
        state: Current conversation state
        message: User's message
        generated: LLM generated response

    Returns:
        ExecuteResult with tool calls and outputs
    """
    print("-> Execute (v3)")

    # Skip if no tools enabled beyond core
    if len(config.enabled_actions) <= 3:  # Only core tools
        print("  No additional tools enabled")
        return ExecuteResult()

    # Detect which tools should execute
    tools_to_run = detect_tool_intent(config, state, message, generated)

    if not tools_to_run:
        print("  No tools detected")
        return ExecuteResult()

    print(f"  Tools to execute: {tools_to_run}")

    # Execute each tool
    tool_calls = []
    for tool_id in tools_to_run:
        # Extract arguments
        args = extract_tool_arguments(tool_id, message, generated, state)

        # Skip if missing required args
        if tool_id == "save_contact" and not args.get("name"):
            print(f"  Skipping {tool_id}: missing name")
            continue

        # Execute
        result = execute_tool(tool_id, args)
        tool_calls.append(result)
        print(f"  {tool_id}: {'✓' if result.success else '✗'}")

    return ExecuteResult(
        tool_calls=tool_calls,
        should_append_to_response=False  # Don't show tool output to user
    )
