"""
v3 Config - Base configuration class for all agents.

Agent-specific configs inherit from BaseAgentConfig and provide their own data.
The pipeline code uses this interface generically.
"""

from typing import Any, Optional
from pydantic import BaseModel, Field

from app.agent.v3.schema import (
    Trait,
    IntentType,
    ObjectionType,
    Objective,
    Event,
    ConversationExample,
    Guardrails,
    EscalationTrigger,
    AgentState,
)


# =============================================================================
# TYPING CONFIG - WhatsApp-style message timing
# =============================================================================

class TypingConfig(BaseModel):
    """Configuration for typing simulation."""
    enabled: bool = True
    base_ms: int = 800
    per_char_ms: int = 30
    max_delay_ms: int = 3000
    between_messages_ms: int = 500


# =============================================================================
# MULTI-MESSAGE CONFIG
# =============================================================================

class MultiMessageConfig(BaseModel):
    """Configuration for multi-message responses."""
    enabled: bool = True
    max_messages: int = 4
    preferred_messages: int = 2
    typing: TypingConfig = Field(default_factory=TypingConfig)


# =============================================================================
# EXTRACTION CONFIG
# =============================================================================

class ExtractionConfig(BaseModel):
    """Configuration for extraction stage."""
    model: str = "google/gemini-2.0-flash-001"
    temperature: float = 0.1
    history_turns: int = 3  # Turns to include in extraction context


# =============================================================================
# GENERATION CONFIG
# =============================================================================

class GenerationConfig(BaseModel):
    """Configuration for generation stage."""
    model: str = "google/gemini-2.0-flash-001"
    temperature: float = 0.7
    max_tokens: int = 500
    history_turns: int = 5  # Turns to include in generation context


# =============================================================================
# ASSEMBLY CONFIG
# =============================================================================

class AssemblyConfig(BaseModel):
    """Configuration for assembly stage."""
    token_budget: int = 1500
    base_search_limit: int = 5
    boost_search_limit: int = 2
    similarity_threshold: float = 0.3  # Lowered from 0.4 to catch entity chunks
    max_examples: int = 2


# =============================================================================
# BASE AGENT CONFIG
# =============================================================================

class BaseAgentConfig(BaseModel):
    """
    Base configuration for all agents.

    Agent-specific configs extend this with their own data.
    The pipeline code uses this interface.
    """

    # Identity
    agent_id: str
    agent_name: str
    agent_description: str
    agent_slug: Optional[str] = None  # Used for RAG lookup (e.g., "nina"). Falls back to agent_name.lower()
    linked_entities: list[int] = Field(default_factory=list)  # Entity IDs this agent can access
    enabled_tool_categories: list[str] = Field(default_factory=list)  # Tool categories: calendar, inventory, pipeline, kanban
    language: str = "pt"

    def get_rag_agent_id(self) -> str:
        """Get the agent ID to use for RAG queries (legacy knowledge chunks)."""
        return self.agent_slug or self.agent_name.lower()

    def get_entity_agent_ids(self) -> list[str]:
        """Get agent_ids for entity-based chunks (e.g., ['entity:1', 'entity:2'])."""
        return [f"entity:{eid}" for eid in self.linked_entities]

    # Product/Business data (agent provides this)
    product: dict[str, Any] = Field(default_factory=dict)

    # Trait definitions
    traits: list[Trait] = Field(default_factory=list)

    # Intent types (what the user might be doing)
    intents: list[IntentType] = Field(default_factory=list)

    # Objection types (for sales/support)
    objection_types: list[ObjectionType] = Field(default_factory=list)

    # Objectives (what to achieve)
    objectives: list[Objective] = Field(default_factory=list)

    # Events to track
    events: list[Event] = Field(default_factory=list)

    # Few-shot examples
    examples: list[ConversationExample] = Field(default_factory=list)

    # Guardrails
    guardrails: Guardrails = Field(default_factory=Guardrails)

    # Escalation triggers
    escalation_triggers: list[EscalationTrigger] = Field(default_factory=list)

    # Stage configs
    extraction: ExtractionConfig = Field(default_factory=ExtractionConfig)
    generation: GenerationConfig = Field(default_factory=GenerationConfig)
    assembly: AssemblyConfig = Field(default_factory=AssemblyConfig)
    multi_message: MultiMessageConfig = Field(default_factory=MultiMessageConfig)

    # Custom product summary (agent can provide pre-formatted summary)
    product_summary: Optional[str] = None

    # ==========================================================================
    # HELPER METHODS
    # ==========================================================================

    def get_trait_ids(self) -> list[str]:
        """Get all trait IDs."""
        return [t.id for t in self.traits]

    def get_trait(self, trait_id: str) -> Optional[Trait]:
        """Get trait definition by ID."""
        for t in self.traits:
            if t.id == trait_id:
                return t
        return None

    def get_intent_ids(self) -> list[str]:
        """Get all intent IDs."""
        return [i.id for i in self.intents]

    def get_objection_type_ids(self) -> list[str]:
        """Get all objection type IDs."""
        return [o.id for o in self.objection_types]

    def get_event_ids(self) -> list[str]:
        """Get all event IDs."""
        return [e.id for e in self.events]

    def get_event(self, event_id: str) -> Optional[Event]:
        """Get event definition by ID."""
        for e in self.events:
            if e.id == event_id:
                return e
        return None

    def create_initial_state(self, thread_id: str) -> AgentState:
        """Create initial state for a new conversation."""
        return AgentState(
            agent_id=self.agent_id,
            thread_id=thread_id,
            traits={t.id: None for t in self.traits},
            events={e.id: False for e in self.events},
            objections_raised=[],
            turn_count=0,
            history=[]
        )

    def get_unfulfilled_objectives(self, state: AgentState) -> list[Objective]:
        """Get objectives that haven't been fulfilled yet."""
        unfulfilled = []
        for obj in self.objectives:
            if obj.is_trait_objective():
                trait_id = obj.get_target_id()
                if not state.get_trait(trait_id):
                    unfulfilled.append(obj)
            elif obj.is_event_objective():
                event_id = obj.get_target_id()
                if not state.get_event(event_id):
                    unfulfilled.append(obj)
        return unfulfilled

    def select_examples(
        self,
        intent: str,
        state: AgentState
    ) -> list[ConversationExample]:
        """Select relevant few-shot examples based on context."""
        selected = []

        for example in self.examples:
            # Check turn range
            if not (example.match_turn_range[0] <= state.turn_count <= example.match_turn_range[1]):
                continue

            # Check intent match
            if example.match_intents and intent not in example.match_intents:
                continue

            # Check trait match
            trait_match = True
            for trait_id, expected_value in example.match_traits.items():
                if state.get_trait(trait_id) != expected_value:
                    trait_match = False
                    break
            if not trait_match:
                continue

            selected.append(example)

            if len(selected) >= self.assembly.max_examples:
                break

        return selected

    def get_rag_boost_labels(self, intent: str) -> list[str]:
        """Get labels to boost in RAG based on intent."""
        for intent_def in self.intents:
            if intent_def.id == intent:
                return intent_def.rag_boost_labels
        return []

    def build_extraction_schema(self) -> dict:
        """Build JSON schema for extraction structured output."""
        # Trait properties
        trait_props = {t.id: t.to_schema_property() for t in self.traits}

        # Intent enum (for array items)
        intent_enum = self.get_intent_ids() + ["unknown"]

        # Objection type enum
        objection_enum = self.get_objection_type_ids() + [None]

        return {
            "type": "json_schema",
            "json_schema": {
                "name": "extraction_result",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "trait_updates": {
                            "type": "object",
                            "properties": trait_props,
                            "required": list(trait_props.keys()),
                            "additionalProperties": False
                        },
                        "intents": {
                            "type": "array",
                            "items": {
                                "type": "string",
                                "enum": intent_enum
                            },
                            "minItems": 1,
                            "description": "All intents detected in the message"
                        },
                        "search_query": {
                            "type": "string",
                            "description": "Context-aware search query for RAG"
                        },
                        "objection_type": {
                            "type": ["string", "null"],
                            "enum": objection_enum
                        }
                    },
                    "required": ["trait_updates", "intents", "search_query", "objection_type"],
                    "additionalProperties": False
                }
            }
        }

    def build_generation_schema(self) -> dict:
        """Build JSON schema for generation structured output."""
        return {
            "type": "json_schema",
            "json_schema": {
                "name": "agent_response",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "messages": {
                            "type": "array",
                            "items": {"type": "string"},
                            "minItems": 1,
                            "maxItems": self.multi_message.max_messages
                        }
                    },
                    "required": ["messages"],
                    "additionalProperties": False
                }
            }
        }

    def format_product_summary(self) -> str:
        """Format product data for prompt injection."""
        # Use custom summary if provided
        if self.product_summary:
            return self.product_summary

        # Default formatting
        if not self.product:
            return "Nenhum produto configurado."

        lines = []
        for key, value in self.product.items():
            if isinstance(value, list):
                lines.append(f"- {key}: {', '.join(str(v) for v in value)}")
            else:
                lines.append(f"- {key}: {value}")
        return "\n".join(lines)
