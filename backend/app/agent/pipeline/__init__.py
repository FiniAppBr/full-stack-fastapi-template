"""
Pipeline - Pre/post processing for the ReAct agent.

Components:
- gating: Pre-agent topic filtering based on stage/rules
- validation: Post-agent response checks
- splitter: Multi-message formatting
- summarizer: History compression for token efficiency
"""

from .gating import apply_gating_rules, check_handoff_triggers
from .validation import validate_response
from .splitter import split_response_messages
from .summarizer import summarize_history

__all__ = [
    "apply_gating_rules",
    "check_handoff_triggers",
    "validate_response",
    "split_response_messages",
    "summarize_history",
]
