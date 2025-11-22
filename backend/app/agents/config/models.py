"""
Centralized model configuration.
All LLM and embedding model names in one place.
"""
import os
from dataclasses import dataclass


@dataclass
class ModelConfig:
    """Model configuration with defaults."""

    # OpenAI models
    chat_model: str = "gpt-4o-mini"
    extraction_model: str = "gpt-4o-mini"

    # Voyage AI models
    embedding_model: str = "voyage-3.5"

    # Vision models (via OpenRouter)
    vision_model_primary: str = "google/gemini-2.0-flash-exp:free"
    vision_model_fallback: str = "openai/gpt-4o-mini"

    # Temperature defaults
    chat_temperature: float = 0.7
    extraction_temperature: float = 0.1

    # Token limits
    chat_max_tokens: int = 300

    @classmethod
    def from_env(cls) -> "ModelConfig":
        """Load config from environment variables with defaults."""
        return cls(
            chat_model=os.getenv("CHAT_MODEL", cls.chat_model),
            extraction_model=os.getenv("EXTRACTION_MODEL", cls.extraction_model),
            embedding_model=os.getenv("EMBEDDING_MODEL", cls.embedding_model),
            vision_model_primary=os.getenv("VISION_MODEL_PRIMARY", cls.vision_model_primary),
            vision_model_fallback=os.getenv("VISION_MODEL_FALLBACK", cls.vision_model_fallback),
        )


# Global config instance
models = ModelConfig.from_env()
