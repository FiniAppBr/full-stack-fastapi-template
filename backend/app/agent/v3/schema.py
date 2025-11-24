"""
v3 Schema - Base types for all agents.

These are the building blocks that agent configs use to define their specific behavior.
The pipeline code works with these types generically.
"""

from typing import Optional, Any
from pydantic import BaseModel, Field


# =============================================================================
# TRAIT - What we learn about the user (persistent across turns)
# =============================================================================

class Trait(BaseModel):
    """Definition of a trait to extract from conversation."""
    id: str
    type: str = "string"  # string, enum, boolean
    options: list[str] = Field(default_factory=list)  # For enum types
    extract_hint: str = ""  # Guidance for extraction LLM

    def to_schema_property(self) -> dict:
        """Convert to JSON schema property for structured output."""
        if self.type == "enum" and self.options:
            return {
                "type": ["string", "null"],
                "enum": self.options + [None],
                "description": self.extract_hint
            }
        elif self.type == "boolean":
            return {
                "type": ["boolean", "null"],
                "description": self.extract_hint
            }
        else:
            return {
                "type": ["string", "null"],
                "description": self.extract_hint
            }


# =============================================================================
# INTENT - What the user is doing right now (per-message)
# =============================================================================

class IntentType(BaseModel):
    """Definition of an intent type the agent can detect."""
    id: str
    description: str
    rag_boost_labels: list[str] = Field(default_factory=list)  # Labels to boost in RAG


# =============================================================================
# OBJECTION - Resistance/concern types (for sales/support agents)
# =============================================================================

class ObjectionType(BaseModel):
    """Definition of an objection type."""
    id: str
    description: str
    keywords: list[str] = Field(default_factory=list)  # Detection keywords


# =============================================================================
# OBJECTIVE - What we want to achieve
# =============================================================================

class Objective(BaseModel):
    """A goal the agent should work toward."""
    target: str  # e.g., "trait.customer_name" or "event.price_revealed"
    hint: str  # Guidance shown to LLM
    priority: int = 50  # Lower = more important (optional ordering)

    def is_trait_objective(self) -> bool:
        return self.target.startswith("trait.")

    def is_event_objective(self) -> bool:
        return self.target.startswith("event.")

    def get_target_id(self) -> str:
        """Get the ID portion (after 'trait.' or 'event.')"""
        return self.target.split(".", 1)[1] if "." in self.target else self.target


# =============================================================================
# EVENT - Simple boolean tracking (set by extraction or post-process)
# =============================================================================

class Event(BaseModel):
    """Definition of a trackable event."""
    id: str
    description: str = ""
    detect_on_extraction: bool = False  # Set via extraction intent
    detect_regex: Optional[str] = None  # Set via regex on response
    trigger_intents: list[str] = Field(default_factory=list)  # Intents that trigger this


# =============================================================================
# CONVERSATION EXAMPLE - Few-shot learning
# =============================================================================

class ExampleMessage(BaseModel):
    """A single message in an example conversation."""
    role: str  # "user" or "assistant"
    content: str


class ConversationExample(BaseModel):
    """A few-shot conversation example."""
    id: str
    scenario: str  # Human-readable scenario description
    demonstrates: list[str] = Field(default_factory=list)  # What patterns it shows
    context: str = ""  # Context description for selection logic
    messages: list[ExampleMessage]
    bad_example: Optional[str] = None  # What NOT to do

    # Selection criteria
    match_intents: list[str] = Field(default_factory=list)
    match_traits: dict[str, Any] = Field(default_factory=dict)
    match_turn_range: tuple[int, int] = (0, 999)  # (min_turn, max_turn)


# =============================================================================
# GUARDRAILS - Behavioral constraints
# =============================================================================

class Guardrails(BaseModel):
    """Behavioral guardrails for the agent."""
    never_say: list[str] = Field(default_factory=list)
    never_do: list[str] = Field(default_factory=list)
    always_do: list[str] = Field(default_factory=list)
    conditional: dict[str, str] = Field(default_factory=dict)  # condition -> rule


# =============================================================================
# ESCALATION - When to hand off
# =============================================================================

class EscalationTrigger(BaseModel):
    """Condition for escalating to human."""
    condition: str  # e.g., "intent == 'wants_human'"
    action: str  # e.g., "handoff", "offer_handoff"
    response: list[str] = Field(default_factory=list)  # Messages to send


# =============================================================================
# PIPELINE RESULTS
# =============================================================================

class ExtractionResult(BaseModel):
    """Result from extraction stage."""
    trait_updates: dict[str, Any] = Field(default_factory=dict)
    intent: str = "unknown"
    objection_type: Optional[str] = None
    raw_response: Optional[dict] = None
    tokens_used: int = 0


class ChunkMatch(BaseModel):
    """A matched RAG chunk."""
    id: int
    content: str
    title: Optional[str] = None
    labels: list[str] = Field(default_factory=list)
    score: float = 0.0
    token_count: int = 0


class AssembleResult(BaseModel):
    """Result from assembly stage."""
    chunks: list[ChunkMatch] = Field(default_factory=list)
    examples: list[ConversationExample] = Field(default_factory=list)
    total_tokens: int = 0


class GenerateResult(BaseModel):
    """Result from generation stage."""
    messages: list[str] = Field(default_factory=list)
    tokens_used: int = 0
    raw_response: Optional[dict] = None


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
    # Identity
    agent_id: str
    thread_id: str

    # Learned traits
    traits: dict[str, Any] = Field(default_factory=dict)

    # Tracked events
    events: dict[str, bool] = Field(default_factory=dict)

    # Objection history
    objections_raised: list[str] = Field(default_factory=list)

    # Conversation tracking
    turn_count: int = 0

    # Message history (last N turns)
    history: list[dict] = Field(default_factory=list)

    def get_trait(self, trait_id: str) -> Any:
        return self.traits.get(trait_id)

    def set_trait(self, trait_id: str, value: Any):
        if value is not None:
            self.traits[trait_id] = value

    def get_event(self, event_id: str) -> bool:
        return self.events.get(event_id, False)

    def set_event(self, event_id: str, value: bool = True):
        self.events[event_id] = value

    def add_objection(self, objection_type: str):
        if objection_type and objection_type not in self.objections_raised:
            self.objections_raised.append(objection_type)

    def add_to_history(self, role: str, content: str):
        self.history.append({"role": role, "content": content})

    def get_recent_history(self, turns: int = 5) -> list[dict]:
        """Get last N turns (2*N messages)."""
        return self.history[-(turns * 2):] if self.history else []
