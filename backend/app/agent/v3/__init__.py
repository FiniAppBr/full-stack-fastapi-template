"""
Agent v3 - Simplified LLM-Driven Architecture

Flow: assemble → agent ⟷ tools → post_process

Key simplifications:
- No extraction LLM call (search query from message + history)
- No traits/intents (LLM handles implicitly)
- No events (analytics can be post-hoc)
- No examples in pipeline (use RAG for few-shot)
- Escalation evaluated by LLM from user-defined conditions
"""

from app.agent.v3.schema import (
    Objective,
    Guardrails,
    EscalationTrigger,
    AssembleResult,
    AgentState,
    ChunkMatch,
    MessageWithTiming,
)
from app.agent.v3.config import BaseAgentConfig

__all__ = [
    "Objective",
    "Guardrails",
    "EscalationTrigger",
    "AssembleResult",
    "AgentState",
    "ChunkMatch",
    "MessageWithTiming",
    "BaseAgentConfig",
]
