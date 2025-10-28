"""
Custom Model Provider for OpenRouter
"""
from typing import Optional
from agents import Model, ModelProvider, OpenAIChatCompletionsModel
from openai import AsyncOpenAI
import os

# Create OpenRouter client
openrouter_client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)


class OpenRouterModelProvider(ModelProvider):
    """Model provider that routes all requests through OpenRouter"""

    def get_model(self, model_name: Optional[str]) -> Model:
        """Get model configured to use OpenRouter"""
        model = OpenAIChatCompletionsModel(
            model=model_name if model_name else "google/gemini-2.0-flash-exp",
            openai_client=openrouter_client,
        )
        return model
