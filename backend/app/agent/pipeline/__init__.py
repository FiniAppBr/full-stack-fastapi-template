"""
Pipeline Stages - 6-stage context assembly and response generation.

1. EXTRACT - 2x2 state extraction from message
2. ASSEMBLE - Rules + RAG + trait filtering -> context
3. GENERATE - LLM response generation
4. VALIDATE - Post-response constraint checking
5. EXECUTE - Tool execution
6. FORMAT - Multi-turn splitting, style

Also includes:
- summarizer: History compression for token efficiency
"""

from .extract import extract, AgentConfig
from .assemble import assemble, AssembleResult, format_context
from .generate import generate, GenerateResult
from .validate import validate, ValidationResult
from .execute import execute, register_tool
from .format import split_response_messages
from .summarizer import summarize_history, should_summarize

__all__ = [
    # Pipeline stages
    "extract",
    "assemble",
    "format_context",
    "generate",
    "validate",
    "execute",
    "split_response_messages",
    # Results
    "AgentConfig",
    "AssembleResult",
    "GenerateResult",
    "ValidationResult",
    # Utilities
    "summarize_history",
    "should_summarize",
    "register_tool",
]
