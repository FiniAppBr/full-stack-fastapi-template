"""
Agent System v3 - LangGraph-based ReAct agents.

Architecture:
- v3/graph.py: Main LangGraph pipeline (assemble → agent → tools → respond → post_process)
- v3/prompts.py: System prompt template
- v3/config.py: BaseAgentConfig configuration
- v3/db_loader.py: Load NeoAgent from DB → BaseAgentConfig
- tools/: Agent tools (handoff, search, booking, etc.)
"""

from .checkpointer import get_checkpointer

__all__ = [
    "get_checkpointer",
]
