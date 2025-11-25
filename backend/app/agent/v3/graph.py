"""
v3 LangGraph Integration - Hybrid ReAct Architecture.

Combines context-driven pipeline with proper tool calling:
1. Extract: Understand user intent, extract traits
2. Assemble: Build RAG context + examples
3. Agent: ReAct loop - LLM with tools bound, loops until done
4. Post-process: Calculate typing, detect events

The Agent node uses LangGraph's prebuilt ReAct pattern with tools.
"""

import os
import json
import operator
from typing import TypedDict, Annotated, Optional, Any, Sequence

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.prebuilt import ToolNode

from app.agent.checkpointer import get_checkpointer


# OpenRouter configuration for ChatOpenAI
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
from app.agent.v3.schema import AgentState, MessageWithTiming, ExtractionResult, AssembleResult, GenerateResult
from app.agent.v3.config import BaseAgentConfig
from app.agent.v3.pipeline.extract import extract, update_state_from_extraction
from app.agent.v3.pipeline.assemble import assemble
from app.agent.v3.pipeline.post_process import post_process, check_escalation
from app.agent.v3.prompts import build_generation_prompt
from app.agent.tools import get_tools_for_agent


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
    extraction: Optional[ExtractionResult]
    assembled: Optional[AssembleResult]

    # ReAct messages (for tool loop)
    react_messages: Annotated[Sequence[BaseMessage], operator.add]

    # Output
    final_response: Optional[str]
    messages: list[MessageWithTiming]
    escalation: Optional[dict]
    tokens_used: int
    tool_calls_made: list[dict]


# =============================================================================
# GRAPH NODES
# =============================================================================

def extract_node(state: GraphState) -> dict:
    """Extract traits, intent, objection from message."""
    print("-> [Node] Extract")

    config = state["config"]
    agent_state = state["agent_state"]
    message = state["message"]

    extraction = extract(config, agent_state, message)

    # Update agent state from extraction
    agent_state = update_state_from_extraction(config, agent_state, extraction, message)

    return {
        "extraction": extraction,
        "agent_state": agent_state,
        "tokens_used": state.get("tokens_used", 0) + extraction.tokens_used
    }


def check_escalation_node(state: GraphState) -> dict:
    """Check if escalation is needed (early exit)."""
    print("-> [Node] Check Escalation")

    config = state["config"]
    agent_state = state["agent_state"]
    extraction = state["extraction"]

    escalation = check_escalation(config, agent_state, extraction.intent)

    if escalation and escalation["action"] == "handoff":
        # Build escalation response
        messages = [
            MessageWithTiming(content=msg, typing_delay_ms=800, pause_after_ms=500)
            for msg in escalation["response"]
        ]
        return {
            "escalation": escalation,
            "messages": messages,
            "final_response": " ".join(escalation["response"])
        }

    return {}


def assemble_node(state: GraphState) -> dict:
    """Build context from RAG and select examples."""
    print("-> [Node] Assemble")

    config = state["config"]
    agent_state = state["agent_state"]
    extraction = state["extraction"]
    message = state["message"]

    assembled = assemble(config, agent_state, extraction, message)

    # Build the system prompt with assembled context
    event_labels = {e.id: e.description or e.id for e in config.events}

    system_prompt = build_generation_prompt(
        agent_name=config.agent_name,
        agent_description=config.agent_description,
        product_summary=config.format_product_summary(),
        state=agent_state,
        objectives=config.objectives,
        event_labels=event_labels,
        chunks=assembled.chunks,
        examples=assembled.examples,
        guardrails=config.guardrails,
        max_messages=config.multi_message.max_messages,
        preferred_messages=config.multi_message.preferred_messages
    )

    # Add tool instructions to system prompt
    tool_instructions = """

## Ferramentas Disponíveis
Você tem acesso a ferramentas para executar ações reais. USE-AS quando apropriado:
- Para verificar disponibilidade de horários: use check_availability
- Para agendar: use book_appointment
- Para verificar estoque: use check_stock
- Para reservar produto: use reserve_stock
- Para criar tarefas de follow-up: use create_task
- Para salvar informações do contato: use save_contact

IMPORTANTE: Quando o cliente perguntar sobre disponibilidade, preços de estoque, ou quiser agendar,
USE A FERRAMENTA PRIMEIRO para obter dados reais, depois responda com base no resultado."""

    system_prompt += tool_instructions

    # Initialize ReAct messages with system prompt and user message
    react_messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=message)
    ]

    return {
        "assembled": assembled,
        "react_messages": react_messages
    }


def agent_node(state: GraphState) -> dict:
    """
    ReAct agent node - calls LLM with tools bound.

    The LLM can either:
    1. Call a tool (returns tool_calls in response)
    2. Return final response (no tool_calls)
    """
    print("-> [Node] Agent")

    config = state["config"]
    messages = state["react_messages"]

    # Get tools for this agent
    tools = get_tools_for_agent(config.enabled_actions)

    # Create LLM configured for OpenRouter
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

    # Track tokens (approximate)
    tokens_used = state.get("tokens_used", 0) + 500  # Approximate per call

    return {
        "react_messages": [response],
        "tokens_used": tokens_used
    }


def tool_node(state: GraphState) -> dict:
    """Execute tools called by the agent."""
    print("-> [Node] Tools")

    config = state["config"]
    messages = state["react_messages"]

    # Get the last message (should be AIMessage with tool_calls)
    last_message = messages[-1]

    if not hasattr(last_message, 'tool_calls') or not last_message.tool_calls:
        return {}

    # Get tools
    tools = get_tools_for_agent(config.enabled_actions)
    tool_map = {tool.name: tool for tool in tools}

    # Execute each tool call
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
                print(f"    Result: {str(result)[:100]}...")
            except Exception as e:
                error_msg = f"Error executing {tool_name}: {str(e)}"
                tool_messages.append(
                    ToolMessage(content=error_msg, tool_call_id=tool_call["id"])
                )
                tool_calls_made.append({
                    "tool": tool_name,
                    "args": tool_args,
                    "result": error_msg,
                    "success": False
                })
                print(f"    Error: {e}")
        else:
            error_msg = f"Tool {tool_name} not found"
            tool_messages.append(
                ToolMessage(content=error_msg, tool_call_id=tool_call["id"])
            )

    return {
        "react_messages": tool_messages,
        "tool_calls_made": tool_calls_made
    }


def post_process_node(state: GraphState) -> dict:
    """Post-process: extract final response, calculate timing."""
    print("-> [Node] Post-process")

    config = state["config"]
    agent_state = state["agent_state"]
    extraction = state["extraction"]
    messages = state["react_messages"]

    # Get final response from last AI message
    final_response = ""
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and msg.content and not msg.tool_calls:
            final_response = msg.content
            break

    if not final_response:
        # Fallback - get any AI message content
        for msg in reversed(messages):
            if isinstance(msg, AIMessage) and msg.content:
                final_response = msg.content
                break

    if not final_response:
        final_response = "Desculpe, ocorreu um erro. Pode repetir?"

    # Split into multiple messages if needed (for WhatsApp-style)
    response_messages = split_response(final_response, config.multi_message.max_messages)

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

    # Update agent state with response
    for msg in response_messages:
        agent_state.add_to_history("assistant", msg)

    # Check for soft escalation
    soft_escalation = None
    # (Could add logic here to detect escalation triggers in response)

    return {
        "final_response": final_response,
        "messages": messages_with_timing,
        "agent_state": agent_state,
        "escalation": soft_escalation
    }


def split_response(text: str, max_messages: int) -> list[str]:
    """Split response into multiple messages for natural conversation."""
    # Simple split by double newline or sentence boundaries
    if len(text) < 200:
        return [text]

    # Split by paragraphs first
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]

    if len(paragraphs) > 1 and len(paragraphs) <= max_messages:
        return paragraphs

    # If too many paragraphs, join some
    if len(paragraphs) > max_messages:
        result = []
        chunk = []
        for p in paragraphs:
            chunk.append(p)
            if len(result) < max_messages - 1 and len('\n\n'.join(chunk)) > 300:
                result.append('\n\n'.join(chunk))
                chunk = []
        if chunk:
            result.append('\n\n'.join(chunk))
        return result[:max_messages]

    return [text]


# =============================================================================
# ROUTING
# =============================================================================

def should_continue_after_escalation(state: GraphState) -> str:
    """Route based on escalation status."""
    if state.get("escalation") and state["escalation"].get("action") == "handoff":
        return "end"
    return "assemble"


def should_continue_after_agent(state: GraphState) -> str:
    """Route based on whether agent wants to call tools."""
    messages = state.get("react_messages", [])

    if not messages:
        return "post_process"

    last_message = messages[-1]

    # If last message has tool calls, go to tool node
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "tools"

    # Otherwise, done with ReAct loop
    return "post_process"


# =============================================================================
# GRAPH BUILDER
# =============================================================================

def build_graph() -> StateGraph:
    """
    Build the v3 hybrid pipeline graph.

    Flow:
    extract → check_escalation → assemble → agent ⟷ tools → post_process
                     ↓                         ↑_____|
                    END (if handoff)

    The agent ⟷ tools loop continues until agent returns without tool_calls.
    """
    graph = StateGraph(GraphState)

    # Add nodes
    graph.add_node("extract", extract_node)
    graph.add_node("check_escalation", check_escalation_node)
    graph.add_node("assemble", assemble_node)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_node)
    graph.add_node("post_process", post_process_node)

    # Set entry point
    graph.set_entry_point("extract")

    # Extract → Check Escalation
    graph.add_edge("extract", "check_escalation")

    # Check Escalation → Assemble or END
    graph.add_conditional_edges(
        "check_escalation",
        should_continue_after_escalation,
        {
            "assemble": "assemble",
            "end": END
        }
    )

    # Assemble → Agent
    graph.add_edge("assemble", "agent")

    # Agent → Tools or Post-process (ReAct loop)
    graph.add_conditional_edges(
        "agent",
        should_continue_after_agent,
        {
            "tools": "tools",
            "post_process": "post_process"
        }
    )

    # Tools → Agent (loop back)
    graph.add_edge("tools", "agent")

    # Post-process → END
    graph.add_edge("post_process", END)

    return graph


# =============================================================================
# COMPILED GRAPH WITH CHECKPOINTER
# =============================================================================

_compiled_graph = None


def get_compiled_graph():
    """Get or create compiled graph with PostgresSaver checkpointer."""
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
    Run a turn using the LangGraph pipeline with persistence.

    Args:
        config: Agent configuration
        thread_id: Conversation thread ID (for persistence)
        message: User's message
        initial_state: Optional initial state (for new conversations)

    Returns:
        Dict with messages, state, escalation, tokens_used
    """
    graph = get_compiled_graph()
    config_dict = {"configurable": {"thread_id": thread_id}}

    # Try to load existing state from checkpoint
    agent_state = None
    try:
        checkpoint_state = graph.get_state(config_dict)
        if checkpoint_state and checkpoint_state.values:
            agent_state = checkpoint_state.values.get("agent_state")
            if agent_state:
                print(f"  Loaded state from checkpoint: turn {agent_state.turn_count}")
    except Exception as e:
        print(f"  No existing checkpoint: {e}")

    # Use initial state if no checkpoint found
    if agent_state is None:
        agent_state = initial_state or config.create_initial_state(thread_id)
        print(f"  Created new state")

    # Store previous state for logging deltas
    prev_state = {
        "traits": dict(agent_state.traits),
        "events": dict(agent_state.events),
        "objections_raised": list(agent_state.objections_raised)
    }

    input_state: GraphState = {
        "message": message,
        "config": config,
        "agent_state": agent_state,
        "extraction": None,
        "assembled": None,
        "react_messages": [],
        "final_response": None,
        "messages": [],
        "escalation": None,
        "tokens_used": 0,
        "tool_calls_made": []
    }

    # Run the graph
    result = graph.invoke(input_state, config=config_dict)

    # Build response
    response_data = {
        "messages": [
            {
                "content": m.content,
                "typing_delay_ms": m.typing_delay_ms,
                "pause_after_ms": m.pause_after_ms
            }
            for m in result["messages"]
        ],
        "state": {
            "traits": result["agent_state"].traits,
            "events": result["agent_state"].events,
            "turn_count": result["agent_state"].turn_count,
            "objections_raised": result["agent_state"].objections_raised
        },
        "escalation": result["escalation"],
        "tokens_used": result["tokens_used"]
    }

    # Add debug info for logging
    response_data["_debug"] = {
        "extraction": {
            "intent": result.get("extraction").intent if result.get("extraction") else None,
            "objection_type": result.get("extraction").objection_type if result.get("extraction") else None,
            "trait_updates": result.get("extraction").trait_updates if result.get("extraction") else {},
        },
        "assembled": {
            "chunks": [
                {
                    "id": c.id,
                    "title": c.title,
                    "labels": c.labels,
                    "score": c.score
                }
                for c in result.get("assembled").chunks
            ] if result.get("assembled") else [],
            "examples_used": [e.id for e in result.get("assembled").examples] if result.get("assembled") else []
        },
        "tool_calls": result.get("tool_calls_made", []),
        "prev_state": prev_state
    }

    return response_data


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
                    "traits": agent_state.traits,
                    "events": agent_state.events,
                    "turn_count": agent_state.turn_count,
                    "objections_raised": agent_state.objections_raised
                }
    except Exception as e:
        print(f"Error getting state: {e}")

    return None
