"""
ReAct Agent System

Provides a configurable ReAct-based agent with:
- Dynamic state schema (user-defined fields)
- Conversation stages (optional sales funnels)
- Tool library (knowledge search, calendar, handoff, etc.)
- Pipeline middleware (gating, validation, splitting)
"""

from .graph import create_agent_graph, get_or_create_agent_graph, clear_agent_graph_cache
from .checkpointer import get_checkpointer
from .state import AgentState, generate_state_class, extract_state_fields
from .stages import ConversationStage, get_stage_by_id, check_stage_transition

__all__ = [
    # Graph
    "create_agent_graph",
    "get_or_create_agent_graph",
    "clear_agent_graph_cache",
    # Checkpointer
    "get_checkpointer",
    # State
    "AgentState",
    "generate_state_class",
    "extract_state_fields",
    # Stages
    "ConversationStage",
    "get_stage_by_id",
    "check_stage_transition",
]
