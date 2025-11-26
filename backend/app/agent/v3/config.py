"""
v3 Config - Base configuration class for all agents.

Simplified: No traits, intents, events, or examples.
"""

from typing import Any, Optional
from pydantic import BaseModel, Field

from app.agent.v3.schema import (
    Objective,
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
# GENERATION CONFIG
# =============================================================================

class GenerationConfig(BaseModel):
    """Configuration for generation stage."""
    model: str = "google/gemini-2.0-flash-001"
    temperature: float = 0.7
    max_tokens: int = 500
    history_turns: int = 5  # Turns to include in generation context


# =============================================================================
# RAG CONFIG
# =============================================================================

class RAGConfig(BaseModel):
    """Configuration for RAG/assembly stage."""
    context_turns: int = 2  # Turns to include in search query
    search_limit: int = 5
    similarity_threshold: float = 0.3


# =============================================================================
# BASE AGENT CONFIG
# =============================================================================

class BaseAgentConfig(BaseModel):
    """
    Base configuration for all agents.

    Simplified schema:
    - Identity (name, description)
    - RAG (linked_entities)
    - Behavior (objectives, guardrails, escalation)
    - Generation settings
    """

    # Identity
    agent_id: str
    agent_name: str
    agent_description: str
    agent_slug: Optional[str] = None  # For RAG lookup
    linked_entities: list[int] = Field(default_factory=list)
    enabled_tool_categories: list[str] = Field(default_factory=list)
    language: str = "pt"

    # Product/Business data
    product: dict[str, Any] = Field(default_factory=dict)
    product_summary: Optional[str] = None

    # Objectives (optional guidance shown to LLM)
    objectives: list[Objective] = Field(default_factory=list)

    # Guardrails
    guardrails: Guardrails = Field(default_factory=Guardrails)

    # Escalation triggers (evaluated by LLM)
    escalation_triggers: list[EscalationTrigger] = Field(default_factory=list)

    # Stage configs
    generation: GenerationConfig = Field(default_factory=GenerationConfig)
    rag: RAGConfig = Field(default_factory=RAGConfig)
    multi_message: MultiMessageConfig = Field(default_factory=MultiMessageConfig)

    # ==========================================================================
    # HELPER METHODS
    # ==========================================================================

    def get_rag_agent_id(self) -> str:
        """Get the agent ID to use for RAG queries."""
        return self.agent_slug or self.agent_name.lower()

    def get_entity_agent_ids(self) -> list[str]:
        """Get agent_ids for entity-based chunks."""
        return [f"entity:{eid}" for eid in self.linked_entities]

    def create_initial_state(self, thread_id: str) -> AgentState:
        """Create initial state for a new conversation."""
        return AgentState(
            agent_id=self.agent_id,
            thread_id=thread_id,
            turn_count=0,
            history=[]
        )

    def format_product_summary(self) -> str:
        """Format product data for prompt injection."""
        if self.product_summary:
            return self.product_summary
        if not self.product:
            return "Nenhum produto configurado."
        lines = [f"- {k}: {v}" for k, v in self.product.items()]
        return "\n".join(lines)

    def format_objectives(self) -> str:
        """Format objectives for prompt."""
        if not self.objectives:
            return ""
        lines = [f"- {obj.description}" for obj in sorted(self.objectives, key=lambda x: x.priority)]
        return "\n".join(lines)

    def format_escalation_triggers(self) -> str:
        """Format escalation triggers for prompt."""
        if not self.escalation_triggers:
            return ""
        lines = [f"- Se {t.condition}: {t.message or 'transferir para atendente'}" for t in self.escalation_triggers]
        return "\n".join(lines)

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
