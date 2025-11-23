"""
OpenAI Client - Chat and extraction models.

Centralized configuration for all OpenAI API calls.
"""
import os
from dataclasses import dataclass
from openai import OpenAI

_client = None


@dataclass
class ModelConfig:
    """Model configuration with defaults."""

    # OpenAI models
    chat_model: str = "gpt-4o-mini"
    extraction_model: str = "gpt-4o-mini"

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
        )


# Global config instance
models = ModelConfig.from_env()


def get_openai_client() -> OpenAI:
    """Get or create OpenAI client."""
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client
