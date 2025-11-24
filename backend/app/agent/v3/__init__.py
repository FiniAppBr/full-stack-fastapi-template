"""
Agent v3 - Context-Driven Architecture

Philosophy: Enhance the LLM with context, not control it with rules.

Base system provides:
- Schema definitions (Trait, Objective, Example, etc.)
- Pipeline stages (extract, assemble, generate, post_process)
- Prompt templates with placeholders
- Universal guidance (mirroring, empathy, direct responses)

Agent-specific configs provide:
- Product/business data
- Trait definitions (what to extract)
- Objectives (what to achieve)
- Few-shot examples
- Custom guardrails
"""

from app.agent.v3.schema import (
    Trait,
    Objective,
    Event,
    ConversationExample,
    ExtractionResult,
    AssembleResult,
    GenerateResult,
    AgentState,
)
from app.agent.v3.config import BaseAgentConfig

__all__ = [
    "Trait",
    "Objective",
    "Event",
    "ConversationExample",
    "ExtractionResult",
    "AssembleResult",
    "GenerateResult",
    "AgentState",
    "BaseAgentConfig",
]
