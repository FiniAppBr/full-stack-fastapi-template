"""
Structured Output Schema for Assistant Response
Replaces intent classification with actionable flags
"""
from typing import Literal
from pydantic import BaseModel, Field


class AssistantResponse(BaseModel):
    """
    Structured response from assistant agent.

    Replaces the old intent classification with actionable flags:
    - sentiment: Track customer emotion (neutral/positive/frustrated/angry)
    - requires_handoff: Boolean flag for human escalation
    - handoff_reason: WHY it needs handoff (complaint/too_complex/out_of_scope/emergency)
    - urgency: Normal vs high priority
    - memory_worthy: Should this conversation be saved to long-term memory?

    This eliminates 170 tokens from intent classification and provides
    more actionable information for business logic.
    """

    response: str = Field(
        description="The assistant's reply to the customer in Brazilian Portuguese"
    )

    sentiment: Literal["neutral", "positive", "frustrated", "angry"] = Field(
        default="neutral",
        description="Customer's emotional state based on their message"
    )

    requires_handoff: bool = Field(
        default=False,
        description="Whether this conversation should be escalated to a human agent"
    )

    handoff_reason: Literal["complaint", "too_complex", "out_of_scope", "emergency", "none"] = Field(
        default="none",
        description="Reason for handoff (if requires_handoff is True)"
    )

    urgency: Literal["normal", "high"] = Field(
        default="normal",
        description="Priority level for handling this conversation"
    )

    memory_worthy: bool = Field(
        default=False,
        description="Whether this turn contains information worth saving to long-term memory"
    )


def get_response_schema() -> dict:
    """
    Get OpenAI Agents SDK compatible response_format schema.

    Usage:
        response_agent = Agent(
            name="Assistant",
            model="gpt-4o-mini",
            response_format=get_response_schema()
        )
    """
    return {
        "type": "json_schema",
        "json_schema": {
            "name": "assistant_response",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "response": {
                        "type": "string",
                        "description": "The assistant's reply to the customer in Brazilian Portuguese"
                    },
                    "sentiment": {
                        "type": "string",
                        "enum": ["neutral", "positive", "frustrated", "angry"],
                        "description": "Customer's emotional state based on their message"
                    },
                    "requires_handoff": {
                        "type": "boolean",
                        "description": "Whether this conversation should be escalated to a human agent"
                    },
                    "handoff_reason": {
                        "type": "string",
                        "enum": ["complaint", "too_complex", "out_of_scope", "emergency", "none"],
                        "description": "Reason for handoff (if requires_handoff is True)"
                    },
                    "urgency": {
                        "type": "string",
                        "enum": ["normal", "high"],
                        "description": "Priority level for handling this conversation"
                    },
                    "memory_worthy": {
                        "type": "boolean",
                        "description": "Whether this turn contains information worth saving to long-term memory"
                    }
                },
                "required": ["response", "sentiment", "requires_handoff", "handoff_reason", "urgency", "memory_worthy"],
                "additionalProperties": False
            }
        }
    }
