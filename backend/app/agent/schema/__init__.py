"""
Context System v2 Schema - Pydantic models for agent configuration.

Primitives:
- State: Gates, Traits, Modes, Signals (2x2 extraction model)
- Rules: Conditions, AssemblyActions
- Content: Chunks with labels and trait filtering
- Tools: Executable capabilities
"""

from .state import (
    Gate,
    Trait,
    Mode,
    Signal,
    RuntimeState,
    ExtractionResult,
)
from .rules import (
    Condition,
    Clause,
    AssemblyAction,
    Rule,
)
from .content import (
    Chunk,
    ChunkMatch,
)
from .tools import (
    Tool,
    ToolCall,
    ToolResult,
)

# Resolve forward references for Gate.condition
Gate.model_rebuild()

__all__ = [
    # State primitives
    "Gate",
    "Trait",
    "Mode",
    "Signal",
    "RuntimeState",
    "ExtractionResult",
    # Rules
    "Condition",
    "Clause",
    "AssemblyAction",
    "Rule",
    # Content
    "Chunk",
    "ChunkMatch",
    # Tools
    "Tool",
    "ToolCall",
    "ToolResult",
]
