"""
Neo Agent model for the new agent configuration system.

The config field uses a fully typed Pydantic schema (NeoAgentConfigSchema) that validates
and provides defaults for all configuration options. The schema is stored as JSON in the
database but validated on read/write.

Configuration Structure:
- personality: Agent personality settings (messages, length, language, emoji usage)
- models: LLM model configurations for generation and extraction
- typing: Typing indicator settings for realistic chat behavior
- data_collection: Field collection hints and priorities
- enabled_tool_categories: List of enabled tool categories
- guardrails: Behavioral rules (never_say, never_do, always_do, etc.)
- funnel: Objectives and escalation rules

All fields have sensible defaults for backward compatibility with existing data.
"""
from datetime import datetime
from typing import Optional, Literal
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON, ARRAY, String
from pydantic import BaseModel


# Config Schema Models
class PersonalityConfig(BaseModel):
    """Personality configuration for the agent."""
    min_messages: int = 2
    max_messages: int = 6
    max_response_length: int = 200
    language: str = "pt-BR"
    emoji_usage: Literal["disabled", "minimal", "moderate", "frequent"] = "minimal"


class ModelConfig(BaseModel):
    """Configuration for a single model."""
    model: str = "google/gemini-2.5-flash-lite"
    temperature: float = 0.7


class ModelsConfig(BaseModel):
    """Models configuration for generation and extraction."""
    generation: ModelConfig = Field(default_factory=ModelConfig)
    extraction: Optional[ModelConfig] = None


class TypingConfig(BaseModel):
    """Typing indicator configuration."""
    enabled: bool = True
    base_ms: int = 800
    per_char_ms: int = 30
    max_delay_ms: int = 5000


class DataCollectionField(BaseModel):
    """Configuration for a single data collection field."""
    field_id: Optional[int] = None
    necessity: Literal["required", "recommended", "optional"] = "optional"
    collection_hint: Optional[str] = ""


class DataCollectionConfig(BaseModel):
    """Data collection configuration."""
    fields: list[DataCollectionField] = Field(default_factory=list)


class GuardrailsConfig(BaseModel):
    """Guardrails configuration for agent behavior."""
    never_say: list[str] = Field(default_factory=list)
    never_do: list[str] = Field(default_factory=list)
    always_do: list[str] = Field(default_factory=list)
    avoid_topics: list[str] = Field(default_factory=list)
    escalation_triggers: list[str] = Field(default_factory=list)


class ObjectiveConfig(BaseModel):
    """Configuration for a funnel objective."""
    # Support both old format (name/description) and new format (objective)
    id: Optional[str] = None
    name: Optional[str] = None
    objective: Optional[str] = None
    description: Optional[str] = None
    priority: int = 0
    context: str = ""


class EscalationRule(BaseModel):
    """Configuration for an escalation rule."""
    condition: str
    # Support both old format (message) and new format (action)
    action: Optional[str] = None
    message: Optional[str] = None
    priority: int = 0


class FunnelConfig(BaseModel):
    """Funnel configuration for objectives and escalation."""
    objectives: list[ObjectiveConfig] = Field(default_factory=list)
    escalation_rules: list[EscalationRule] = Field(default_factory=list)


class NeoAgentConfigSchema(BaseModel):
    """Complete typed configuration schema for Neo Agent."""
    personality: PersonalityConfig = Field(default_factory=PersonalityConfig)
    models: ModelsConfig = Field(default_factory=ModelsConfig)
    typing: TypingConfig = Field(default_factory=TypingConfig)
    data_collection: DataCollectionConfig = Field(default_factory=DataCollectionConfig)
    enabled_tool_categories: list[str] = Field(default_factory=list)
    guardrails: GuardrailsConfig = Field(default_factory=GuardrailsConfig)
    funnel: FunnelConfig = Field(default_factory=FunnelConfig)


class NeoAgentBase(SQLModel):
    """Base model for Neo Agent."""
    name: str = Field(description="Agent display name")
    description: Optional[str] = Field(default=None, description="Agent description")
    template: str = Field(default="custom", description="Template ID used to create this agent")
    custom_icon: Optional[str] = Field(default=None, description="Custom icon override")
    custom_color: Optional[str] = Field(default=None, description="Custom color override")
    custom_tag: Optional[str] = Field(default=None, description="Custom tag override")
    is_active: bool = Field(default=True, description="Whether the agent is active")

    # Channels as array
    channels: list[str] = Field(
        default_factory=list,
        sa_column=Column(ARRAY(String)),
        description="List of enabled channel IDs"
    )

    # Linked entities (IDs)
    linked_entities: list[int] = Field(
        default_factory=list,
        sa_column=Column(ARRAY(String)),
        description="List of linked entity IDs"
    )

    # Configuration as JSON (stored as dict in DB, validated as NeoAgentConfigSchema)
    config: Optional[NeoAgentConfigSchema] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Agent configuration (personality, guardrails, actions)"
    )


class NeoAgent(NeoAgentBase, table=True):
    """Neo Agent database model."""
    __tablename__ = "neo_agents"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Stats (updated by system)
    stats: dict = Field(
        default_factory=lambda: {"conversations": 0, "conversions": 0, "satisfaction": 0.0},
        sa_column=Column(JSON),
        description="Agent performance stats"
    )

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class NeoAgentCreate(NeoAgentBase):
    """Schema for creating a Neo Agent."""
    pass


class NeoAgentUpdate(SQLModel):
    """Schema for updating a Neo Agent."""
    name: Optional[str] = None
    description: Optional[str] = None
    template: Optional[str] = None
    custom_icon: Optional[str] = None
    custom_color: Optional[str] = None
    custom_tag: Optional[str] = None
    is_active: Optional[bool] = None
    channels: Optional[list[str]] = None
    linked_entities: Optional[list[int]] = None
    config: Optional[NeoAgentConfigSchema] = None


class NeoAgentPublic(NeoAgentBase):
    """Schema for public Neo Agent response."""
    id: int
    stats: dict
    created_at: datetime
    updated_at: datetime
    entities_count: Optional[int] = None


class NeoAgentsPublic(SQLModel):
    """Schema for list of Neo Agents."""
    data: list[NeoAgentPublic]
    count: int
