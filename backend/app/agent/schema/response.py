"""
Response Schema - Structured output for agent responses.

Uses Pydantic for type-safe, validated responses from LLM.
"""

from pydantic import BaseModel, Field


class AgentResponse(BaseModel):
    """Structured response from agent generation.

    Forces LLM to return messages as a list, avoiding
    unreliable text-based splitting.
    """
    messages: list[str] = Field(
        ...,
        min_length=1,
        max_length=4,
        description="List of short messages, WhatsApp style. Each message = one thought."
    )
