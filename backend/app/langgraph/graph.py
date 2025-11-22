"""
LangGraph factory - creates and manages agent graphs.
"""
from typing import Dict, Optional
from langgraph.graph import StateGraph, END
from sqlmodel import Session

from app.core.db import engine
from app.models.agent import Agent
from app.agents.utils import split_response

from .state import generate_state_class
from .checkpointer import get_checkpointer
from .nodes import (
    create_extract_state_node,
    create_apply_gating_node,
    create_rag_search_node,
    create_generate_response_node,
    create_execute_actions_node,
    create_validate_node,
)

# Global cache for compiled graphs
_agent_graphs: Dict[int, StateGraph] = {}


def split_response_from_state(state: dict) -> list[str]:
    """
    Split response based on multi_turn_config in state.
    Returns array of messages for natural conversation flow.
    """
    response = state.get("response", "")
    if not response:
        return []

    multi_turn_config = state.get("multi_turn_config") or {}

    if not multi_turn_config.get("enabled", False):
        return [response]

    return split_response(
        response=response,
        max_splits=multi_turn_config.get("max_splits", 4),
        style=multi_turn_config.get("style", "medium")
    )


def create_agent_graph(agent_id: int) -> StateGraph:
    """
    Create a compiled LangGraph for a specific agent.
    Loads config from database and generates dynamic state + nodes.

    Args:
        agent_id: Agent ID from database

    Returns:
        Compiled StateGraph ready for invocation
    """
    print(f"\n{'='*60}")
    print(f"Creating LangGraph for Agent {agent_id}")
    print(f"{'='*60}")

    # Load agent config from DB
    with Session(engine) as session:
        agent = session.get(Agent, agent_id)

        if not agent:
            raise ValueError(f"Agent {agent_id} not found in database")

        agent_config = {
            "response_schema": agent.response_schema or {},
            "multi_turn_config": agent.multi_turn_config or {"enabled": False},
            "media_rules": agent.media_rules or {},
            "gating_rules": agent.gating_rules or [],
            "validation_rules": agent.validation_rules or [],
            "base_instructions": agent.description or "",
            "tools": agent.tools or [],
        }

    print(f"Loaded config:")
    print(f"  - Response schema: {len(agent_config['response_schema'])} fields")
    print(f"  - Gating rules: {len(agent_config['gating_rules'])}")
    print(f"  - Validation rules: {len(agent_config['validation_rules'])}")
    print(f"  - Multi-turn: {agent_config['multi_turn_config'].get('enabled', False)}")

    # Generate dynamic state class
    state_class = generate_state_class(agent_id, agent_config["response_schema"])

    # Create StateGraph
    graph = StateGraph(state_class)

    # Add nodes
    graph.add_node("extract_state", create_extract_state_node(agent_config))
    graph.add_node("apply_gating", create_apply_gating_node(agent_config["gating_rules"]))
    graph.add_node("rag_search", create_rag_search_node())
    graph.add_node("generate_response", create_generate_response_node(agent_config))
    graph.add_node("execute_actions", create_execute_actions_node())
    graph.add_node("validate", create_validate_node(agent_config["validation_rules"]))

    # Add edges (fixed pipeline)
    # Note: Mem0 removed - checkpointer handles all state persistence
    graph.set_entry_point("extract_state")
    graph.add_edge("extract_state", "apply_gating")
    graph.add_edge("apply_gating", "rag_search")
    graph.add_edge("rag_search", "generate_response")
    graph.add_edge("generate_response", "execute_actions")
    graph.add_edge("execute_actions", "validate")
    graph.add_edge("validate", END)

    # Compile graph with checkpointer for state persistence
    # FUTURE: Add LangGraph Store for cross-thread memory when needed
    # (e.g., same customer talking to multiple agents)
    # See: https://langchain-ai.github.io/langgraph/concepts/persistence/#memory-store
    # Usage: graph.compile(checkpointer=checkpointer, store=store)
    checkpointer = get_checkpointer()
    compiled = graph.compile(checkpointer=checkpointer)

    print(f"✓ Graph compiled with checkpointer\n")

    return compiled


def get_or_create_agent_graph(agent_id: int, force_rebuild: bool = False) -> StateGraph:
    """
    Get cached graph or create new one.
    Caches graphs in memory for performance.

    Args:
        agent_id: Agent ID
        force_rebuild: Force rebuild even if cached

    Returns:
        Compiled StateGraph
    """
    if force_rebuild or agent_id not in _agent_graphs:
        _agent_graphs[agent_id] = create_agent_graph(agent_id)

    return _agent_graphs[agent_id]


def clear_agent_graph_cache(agent_id: Optional[int] = None):
    """
    Clear cached graphs.
    Call when agent config changes in DB.

    Args:
        agent_id: Specific agent to clear, or None for all
    """
    global _agent_graphs

    if agent_id is None:
        _agent_graphs = {}
        print("Cleared all agent graph cache")
    elif agent_id in _agent_graphs:
        del _agent_graphs[agent_id]
        print(f"Cleared cache for agent {agent_id}")
