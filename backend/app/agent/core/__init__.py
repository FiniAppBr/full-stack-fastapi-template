"""
Agent v3 - Simplified LLM-Driven Architecture

Flow: preprocess → assemble → agent ⟷ tools → extract_data → generate → validate → post_process

Architecture:
- Single-responsibility modules in pipeline/
- State flows through LangGraph nodes
- Each node ~100-150 lines with clear purpose

Key files:
- state.py: GraphState definition
- config.py: BaseAgentConfig
- schema.py: Data models (AgentState, ChunkMatch, etc.)
- pipeline/: Individual node implementations
- graph.py: Graph building and entry points
"""

from app.agent.core.schema import (
    Objective,
    Guardrails,
    GuardrailRule,
    EscalationTrigger,
    AssembleResult,
    AgentState,
    ChunkMatch,
    MessageWithTiming,
)
from app.agent.core.config import (
    BaseAgentConfig,
    GenerationConfig,
    RAGConfig,
    MultiMessageConfig,
    TypingConfig,
)
from app.agent.core.state import GraphState

__all__ = [
    # Schema
    "Objective",
    "Guardrails",
    "GuardrailRule",
    "EscalationTrigger",
    "AssembleResult",
    "AgentState",
    "ChunkMatch",
    "MessageWithTiming",
    # Config
    "BaseAgentConfig",
    "GenerationConfig",
    "RAGConfig",
    "MultiMessageConfig",
    "TypingConfig",
    # State
    "GraphState",
]
