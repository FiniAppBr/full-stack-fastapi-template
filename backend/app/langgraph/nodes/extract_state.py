"""
Extract state node - extracts structured fields from user messages.
"""
import os
import json
from openai import OpenAI

from app.agents.config.models import models
from app.agents.utils.retry import openai_retry

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


@openai_retry
def _call_extraction_api(client, model, messages, response_format, temperature):
    """Call OpenAI API with retry logic."""
    return client.chat.completions.create(
        model=model,
        messages=messages,
        response_format=response_format,
        temperature=temperature
    )


def create_extract_state_node(agent_config: dict):
    """Create extract state node with agent-specific schema."""
    def extract_state_node(state: dict) -> dict:
        """Extract structured fields from LAST MESSAGE only, merge with previous state."""
        print("→ Extract State Node")

        response_schema = agent_config.get("response_schema", {})
        if not response_schema:
            print("  No response_schema defined, skipping extraction")
            return {}

        messages = state.get("messages", [])
        if not messages:
            return {}

        # Get ONLY last user message - checkpointer handles history
        last_message = messages[-1].get("content", "") if messages else ""

        # Get previous state values (from checkpointer)
        previous_state = {
            field: state.get(field)
            for field in response_schema.keys()
            if state.get(field) is not None
        }

        # Build JSON schema dynamically from response_schema
        properties = {}
        for field_name, possible_values in response_schema.items():
            if isinstance(possible_values, list) and len(possible_values) > 0:
                properties[field_name] = {
                    "type": "string",
                    "enum": possible_values,
                    "description": f"One of: {', '.join(possible_values)}"
                }

        if not properties:
            return {}

        # Build extraction prompt
        field_descriptions = {
            "budget_range": "Customer's budget: unknown (not mentioned), under_5k (< R$5.000), 5k_to_20k (R$5.000-R$20.000), 20k_plus (> R$20.000)",
            "lead_quality": "Lead temperature: browser (just looking), warm (showing interest), hot (ready to buy)",
            "contact_captured": "Contact info: none, email_only, phone_only, or both",
            "catalogue_requested": "Did customer explicitly ask for catalogue/catalog?",
            "competitor_mentioned": "Did customer mention competitor stores/brands?",
            "consultation_interest": "Interest in home consultation: yes, no, or not_offered yet"
        }

        schema_description = "\n".join([
            f"- {field}: {field_descriptions.get(field, 'Extract from conversation')}"
            for field in properties.keys()
        ])

        previous_state_str = json.dumps(previous_state, indent=2) if previous_state else "No previous state"

        try:
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
- If this message updates a field (e.g., new budget), use the new value
- If a field is not mentioned, keep the current state value
- This message overrides previous values if it contains new info

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
                client, models.extraction_model, messages, response_format, 0.1
            )

            extracted = json.loads(response.choices[0].message.content)

            usage = response.usage
            print(f"  Extracted: {extracted}")
            print(f"  Tokens: {usage.total_tokens} (prompt: {usage.prompt_tokens}, completion: {usage.completion_tokens})")

            return extracted

        except Exception as e:
            print(f"  ✗ Extraction error: {e}")
            defaults = {}
            for field_name, possible_values in response_schema.items():
                defaults[field_name] = possible_values[0] if possible_values else "unknown"
            return defaults

    return extract_state_node
