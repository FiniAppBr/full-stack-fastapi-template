"""
v3 LangGraph Integration - Simplified ReAct Architecture.

Flow: assemble → agent ⟷ tools → validate → post_process

No extraction LLM call. Search query built from message + history.
Validation node checks response quality (single retry if failed).
Escalation handled via tool call in ReAct loop.
"""

import os
import json
import operator
from typing import TypedDict, Annotated, Optional, Sequence

from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

from app.agent.checkpointer import get_checkpointer
from app.agent.v3.schema import AgentState, MessageWithTiming, AssembleResult
from app.agent.v3.config import BaseAgentConfig
from app.agent.tools.registry import get_enabled_tools, get_available_tools_summary
from app.agent.v3.pipeline.assemble import assemble
from app.agent.v3.prompts import build_generation_prompt
from app.agent.tools import get_tools_for_agent


class FormattedMessages(BaseModel):
    """Structured output for formatted messages."""
    messages: list[str] = Field(description="Lista de mensagens separadas para enviar")


OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


def get_chat_llm(model: str, temperature: float = 0.7, max_tokens: int = 500) -> ChatOpenAI:
    """Get ChatOpenAI configured for OpenRouter."""
    return ChatOpenAI(
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        openai_api_key=os.getenv("OPENROUTER_API_KEY"),
        openai_api_base=OPENROUTER_BASE_URL,
        default_headers={
            "HTTP-Referer": "https://connectai.com",
            "X-Title": "ConnectAI Agent",
        }
    )


# =============================================================================
# GRAPH STATE
# =============================================================================

class GraphState(TypedDict):
    """State that flows through the LangGraph pipeline."""
    # Input
    message: str
    config: BaseAgentConfig

    # Agent state (persisted across conversations)
    agent_state: AgentState

    # Pipeline intermediates
    assembled: Optional[AssembleResult]

    # ReAct messages (for tool loop)
    react_messages: Annotated[Sequence[BaseMessage], operator.add]

    # Validation tracking
    validation_attempts: int

    # Output
    final_response: Optional[str]
    messages: list[MessageWithTiming]
    escalation: Optional[dict]
    tokens_used: int
    tool_calls_made: list[dict]


# =============================================================================
# GRAPH NODES
# =============================================================================

def assemble_node(state: GraphState) -> dict:
    """Build RAG context from message + history."""
    print("-> [Node] Assemble")

    config = state["config"]
    agent_state = state["agent_state"]
    message = state["message"]

    # Add user message to history BEFORE building search query
    agent_state.add_to_history("user", message)
    agent_state.turn_count += 1

    # Assemble RAG context
    assembled = assemble(config, agent_state, message)

    # Build system prompt
    system_prompt = build_generation_prompt(
        config=config,
        state=agent_state,
        chunks=assembled.chunks,
    )

    # Add tool instructions if tools enabled
    if config.enabled_tool_categories:
        tools_summary = get_available_tools_summary(config.enabled_tool_categories)
        system_prompt += f"\n\n## Ferramentas Disponíveis\n{tools_summary}"

        # Add entity-specific tool instructions from capabilities
        if assembled.tool_context:
            system_prompt += f"\n\n## Instruções de Ferramentas (por entidade)\n{assembled.tool_context}"

    # Initialize ReAct messages
    react_messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=message)
    ]

    return {
        "assembled": assembled,
        "react_messages": react_messages,
        "agent_state": agent_state
    }


def agent_node(state: GraphState) -> dict:
    """ReAct agent - calls LLM with tools bound."""
    print("-> [Node] Agent")

    config = state["config"]
    messages = state["react_messages"]

    # Get tools
    enabled_tool_names = get_enabled_tools(config.enabled_tool_categories)
    tools = get_tools_for_agent(enabled_tool_names)

    # Create LLM
    llm = get_chat_llm(
        model=config.generation.model,
        temperature=config.generation.temperature,
        max_tokens=config.generation.max_tokens,
    )

    if tools:
        llm_with_tools = llm.bind_tools(tools)
    else:
        llm_with_tools = llm

    # Call LLM
    response = llm_with_tools.invoke(messages)
    print(f"  Tool calls: {len(response.tool_calls) if response.tool_calls else 0}")

    tokens_used = state.get("tokens_used", 0) + 500  # Approximate

    return {
        "react_messages": [response],
        "tokens_used": tokens_used
    }


def tool_node(state: GraphState) -> dict:
    """Execute tools called by the agent."""
    print("-> [Node] Tools")

    config = state["config"]
    messages = state["react_messages"]
    last_message = messages[-1]

    if not hasattr(last_message, 'tool_calls') or not last_message.tool_calls:
        return {}

    # Get tools
    enabled_tool_names = get_enabled_tools(config.enabled_tool_categories)
    tools = get_tools_for_agent(enabled_tool_names)
    tool_map = {tool.name: tool for tool in tools}

    # Execute tools
    tool_messages = []
    tool_calls_made = state.get("tool_calls_made", [])

    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        print(f"  Executing: {tool_name}({tool_args})")

        tool = tool_map.get(tool_name)
        if tool:
            try:
                result = tool.invoke(tool_args)
                tool_messages.append(
                    ToolMessage(content=str(result), tool_call_id=tool_call["id"])
                )
                tool_calls_made.append({
                    "tool": tool_name,
                    "args": tool_args,
                    "result": str(result)[:500],
                    "success": True
                })
            except Exception as e:
                error_msg = f"Error: {str(e)}"
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
        "tool_calls_made": tool_calls_made
    }


def validate_node(state: GraphState) -> dict:
    """
    Validate response before sending to user.

    Checks:
    1. Does the response answer the question?
    2. Does it use the RAG context provided?

    If validation fails, injects correction message for ONE retry only.
    """
    print("-> [Node] Validate")

    messages = state["react_messages"]
    assembled = state.get("assembled")
    user_message = state["message"]
    attempts = state.get("validation_attempts", 0)

    # Only validate once (no infinite loops)
    if attempts >= 1:
        print("  Skipping validation (already retried)")
        return {"validation_attempts": attempts}

    # Get the response to validate
    response = ""
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and msg.content and not getattr(msg, 'tool_calls', None):
            response = msg.content
            break

    if not response:
        return {"validation_attempts": attempts}

    # Skip validation if no RAG context (nothing to validate against)
    if not assembled or not assembled.chunks:
        print("  Skipping validation (no RAG context)")
        return {"validation_attempts": attempts}

    # Build validation prompt
    config = state["config"]
    chunk_titles = [c.title for c in assembled.chunks if c.title]

    validation_prompt = f"""Valide esta resposta de atendimento:

Agente: {config.agent_name}
Descrição do agente: {config.agent_description or 'N/A'}
Pergunta do cliente: {user_message}
Contexto RAG disponível: {', '.join(chunk_titles[:5])}
Resposta gerada: {response[:500]}

Responda APENAS com JSON:
{{"ok": true}} se a resposta está adequada
{{"ok": false, "issue": "descrição curta do problema"}} se há problemas

Critérios:
1. Responde a pergunta diretamente?
2. Usa informações do contexto fornecido?
3. Não inventa dados? (Nome e descrição do agente são permitidos)"""

    try:
        # Use fast model for validation
        llm = get_chat_llm(
            model="google/gemini-2.0-flash-001",
            temperature=0.1,
            max_tokens=100
        )

        validation_response = llm.invoke([HumanMessage(content=validation_prompt)])
        validation_text = validation_response.content.strip()

        # Parse validation result
        import re
        json_match = re.search(r'\{[^}]+\}', validation_text)
        if json_match:
            result = json.loads(json_match.group())

            if not result.get("ok", True):
                issue = result.get("issue", "resposta inadequada")
                print(f"  Validation failed: {issue}")

                # Inject correction for retry (only once)
                correction = f"CORREÇÃO NECESSÁRIA: {issue}. Revise sua resposta para atender melhor à pergunta do cliente."
                return {
                    "react_messages": [HumanMessage(content=correction)],
                    "validation_attempts": attempts + 1
                }

        print("  Validation passed")

    except Exception as e:
        print(f"  Validation error (skipping): {e}")

    return {"validation_attempts": attempts}


def post_process_node(state: GraphState) -> dict:
    """Format response and calculate timing."""
    print("-> [Node] Post-process")

    config = state["config"]
    agent_state = state["agent_state"]
    messages = state["react_messages"]

    # Get final response from last AI message
    final_response = ""
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and msg.content and not getattr(msg, 'tool_calls', None):
            final_response = msg.content
            break

    if not final_response:
        final_response = "Desculpe, ocorreu um erro. Pode repetir?"

    # Parse messages (handle JSON or plain text)
    response_messages = _parse_response(final_response, config.multi_message.max_messages)

    # Calculate typing times
    messages_with_timing = []
    for i, msg in enumerate(response_messages):
        typing_ms = min(
            config.multi_message.typing.base_ms + len(msg) * config.multi_message.typing.per_char_ms,
            config.multi_message.typing.max_delay_ms
        )
        pause_ms = config.multi_message.typing.between_messages_ms if i < len(response_messages) - 1 else 0

        messages_with_timing.append(
            MessageWithTiming(content=msg, typing_delay_ms=typing_ms, pause_after_ms=pause_ms)
        )

    # Update history with response
    for msg in response_messages:
        agent_state.add_to_history("assistant", msg)

    return {
        "final_response": final_response,
        "messages": messages_with_timing,
        "agent_state": agent_state
    }


def _parse_response(text: str, max_messages: int) -> list[str]:
    """Parse LLM response into message list."""
    # Try JSON parsing first
    try:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        parsed = json.loads(cleaned)
        if isinstance(parsed, dict) and "messages" in parsed:
            return parsed["messages"][:max_messages]
        elif isinstance(parsed, list):
            return [str(m) for m in parsed[:max_messages]]
    except (json.JSONDecodeError, KeyError):
        pass

    # Fallback: split by paragraphs
    if "\n\n" in text:
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        if 1 < len(paragraphs) <= max_messages:
            return paragraphs

    return [text]


# =============================================================================
# ROUTING
# =============================================================================

def should_continue_after_agent(state: GraphState) -> str:
    """Route based on whether agent wants to call tools."""
    messages = state.get("react_messages", [])

    if not messages:
        return "validate"

    last_message = messages[-1]

    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "tools"

    return "validate"


def should_continue_after_validate(state: GraphState) -> str:
    """Route based on validation result."""
    messages = state.get("react_messages", [])

    if not messages:
        return "post_process"

    last_message = messages[-1]

    # If validation injected a correction (HumanMessage), retry with agent
    if isinstance(last_message, HumanMessage) and "CORREÇÃO" in last_message.content:
        return "agent"

    # Otherwise, proceed to post_process
    return "post_process"


# =============================================================================
# GRAPH BUILDER
# =============================================================================

def build_graph() -> StateGraph:
    """
    Build the v3 pipeline graph.

    Flow: assemble → agent ⟷ tools → validate → post_process
    """
    graph = StateGraph(GraphState)

    # Add nodes
    graph.add_node("assemble", assemble_node)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_node)
    graph.add_node("validate", validate_node)
    graph.add_node("post_process", post_process_node)

    # Set entry point
    graph.set_entry_point("assemble")

    # Assemble → Agent
    graph.add_edge("assemble", "agent")

    # Agent → Tools or Validate
    graph.add_conditional_edges(
        "agent",
        should_continue_after_agent,
        {
            "tools": "tools",
            "validate": "validate"
        }
    )

    # Tools → Agent (loop back)
    graph.add_edge("tools", "agent")

    # Validate → Agent (retry) or Post-process
    graph.add_conditional_edges(
        "validate",
        should_continue_after_validate,
        {
            "agent": "agent",
            "post_process": "post_process"
        }
    )

    # Post-process → END
    graph.add_edge("post_process", END)

    return graph


# =============================================================================
# COMPILED GRAPH
# =============================================================================

_compiled_graph = None


def get_compiled_graph():
    """Get or create compiled graph with checkpointer."""
    global _compiled_graph
    if _compiled_graph is None:
        graph = build_graph()
        checkpointer = get_checkpointer()
        _compiled_graph = graph.compile(checkpointer=checkpointer)
    return _compiled_graph


def reset_compiled_graph():
    """Reset the compiled graph (call after config changes)."""
    global _compiled_graph
    _compiled_graph = None


# =============================================================================
# RUN FUNCTION
# =============================================================================

def run_turn_with_graph(
    config: BaseAgentConfig,
    thread_id: str,
    message: str,
    initial_state: Optional[AgentState] = None
) -> dict:
    """
    Run a turn using the LangGraph pipeline.

    Args:
        config: Agent configuration
        thread_id: Conversation thread ID
        message: User's message
        initial_state: Optional initial state

    Returns:
        Dict with messages, state, tokens_used
    """
    graph = get_compiled_graph()
    config_dict = {"configurable": {"thread_id": thread_id}}

    # Load existing state from checkpoint
    agent_state = None
    try:
        checkpoint_state = graph.get_state(config_dict)
        if checkpoint_state and checkpoint_state.values:
            agent_state = checkpoint_state.values.get("agent_state")
            if agent_state:
                print(f"  Loaded state: turn {agent_state.turn_count}")
    except Exception as e:
        print(f"  No checkpoint: {e}")

    # Use initial state if no checkpoint
    if agent_state is None:
        agent_state = initial_state or config.create_initial_state(thread_id)
        print("  Created new state")

    input_state: GraphState = {
        "message": message,
        "config": config,
        "agent_state": agent_state,
        "assembled": None,
        "react_messages": [],
        "validation_attempts": 0,
        "final_response": None,
        "messages": [],
        "escalation": None,
        "tokens_used": 0,
        "tool_calls_made": []
    }

    # Run graph
    result = graph.invoke(input_state, config=config_dict)

    # Build response
    return {
        "messages": [
            {
                "content": m.content,
                "typing_delay_ms": m.typing_delay_ms,
                "pause_after_ms": m.pause_after_ms
            }
            for m in result["messages"]
        ],
        "state": {
            "turn_count": result["agent_state"].turn_count,
            "history_length": len(result["agent_state"].history)
        },
        "tokens_used": result["tokens_used"],
        "_debug": {
            "assembled_chunks": len(result.get("assembled").chunks) if result.get("assembled") else 0,
            "tool_calls": result.get("tool_calls_made", [])
        }
    }


def get_conversation_state(thread_id: str) -> Optional[dict]:
    """Get the current state for a conversation thread."""
    graph = get_compiled_graph()
    config = {"configurable": {"thread_id": thread_id}}

    try:
        state = graph.get_state(config)
        if state and state.values:
            agent_state = state.values.get("agent_state")
            if agent_state:
                return {
                    "turn_count": agent_state.turn_count,
                    "history_length": len(agent_state.history)
                }
    except Exception as e:
        print(f"Error getting state: {e}")

    return None
