"""
v3 LangGraph Integration - State persistence and graph-based pipeline.

Uses PostgresSaver for checkpointing so conversations persist across sessions.
The graph structure mirrors the run.py pipeline but with automatic state management.
"""

from typing import TypedDict, Annotated, Optional, Any
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver

from app.agent.checkpointer import get_checkpointer
from app.agent.v3.schema import AgentState, MessageWithTiming, ExtractionResult, AssembleResult, GenerateResult
from app.agent.v3.config import BaseAgentConfig
from app.agent.v3.pipeline.extract import extract, update_state_from_extraction
from app.agent.v3.pipeline.assemble import assemble
from app.agent.v3.pipeline.generate import generate, update_state_from_generation
from app.agent.v3.pipeline.post_process import post_process, check_escalation


# =============================================================================
# GRAPH STATE
# =============================================================================

class GraphState(TypedDict):
    """State that flows through the LangGraph pipeline."""
    # Input
    message: str
    config: BaseAgentConfig

    # Agent state (persisted)
    agent_state: AgentState

    # Pipeline intermediates
    extraction: Optional[ExtractionResult]
    assembled: Optional[AssembleResult]
    generated: Optional[GenerateResult]

    # Output
    messages: list[MessageWithTiming]
    escalation: Optional[dict]
    tokens_used: int


# =============================================================================
# GRAPH NODES
# =============================================================================

def extract_node(state: GraphState) -> GraphState:
    """Extract traits, intent, objection from message."""
    print("-> [Node] Extract")

    config = state["config"]
    agent_state = state["agent_state"]
    message = state["message"]

    extraction = extract(config, agent_state, message)

    # Update agent state from extraction
    agent_state = update_state_from_extraction(config, agent_state, extraction, message)

    return {
        **state,
        "extraction": extraction,
        "agent_state": agent_state,
        "tokens_used": state.get("tokens_used", 0) + extraction.tokens_used
    }


def check_escalation_node(state: GraphState) -> GraphState:
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
            **state,
            "escalation": escalation,
            "messages": messages
        }

    return state


def assemble_node(state: GraphState) -> GraphState:
    """Build context from RAG and select examples."""
    print("-> [Node] Assemble")

    config = state["config"]
    agent_state = state["agent_state"]
    extraction = state["extraction"]
    message = state["message"]

    assembled = assemble(config, agent_state, extraction, message)

    return {
        **state,
        "assembled": assembled
    }


def generate_node(state: GraphState) -> GraphState:
    """Generate response using LLM."""
    print("-> [Node] Generate")

    config = state["config"]
    agent_state = state["agent_state"]
    assembled = state["assembled"]

    generated = generate(config, agent_state, assembled)

    return {
        **state,
        "generated": generated,
        "tokens_used": state.get("tokens_used", 0) + generated.tokens_used
    }


def post_process_node(state: GraphState) -> GraphState:
    """Post-process: detect events, calculate timing."""
    print("-> [Node] Post-process")

    config = state["config"]
    agent_state = state["agent_state"]
    generated = state["generated"]
    extraction = state["extraction"]

    messages_with_timing, agent_state, soft_escalation = post_process(
        config, agent_state, generated, extraction.intent
    )

    # Update state with assistant messages
    agent_state = update_state_from_generation(agent_state, generated)

    return {
        **state,
        "agent_state": agent_state,
        "messages": messages_with_timing,
        "escalation": soft_escalation
    }


# =============================================================================
# ROUTING
# =============================================================================

def should_continue_after_escalation_check(state: GraphState) -> str:
    """Route based on escalation status."""
    if state.get("escalation") and state["escalation"].get("action") == "handoff":
        return "end"
    return "assemble"


# =============================================================================
# GRAPH BUILDER
# =============================================================================

def build_graph() -> StateGraph:
    """Build the v3 pipeline graph."""
    graph = StateGraph(GraphState)

    # Add nodes
    graph.add_node("extract", extract_node)
    graph.add_node("check_escalation", check_escalation_node)
    graph.add_node("assemble", assemble_node)
    graph.add_node("generate", generate_node)
    graph.add_node("post_process", post_process_node)

    # Add edges
    graph.set_entry_point("extract")
    graph.add_edge("extract", "check_escalation")

    # Conditional edge after escalation check
    graph.add_conditional_edges(
        "check_escalation",
        should_continue_after_escalation_check,
        {
            "assemble": "assemble",
            "end": END
        }
    )

    graph.add_edge("assemble", "generate")
    graph.add_edge("generate", "post_process")
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

    input_state: GraphState = {
        "message": message,
        "config": config,
        "agent_state": agent_state,
        "extraction": None,
        "assembled": None,
        "generated": None,
        "messages": [],
        "escalation": None,
        "tokens_used": 0
    }

    # Store previous state for logging deltas
    prev_state = {
        "traits": dict(agent_state.traits),
        "events": dict(agent_state.events),
        "objections_raised": list(agent_state.objections_raised)
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
