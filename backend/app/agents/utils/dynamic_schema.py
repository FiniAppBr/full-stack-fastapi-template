"""
Dynamic Pydantic Model Builder for Custom Response Schemas

Allows agents to define custom structured output fields at runtime.
"""
from typing import Literal, get_args
from pydantic import BaseModel, Field, create_model


def build_dynamic_response_model(schema: dict | None) -> type[BaseModel]:
    """
    Build a Pydantic model dynamically from a schema definition.

    Args:
        schema: Dictionary mapping field names to allowed values
                Example: {
                    "order_type": ["inquiry", "ordering", "complaint"],
                    "lead_quality": ["hot", "warm", "cold"]
                }

    Returns:
        Dynamically created Pydantic model class

    Example:
        >>> schema = {"order_type": ["inquiry", "ordering"]}
        >>> Model = build_dynamic_response_model(schema)
        >>> response = Model(response="Hello!", order_type="inquiry")
    """
    if not schema:
        # No custom schema - use basic model
        return create_model(
            "BasicResponse",
            response=(str, Field(description="The assistant's response text")),
            sentiment=(Literal["neutral", "positive", "frustrated", "angry"], Field(default="neutral")),
            requires_handoff=(bool, Field(default=False)),
            handoff_reason=(Literal["complaint", "too_complex", "out_of_scope", "emergency", "none"], Field(default="none")),
            urgency=(Literal["normal", "high"], Field(default="normal")),
            memory_worthy=(bool, Field(default=False)),
        )

    # Start with base fields (always present)
    fields = {
        "response": (str, Field(description="The assistant's response text")),
        "sentiment": (Literal["neutral", "positive", "frustrated", "angry"], Field(default="neutral")),
        "requires_handoff": (bool, Field(default=False)),
        "handoff_reason": (Literal["complaint", "too_complex", "out_of_scope", "emergency", "none"], Field(default="none")),
        "urgency": (Literal["normal", "high"], Field(default="normal")),
        "memory_worthy": (bool, Field(default=False)),
    }

    # Add custom fields from schema
    for field_name, allowed_values in schema.items():
        if not allowed_values or not isinstance(allowed_values, list):
            continue

        # Create Literal type from allowed values
        literal_type = Literal[tuple(allowed_values)]

        # Add field with default as first value
        fields[field_name] = (literal_type, Field(default=allowed_values[0]))

    # Create and return the model
    return create_model("CustomResponse", **fields)


def extract_response_fields(response: BaseModel, base_fields_only: bool = False) -> dict:
    """
    Extract fields from a response model as a dictionary.

    Args:
        response: Pydantic model instance
        base_fields_only: If True, only return base fields (response, sentiment, etc)

    Returns:
        Dictionary of field values
    """
    data = response.model_dump()

    if base_fields_only:
        base_keys = {"response", "sentiment", "requires_handoff", "handoff_reason", "urgency", "memory_worthy"}
        return {k: v for k, v in data.items() if k in base_keys}

    return data
