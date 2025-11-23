"""
Agent State - Schema generation and field extraction.

Combines:
1. Dynamic TypedDict generation from agent's state_schema
2. LLM-based extraction of user-defined fields from conversation

Design: Cohesion - schema and extraction are tightly coupled,
changes to one always affect the other.
"""
import json
import os
from typing import TypedDict, Optional, List, Annotated, Type, Any
import operator

from openai import OpenAI

from app.llm.openai import models
from app.lib.retry import openai_retry


# Base state fields - always present
class AgentState(TypedDict):
    """Base agent state structure."""
    # Core identifiers
    messages: Annotated[List[dict], operator.add]
    customer_id: str
    agent_id: int
    turn_count: int
    conversation_ended: bool

    # Stage tracking (optional)
    current_stage: Optional[str]
    previous_stage: Optional[str]

    # Processing fields
    excluded_tags: Optional[List[str]]
    rag_context: Optional[str]
    response: Optional[str]
    validation_passed: Optional[bool]
    validation_message: Optional[str]

    # Response metadata
    sentiment: Optional[str]
    urgency: Optional[str]
    requires_handoff: bool
    handoff_reason: Optional[str]

    # Config
    multi_turn_config: Optional[dict]
    state_schema: Optional[dict]

    # Token tracking
    tokens_used: Optional[dict]


def generate_state_class(agent_id: int, state_schema: dict) -> Type[TypedDict]:
    """
    Dynamically generate a TypedDict state class from agent's state_schema.

    Args:
        agent_id: Agent identifier for unique class name
        state_schema: Dict defining custom fields to track
            Example: {
                "budget_range": {
                    "type": "enum",
                    "options": ["unknown", "low", "medium", "high"],
                    "description": "Customer's budget range"
                },
                "customer_name": {
                    "type": "string",
                    "description": "Customer's name if mentioned"
                }
            }

    Returns:
        TypedDict class for LangGraph state
    """
    base_fields = {
        # Core identifiers
        "messages": Annotated[List[dict], operator.add],
        "customer_id": str,
        "agent_id": int,
        "turn_count": int,
        "conversation_ended": bool,
        # Stage tracking
        "current_stage": Optional[str],
        "previous_stage": Optional[str],
        # Processing fields
        "excluded_tags": Optional[List[str]],
        "rag_context": Optional[str],
        "response": Optional[str],
        "validation_passed": Optional[bool],
        "validation_message": Optional[str],
        # Response metadata
        "sentiment": Optional[str],
        "urgency": Optional[str],
        "requires_handoff": bool,
        "handoff_reason": Optional[str],
        # Config
        "multi_turn_config": Optional[dict],
        "state_schema": Optional[dict],
        # Token usage
        "tokens_used": Optional[dict],
    }

    # Add custom fields from state_schema
    if state_schema:
        for field_name, field_config in state_schema.items():
            # All custom fields are Optional[str] for simplicity
            # The actual type/enum is enforced during extraction
            base_fields[field_name] = Optional[str]

    state_class = TypedDict(
        f"Agent{agent_id}State",
        base_fields
    )

    return state_class


# OpenAI client for extraction
_openai_client = None


def _get_openai_client() -> OpenAI:
    """Get or create OpenAI client."""
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _openai_client


@openai_retry
def _call_extraction_api(client, model, messages, response_format, temperature):
    """Call OpenAI API with retry logic."""
    return client.chat.completions.create(
        model=model,
        messages=messages,
        response_format=response_format,
        temperature=temperature
    )


def extract_state_fields(
    state: dict,
    state_schema: dict,
    last_message: str
) -> dict[str, Any]:
    """
    Extract structured fields from the last user message.

    Uses LLM to extract user-defined fields, merging with previous state.
    Only extracts from the LAST message - checkpointer handles history.

    Args:
        state: Current state dict (from checkpointer)
        state_schema: Schema defining fields to extract
        last_message: The user's most recent message

    Returns:
        Dict of extracted field values
    """
    if not state_schema:
        return {}

    # Build JSON schema from state_schema
    properties = {}
    for field_name, field_config in state_schema.items():
        if isinstance(field_config, dict):
            field_type = field_config.get("type", "string")
            description = field_config.get("description", f"Extract {field_name}")

            if field_type == "enum" and "options" in field_config:
                properties[field_name] = {
                    "type": "string",
                    "enum": field_config["options"],
                    "description": description
                }
            elif field_type == "boolean":
                properties[field_name] = {
                    "type": "string",
                    "enum": ["true", "false", "unknown"],
                    "description": description
                }
            else:  # string, list (as comma-separated string)
                properties[field_name] = {
                    "type": "string",
                    "description": description
                }
        elif isinstance(field_config, list):
            # Legacy format: {"field": ["option1", "option2"]}
            properties[field_name] = {
                "type": "string",
                "enum": field_config,
                "description": f"One of: {', '.join(field_config)}"
            }

    if not properties:
        return {}

    # Get previous values from state
    previous_state = {
        field: state.get(field)
        for field in state_schema.keys()
        if state.get(field) is not None
    }
    previous_state_str = json.dumps(previous_state, indent=2) if previous_state else "No previous state"

    # Build extraction prompt
    schema_description = "\n".join([
        f"- {field}: {prop.get('description', 'Extract from conversation')}"
        for field, prop in properties.items()
    ])

    try:
        client = _get_openai_client()
        messages = [
            {
                "role": "system",
                "content": f"""Extract customer information from this message.

Fields to extract:
{schema_description}

CURRENT STATE (from previous messages):
{previous_state_str}

Rules:
- Extract NEW information from this message only
- If this message updates a field, use the new value
- If a field is not mentioned, keep the current state value
- Return ALL fields with their current or updated values

Return JSON with ALL fields."""
            },
            {
                "role": "user",
                "content": f"Customer message: {last_message}"
            }
        ]

        response_format = {
            "type": "json_schema",
            "json_schema": {
                "name": "customer_state",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": properties,
                    "required": list(properties.keys()),
                    "additionalProperties": False
                }
            }
        }

        response = _call_extraction_api(
            client,
            models.extraction_model,
            messages,
            response_format,
            0.1
        )

        extracted = json.loads(response.choices[0].message.content)

        usage = response.usage
        print(f"  State extracted: {extracted}")
        print(f"  Tokens: {usage.total_tokens} (prompt: {usage.prompt_tokens}, completion: {usage.completion_tokens})")

        return extracted

    except Exception as e:
        print(f"  Extraction error: {e}")
        # Return previous state on error
        return previous_state
