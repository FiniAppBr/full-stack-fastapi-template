"""
Shared LLM client for agent pipeline.
Single OpenRouter client used by all pipeline stages.
"""

import os
from typing import Optional

from openai import OpenAI


# OpenRouter configuration
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Model configuration
EXTRACTION_MODEL = "google/gemini-2.5-flash-lite"  # Fast, cheap for structured extraction
GENERATION_MODEL = "google/gemini-2.5-flash-lite"  # Better for natural responses

# Legacy alias
DEFAULT_MODEL = GENERATION_MODEL

# Provider configuration - Chutes for speed
PROVIDER_CONFIG = {
    "order": ["Chutes"],
    "allow_fallbacks": True,
}

# Singleton client
_client: Optional[OpenAI] = None


def get_openrouter_client() -> OpenAI:
    """Get or create shared OpenRouter client."""
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=os.getenv("OPENROUTER_API_KEY"),
            base_url=OPENROUTER_BASE_URL,
            default_headers={
                "HTTP-Referer": "https://connectai.com",
                "X-Title": "ConnectAI Nina",
            }
        )
    return _client


def get_provider_extra_body() -> dict:
    """Get extra_body with provider config for API calls."""
    return {"provider": PROVIDER_CONFIG}
