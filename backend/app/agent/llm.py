"""
Shared LLM client for agent pipeline.
Single OpenRouter client used by all pipeline stages.
"""

import os
from typing import Optional

from openai import OpenAI


# OpenRouter configuration
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "google/gemini-2.5-flash-lite"

# Singleton client
_client: Optional[OpenAI] = None


def get_openrouter_client() -> OpenAI:
    """Get or create shared OpenRouter client."""
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=os.getenv("OPENROUTER_API_KEY"),
            base_url=OPENROUTER_BASE_URL
        )
    return _client
