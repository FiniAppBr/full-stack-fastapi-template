"""
Optimization Configuration for ConnectAI Agents
Centralizes all token optimization settings
"""
from dataclasses import dataclass, field
from typing import Literal


@dataclass
class MemoryConfig:
    """Smart memory trigger configuration"""
    strategy: Literal["hybrid", "disabled", "always"] = "hybrid"
    # Hybrid strategy settings
    turn_threshold: int = 10  # Save after N turns
    inactivity_seconds: int = 180  # 3 minutes
    min_turns: int = 2  # Don't save if conversation < 2 turns
    # Allow agent to flag memory-worthy content
    respect_agent_flag: bool = True


@dataclass
class RAGConfig:
    """RAG retrieval configuration"""
    top_k: int = 3  # Reduced from 5 for token savings
    similarity_threshold: float = 0.4  # Raised from 0.3 for quality
    max_context_tokens: int = 500  # Hard limit on RAG context size


@dataclass
class ResponseConfig:
    """Response generation configuration"""
    max_length: Literal["concise", "normal", "detailed"] = "concise"
    language: str = "pt-BR"  # Brazilian Portuguese
    tone: Literal["professional", "casual", "warm"] = "warm"


@dataclass
class HandoffConfig:
    """Human handoff configuration"""
    enabled: bool = True
    notify_on_complaint: bool = True
    notify_on_emergency: bool = True
    notify_on_frustrated: bool = True
    # Notification channels
    slack_webhook: str | None = None
    email_recipient: str | None = None
    whatsapp_number: str | None = None


@dataclass
class ToolsConfig:
    """Function tools configuration"""
    booking_enabled: bool = False
    payment_links_enabled: bool = False
    # Integration settings
    calendar_integration: Literal["google_calendar", "microsoft", "none"] = "none"
    payment_provider: Literal["stripe", "paypal", "none"] = "none"


@dataclass
class OptimizationConfig:
    """
    Master configuration for agent optimization.

    Usage:
        config = OptimizationConfig()  # Use defaults
        config = OptimizationConfig(
            memory=MemoryConfig(strategy="hybrid"),
            rag=RAGConfig(top_k=3)
        )
    """
    memory: MemoryConfig = field(default_factory=MemoryConfig)
    rag: RAGConfig = field(default_factory=RAGConfig)
    response: ResponseConfig = field(default_factory=ResponseConfig)
    handoff: HandoffConfig = field(default_factory=HandoffConfig)
    tools: ToolsConfig = field(default_factory=ToolsConfig)

    # Model settings
    model: str = "gpt-4o-mini"
    enable_tracing: bool = False

    @classmethod
    def from_dict(cls, data: dict) -> "OptimizationConfig":
        """Load config from dictionary (e.g., from database)"""
        return cls(
            memory=MemoryConfig(**data.get("memory", {})),
            rag=RAGConfig(**data.get("rag", {})),
            response=ResponseConfig(**data.get("response", {})),
            handoff=HandoffConfig(**data.get("handoff", {})),
            tools=ToolsConfig(**data.get("tools", {})),
            model=data.get("model", "gpt-4o-mini"),
            enable_tracing=data.get("enable_tracing", False),
        )

    def to_dict(self) -> dict:
        """Serialize config to dictionary (e.g., for database storage)"""
        return {
            "memory": {
                "strategy": self.memory.strategy,
                "turn_threshold": self.memory.turn_threshold,
                "inactivity_seconds": self.memory.inactivity_seconds,
                "min_turns": self.memory.min_turns,
                "respect_agent_flag": self.memory.respect_agent_flag,
            },
            "rag": {
                "top_k": self.rag.top_k,
                "similarity_threshold": self.rag.similarity_threshold,
                "max_context_tokens": self.rag.max_context_tokens,
            },
            "response": {
                "max_length": self.response.max_length,
                "language": self.response.language,
                "tone": self.response.tone,
            },
            "handoff": {
                "enabled": self.handoff.enabled,
                "notify_on_complaint": self.handoff.notify_on_complaint,
                "notify_on_emergency": self.handoff.notify_on_emergency,
                "notify_on_frustrated": self.handoff.notify_on_frustrated,
                "slack_webhook": self.handoff.slack_webhook,
                "email_recipient": self.handoff.email_recipient,
                "whatsapp_number": self.handoff.whatsapp_number,
            },
            "tools": {
                "booking_enabled": self.tools.booking_enabled,
                "payment_links_enabled": self.tools.payment_links_enabled,
                "calendar_integration": self.tools.calendar_integration,
                "payment_provider": self.tools.payment_provider,
            },
            "model": self.model,
            "enable_tracing": self.enable_tracing,
        }
