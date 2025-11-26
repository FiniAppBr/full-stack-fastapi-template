"""
v3 Run - Main orchestration function for agent conversations.

Uses LangGraph pipeline: assemble → agent ⟷ tools → post_process
"""

from typing import Optional
from app.agent.v3.schema import AgentState, MessageWithTiming
from app.agent.v3.config import BaseAgentConfig
from app.agent.v3.graph import run_turn_with_graph


class TurnResult:
    """Result of processing a single turn."""
    def __init__(
        self,
        messages: list[MessageWithTiming],
        state: AgentState,
        tokens_used: int = 0
    ):
        self.messages = messages
        self.state = state
        self.tokens_used = tokens_used

    def get_plain_messages(self) -> list[str]:
        """Get just the message strings without timing."""
        return [m.content for m in self.messages]

    def to_dict(self) -> dict:
        """Convert to dictionary for API response."""
        return {
            "messages": [
                {
                    "content": m.content,
                    "typing_delay_ms": m.typing_delay_ms,
                    "pause_after_ms": m.pause_after_ms
                }
                for m in self.messages
            ],
            "tokens_used": self.tokens_used,
            "state": {
                "turn_count": self.state.turn_count,
                "history_length": len(self.state.history)
            }
        }


def run_turn(
    config: BaseAgentConfig,
    thread_id: str,
    message: str,
    initial_state: Optional[AgentState] = None
) -> dict:
    """
    Process a single conversation turn using LangGraph.

    Args:
        config: Agent configuration
        thread_id: Thread ID for state persistence
        message: User's message
        initial_state: Optional initial state

    Returns:
        Dict with messages, state, tokens_used
    """
    return run_turn_with_graph(config, thread_id, message, initial_state)
