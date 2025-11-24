"""
v3 Agents - Agent-specific configurations.

Each agent is a data-only config that extends BaseAgentConfig.
The pipeline code is shared across all agents.
"""

from app.agent.v3.agents.nina import NINA_CONFIG, create_nina_state

__all__ = ["NINA_CONFIG", "create_nina_state"]
