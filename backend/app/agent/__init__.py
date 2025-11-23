"""
Agent System v2 - Context-aware conversational agents.

Architecture:
- Schema: Pydantic models for v2 primitives (gates, traits, modes, signals, rules, chunks, tools)
- Pipeline: 6-stage processing (extract, assemble, generate, validate, execute, format)
- Tools: Executable capabilities (knowledge, calendar, handoff, etc.)

Flow:
  EXTRACT → ASSEMBLE → GENERATE → VALIDATE → EXECUTE → FORMAT
"""

from .checkpointer import get_checkpointer
from .graph import create_agent_graph, get_or_create_agent_graph, clear_agent_graph_cache

# Schema exports
from .schema import (
    Gate,
    Trait,
    Mode,
    Signal,
    RuntimeState,
    ExtractionResult,
    Condition,
    Clause,
    AssemblyAction,
    Rule,
    Chunk,
    ChunkMatch,
    Tool,
    ToolCall,
    ToolResult,
)

# Pipeline exports
from .pipeline import (
    extract,
    assemble,
    generate,
    validate,
    execute,
    split_response_messages,
    AgentConfig,
    AssembleResult,
    GenerateResult,
    ValidationResult,
)

__all__ = [
    # Graph
    "create_agent_graph",
    "get_or_create_agent_graph",
    "clear_agent_graph_cache",
    # Checkpointer
    "get_checkpointer",
    # Schema
    "Gate",
    "Trait",
    "Mode",
    "Signal",
    "RuntimeState",
    "ExtractionResult",
    "Condition",
    "Clause",
    "AssemblyAction",
    "Rule",
    "Chunk",
    "ChunkMatch",
    "Tool",
    "ToolCall",
    "ToolResult",
    # Pipeline
    "extract",
    "assemble",
    "generate",
    "validate",
    "execute",
    "split_response_messages",
    "AgentConfig",
    "AssembleResult",
    "GenerateResult",
    "ValidationResult",
]
