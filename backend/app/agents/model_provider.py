"""
Custom Model Provider for OpenRouter
"""
from typing import Optional
from agents import Model, ModelProvider, OpenAIChatCompletionsModel
from openai import AsyncOpenAI
import os

# Lazy-load OpenRouter client
def get_openrouter_client():
    """Initialize OpenRouter client lazily to avoid env var issues at import time"""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable is not set")

    return AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
        default_headers={
            "HTTP-Referer": "https://connectai.app",  # Optional: for rankings
            "X-Title": "ConnectAI",  # Shows in OpenRouter dashboard
        },
    )


class OpenRouterModelProvider(ModelProvider):
    """Model provider that routes all requests through OpenRouter"""

    def get_model(self, model_name: Optional[str]) -> Model:
        """Get model configured to use OpenRouter"""
        model = OpenAIChatCompletionsModel(
            model=model_name if model_name else "google/gemini-2.0-flash-exp",
            openai_client=get_openrouter_client(),
        )
        return model
