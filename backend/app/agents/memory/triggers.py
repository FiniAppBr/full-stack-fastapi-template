"""
Smart Memory Triggers
Implements hybrid memory strategy to reduce Mem0 calls by 80%
"""
from datetime import datetime, timedelta
from typing import Literal
from dataclasses import dataclass
from app.agents.config import OptimizationConfig


@dataclass
class MemoryTrigger:
    """
    Tracks conversation state to determine when to save memory.

    Usage:
        trigger = MemoryTrigger(customer_id="123", config=config)
        trigger.add_turn()
        if trigger.should_save(memory_worthy=True):
            # Save to Mem0
    """

    customer_id: str
    config: OptimizationConfig
    turn_count: int = 0
    last_activity: datetime | None = None
    conversation_ended: bool = False

    def add_turn(self) -> None:
        """Record a new conversation turn"""
        self.turn_count += 1
        self.last_activity = datetime.now()

    def mark_ended(self) -> None:
        """Mark conversation as ended (called by end-of-conversation endpoint)"""
        self.conversation_ended = True

    def should_save(
        self,
        memory_worthy: bool = False,
        force: bool = False
    ) -> tuple[bool, str]:
        """
        Determine if memory should be saved based on hybrid strategy.

        Args:
            memory_worthy: Agent flagged this turn as containing important info
            force: Force save regardless of strategy (e.g., end-of-conversation)

        Returns:
            (should_save: bool, reason: str)
        """
        if force:
            return (True, "forced")

        # Strategy: disabled
        if self.config.memory.strategy == "disabled":
            return (False, "memory_disabled")

        # Strategy: always (legacy behavior)
        if self.config.memory.strategy == "always":
            return (True, "always_strategy")

        # Strategy: hybrid (smart triggers)
        # Skip if conversation is too short
        if self.turn_count < self.config.memory.min_turns:
            return (False, f"too_few_turns_{self.turn_count}")

        # Trigger 1: End of conversation (via API endpoint)
        if self.conversation_ended:
            return (True, "end_of_conversation")

        # Trigger 2: Turn threshold reached
        if self.turn_count >= self.config.memory.turn_threshold:
            return (True, f"turn_threshold_{self.turn_count}")

        # Trigger 3: Agent flagged memory-worthy content
        if self.config.memory.respect_agent_flag and memory_worthy:
            return (True, "agent_flagged")

        # Trigger 4: Inactivity timeout (if last_activity is set)
        if self.last_activity:
            inactive_seconds = (datetime.now() - self.last_activity).total_seconds()
            if inactive_seconds >= self.config.memory.inactivity_seconds:
                return (True, f"inactivity_{int(inactive_seconds)}s")

        return (False, "no_trigger")


def should_save_memory(
    customer_id: str,
    turn_count: int,
    memory_worthy: bool,
    conversation_ended: bool,
    config: OptimizationConfig,
    last_activity: datetime | None = None,
) -> tuple[bool, str]:
    """
    Stateless helper function for memory save decision.

    Use this when you don't want to maintain a MemoryTrigger instance.

    Returns:
        (should_save: bool, reason: str)

    Example:
        should_save, reason = should_save_memory(
            customer_id="123",
            turn_count=5,
            memory_worthy=True,
            conversation_ended=False,
            config=config
        )
        if should_save:
            await save_to_mem0()
    """
    trigger = MemoryTrigger(customer_id=customer_id, config=config)
    trigger.turn_count = turn_count
    trigger.last_activity = last_activity
    if conversation_ended:
        trigger.mark_ended()

    return trigger.should_save(memory_worthy=memory_worthy)
