"""
LangGraph pipeline for the agent.

Single responsibility: Build and compile the graph, provide entry points.

Flow: preprocess → assemble → agent ⟷ tools → extract_data → generate → validate → post_process
"""

from typing import Optional

from langgraph.graph import StateGraph, END

from app.agent.checkpointer import get_checkpointer
from app.agent.core.state import GraphState
from app.agent.core.schema import AgentState
from app.agent.core.config import BaseAgentConfig
from app.agent.core.pipeline import (
    preprocess_node,
    assemble_node,
    agent_node,
    tools_node,
    extract_data_node,
    generate_node,
    validate_node,
    post_process_node,
    should_continue_after_agent,
    should_continue_after_tools,
    should_retry_generation,
)


# =============================================================================
# GRAPH BUILDER
# =============================================================================

def build_graph() -> StateGraph:
    """
    Build the agent pipeline graph.

    Flow:
        preprocess → assemble → agent ⟷ tools → extract_data → generate → validate → post_process
                                                                    ↑           ↓
                                                                    └─── [fail] ┘ (max 2 retries)

    Nodes:
    - preprocess: Normalizes dates, extracts entities (BEFORE LLM sees message)
    - assemble: Builds RAG context + system prompt
    - agent: Handles tool calls (search, escalate, etc.)
    - tools: Executes tools with caching
    - extract_data: Extracts structured data from conversation
    - generate: ALWAYS produces a response (guaranteed)
    - validate: Checks guardrails and hallucinations, retries if needed
    - post_process: Calculate timing and format output

    Returns:
        Configured StateGraph (not compiled)
    """
    graph = StateGraph(GraphState)

    # Add nodes
    graph.add_node("preprocess", preprocess_node)
    graph.add_node("assemble", assemble_node)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tools_node)
    graph.add_node("extract_data", extract_data_node)
    graph.add_node("generate", generate_node)
    graph.add_node("validate", validate_node)
    graph.add_node("post_process", post_process_node)

    # Set entry point
    graph.set_entry_point("preprocess")

    # Preprocess → Assemble
    graph.add_edge("preprocess", "assemble")

    # Assemble → Agent
    graph.add_edge("assemble", "agent")

    # Agent → Tools or Extract
    graph.add_conditional_edges(
        "agent",
        should_continue_after_agent,
        {
            "tools": "tools",
            "extract_data": "extract_data"
        }
    )

    # Tools → Agent (loop) or Extract
    graph.add_conditional_edges(
        "tools",
        should_continue_after_tools,
        {
            "agent": "agent",
            "extract_data": "extract_data"
        }
    )

    # Extract → Generate (always)
    graph.add_edge("extract_data", "generate")

    # Generate → Validate (always)
    graph.add_edge("generate", "validate")

    # Validate → Post-process or Generate (retry)
    graph.add_conditional_edges(
        "validate",
        should_retry_generation,
        {
            "post_process": "post_process",
            "generate": "generate"
        }
    )

    # Post-process → END
    graph.add_edge("post_process", END)

    return graph


# =============================================================================
# COMPILED GRAPH (SINGLETON)
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
# ENTRY POINTS
# =============================================================================

def run_turn_with_graph(
    config: BaseAgentConfig,
    thread_id: str,
    message: str,
    initial_state: Optional[AgentState] = None,
    contact_id: Optional[int] = None
) -> dict:
    """
    Run a turn using the LangGraph pipeline.

    Args:
        config: Agent configuration
        thread_id: Conversation thread ID
        message: User's message
        initial_state: Optional initial state
        contact_id: Optional contact ID for data sync (None for preview)

    Returns:
        Dict with messages, state, tokens_used, _debug
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

    # Set contact_id for data sync
    if contact_id is not None:
        agent_state.contact_id = contact_id

    input_state: GraphState = {
        "message": message,
        "config": config,
        "agent_state": agent_state,
        "assembled": None,
        "preprocessed": None,
        "react_messages": [],
        "response_messages": None,
        "react_iterations": 0,
        "tool_calls_made": [],
        "cached_tool_results": {},
        "final_response": None,
        "messages": [],
        "escalation": None,
        "tokens_used": 0,
        "tokens_in": 0,
        "tokens_out": 0,
        "system_prompt": None
    }

    # Run graph
    result = graph.invoke(input_state, config=config_dict)

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
            "thread_id": result["agent_state"].thread_id,
            "agent_id": result["agent_state"].agent_id,
            "history": [
                {"role": m["role"], "content": m["content"]}
                for m in result["agent_state"].history
            ],
            "history_length": len(result["agent_state"].history),
            "collected_data": result["agent_state"].collected_data
        },
        "tokens_used": result["tokens_used"],
        "tokens_in": result.get("tokens_in", 0),
        "tokens_out": result.get("tokens_out", 0),
        "_debug": {
            "system_prompt": result.get("system_prompt", ""),
            "tool_calls": result.get("tool_calls_made", []),
            "assembled": {
                "chunks": [
                    {
                        "id": c.id,
                        "title": c.title,
                        "content": c.content[:200] + "..." if len(c.content) > 200 else c.content,
                        "score": c.score,
                        "token_count": c.token_count,
                        "is_entity": c.is_entity,
                        "labels": c.labels,
                    }
                    for c in (result.get("assembled").chunks if result.get("assembled") else [])
                ],
                "total_tokens": result.get("assembled").total_tokens if result.get("assembled") else 0,
                "tool_context": result.get("assembled").tool_context if result.get("assembled") else "",
            },
            "validation": {
                "passed": result.get("validation_passed", True),
                "issues": result.get("validation_issues", []),
                "retry_count": result.get("retry_count", 0),
            },
            "extraction": result.get("extraction_result", {}),
            "preprocessed": result.get("preprocessed", {}),
            "react": {
                "iterations": result.get("react_iterations", 0),
                "max_iterations": 3,
            },
            "tokens": {
                "total": result.get("tokens_used", 0),
                "in": result.get("tokens_in", 0),
                "out": result.get("tokens_out", 0),
            },
            "raw_response": result.get("response_messages", []),
        }
    }


def get_conversation_state(thread_id: str) -> Optional[dict]:
    """
    Get the current state for a conversation thread.

    Args:
        thread_id: Conversation thread ID

    Returns:
        State dict with turn_count, history_length, collected_data, or None
    """
    graph = get_compiled_graph()
    config = {"configurable": {"thread_id": thread_id}}

    try:
        state = graph.get_state(config)
        if state and state.values:
            agent_state = state.values.get("agent_state")
            if agent_state:
                return {
                    "turn_count": agent_state.turn_count,
                    "history_length": len(agent_state.history),
                    "collected_data": getattr(agent_state, 'collected_data', {})
                }
    except Exception as e:
        print(f"Error getting state: {e}")

    return None
