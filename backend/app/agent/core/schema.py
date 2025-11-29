"""
v3 Schema - Core types for agents.

Simplified: No traits, intents, events, or examples.
LLM handles everything implicitly via RAG + guardrails.
"""

from typing import Optional
from pydantic import BaseModel, Field


# =============================================================================
# OBJECTIVE - What we want to achieve (shown in prompt)
# =============================================================================

class Objective(BaseModel):
    """A goal the agent should work toward."""
    id: str
    description: str  # What to achieve
    priority: int = 50  # Lower = more important


# =============================================================================
# GUARDRAILS - Behavioral constraints
# =============================================================================

class GuardrailRule(BaseModel):
    """A single guardrail rule with trigger condition."""
    text: str
    trigger: str = "always"  # always | first_turn | when_relevant


class Guardrails(BaseModel):
    """Behavioral guardrails for the agent."""
    never_say: list[GuardrailRule] = Field(default_factory=list)
    never_do: list[GuardrailRule] = Field(default_factory=list)
    always_do: list[GuardrailRule] = Field(default_factory=list)

    def filter_by_turn(self, turn_count: int) -> "Guardrails":
        """Return guardrails filtered by turn count."""
        def should_apply(rule: GuardrailRule) -> bool:
            if rule.trigger == "always":
                return True
            if rule.trigger == "first_turn":
                return turn_count <= 1
            # "when_relevant" - always include, LLM decides
            return True

        return Guardrails(
            never_say=[r for r in self.never_say if should_apply(r)],
            never_do=[r for r in self.never_do if should_apply(r)],
            always_do=[r for r in self.always_do if should_apply(r)],
        )

    @classmethod
    def from_lists(
        cls,
        always_do: list[str] = None,
        never_do: list[str] = None,
        never_say: list[str] = None
    ) -> "Guardrails":
        """Create from simple string lists (legacy support)."""
        return cls(
            always_do=[GuardrailRule(text=t) for t in (always_do or [])],
            never_do=[GuardrailRule(text=t) for t in (never_do or [])],
            never_say=[GuardrailRule(text=t) for t in (never_say or [])]
        )


# =============================================================================
# ESCALATION - When to hand off (evaluated by LLM)
# =============================================================================

class EscalationTrigger(BaseModel):
    """Condition for escalating to human."""
    condition: str  # Human-readable, e.g., "cliente pede para falar com humano"
    message: str = ""  # Message to send when triggered


# =============================================================================
# PIPELINE RESULTS
# =============================================================================

class ChunkMatch(BaseModel):
    """A matched RAG chunk."""
    id: int
    content: str
    title: Optional[str] = None
    labels: list[str] = Field(default_factory=list)
    score: float = 0.0
    token_count: int = 0
    is_entity: bool = False
    metadata: dict = Field(default_factory=dict)  # Entity capabilities, template, etc.


class AssembleResult(BaseModel):
    """Result from assembly stage."""
    chunks: list[ChunkMatch] = Field(default_factory=list)
    total_tokens: int = 0
    tool_context: str = ""  # Instructions derived from entity capabilities


class MessageWithTiming(BaseModel):
    """A message with typing simulation timing."""
    content: str
    typing_delay_ms: int = 0
    pause_after_ms: int = 0


# =============================================================================
# AGENT STATE - Runtime state persisted across turns
# =============================================================================

class AgentState(BaseModel):
    """Runtime state for an agent conversation."""
    agent_id: str
    thread_id: str
    turn_count: int = 0
    history: list[dict] = Field(default_factory=list)

    # Contact linking (for real conversations, not preview)
    contact_id: Optional[int] = None

    # Data collected during conversation (syncs to Contact.data when contact_id is set)
    collected_data: dict = Field(default_factory=dict)

    def add_to_history(self, role: str, content: str):
        self.history.append({"role": role, "content": content})

    def update_collected_data(self, key: str, value):
        """Update a collected data field."""
        self.collected_data[key] = value

    def get_recent_history(self, turns: int = 5) -> list[dict]:
        """Get last N turns (2*N messages)."""
        return self.history[-(turns * 2):] if self.history else []

    def build_search_query(self, message: str, context_turns: int = 2) -> str:
        """Build RAG search query from message + recent history."""
        recent = self.get_recent_history(context_turns)
        context = " ".join(msg["content"] for msg in recent)
        return f"{message} {context}".strip()
