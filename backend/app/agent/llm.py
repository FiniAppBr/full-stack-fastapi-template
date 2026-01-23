"""
LLM client configuration for the agent pipeline.

Single responsibility: Provide LLM clients (OpenRouter via OpenAI SDK and LangChain).
"""

import os
from typing import Optional

from openai import OpenAI
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI


# =============================================================================
# CONFIGURATION
# =============================================================================

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Model configuration
EXTRACTION_MODEL = "google/gemini-2.5-flash-lite"  # Fast, cheap for structured extraction
GENERATION_MODEL = "google/gemini-2.5-flash-lite"  # Default for generation
VALIDATION_MODEL = "google/gemini-2.5-flash-lite"  # Cheap for validation checks

# Provider configuration - Chutes for speed
PROVIDER_CONFIG = {
    "order": ["Chutes"],
    "allow_fallbacks": True,
}


# =============================================================================
# OPENAI SDK CLIENT (for direct API calls)
# =============================================================================

_client: Optional[OpenAI] = None


def get_openrouter_client() -> OpenAI:
    """Get or create shared OpenRouter client (OpenAI SDK)."""
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


# =============================================================================
# LANGCHAIN CLIENT (for pipeline nodes)
# =============================================================================

def get_chat_llm(
    model: str,
    temperature: float = 0.7,
    max_tokens: int = 500
) -> ChatOpenAI:
    """
    Get ChatOpenAI configured for OpenRouter.

    Args:
        model: Model identifier (e.g., "google/gemini-2.5-flash-lite")
        temperature: Sampling temperature (0.0 - 1.0)
        max_tokens: Maximum tokens in response

    Returns:
        Configured ChatOpenAI instance
    """
    return ChatOpenAI(
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        openai_api_key=os.getenv("OPENROUTER_API_KEY"),
        openai_api_base=OPENROUTER_BASE_URL,
        default_headers={
            "HTTP-Referer": "https://connectai.com",
            "X-Title": "ConnectAI Agent",
        }
    )


# =============================================================================
# STRUCTURED OUTPUT SCHEMAS
# =============================================================================

def create_response_schema(min_messages: int, max_messages: int):
    """
    Create response schema with dynamic constraints.

    Args:
        min_messages: Minimum number of message bubbles
        max_messages: Maximum number of message bubbles

    Returns:
        Pydantic model class for structured output
    """
    class AgentResponse(BaseModel):
        """Structured response from the agent."""
        thinking: str = Field(
            description="Brief internal reasoning (not shown to user)"
        )
        messages: list[str] = Field(
            description=(
                f"MUST have {min_messages} to {max_messages} messages. "
                "Each message is a separate WhatsApp bubble. "
                "Split your response naturally - do NOT put everything in one message. "
                f"Aim for {min_messages}-{(min_messages + max_messages) // 2} messages minimum."
            ),
            min_length=min_messages,
            max_length=max_messages
        )
    return AgentResponse


def create_extraction_schema(fields: list[dict]):
    """
    Create dynamic extraction schema based on configured fields.

    Args:
        fields: List of field configs with id, description, necessity

    Returns:
        Pydantic model class for structured extraction
    """
    field_descriptions = []
    for f in fields:
        field_id = f.get("id", f.get("field_id", "unknown"))
        hint = f.get("collection_hint", f.get("description", ""))
        necessity = f.get("necessity", "optional")
        field_descriptions.append(f"- {field_id}: {hint} ({necessity})")

    fields_text = "\n".join(field_descriptions) if field_descriptions else "No specific fields configured"

    class ExtractedData(BaseModel):
        """Data extracted from the conversation."""
        extracted: dict = Field(
            default_factory=dict,
            description=f"Key-value pairs of extracted data. Fields to look for:\n{fields_text}"
        )
    return ExtractedData
