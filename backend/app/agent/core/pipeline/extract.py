"""
Extract data node - Structured data extraction from conversation.

Single responsibility: Extract user data (name, custom fields) from conversation.

Note: This will evolve into the UNDERSTAND node in the new architecture,
which combines routing + extraction before ASSEMBLE.
"""

import json

from langchain_core.messages import HumanMessage

from app.agent.core.state import GraphState
from app.agent.llm import get_chat_llm, create_extraction_schema


def extract_data_node(state: GraphState) -> dict:
    """
    Extract structured data from conversation using dedicated LLM call.

    Uses a fast/cheap model to extract explicitly stated information
    like names and custom data collection fields.

    Args:
        state: Current graph state with conversation history

    Returns:
        Updated agent_state with extracted data
    """
    print("-> [Node] Extract Data")

    config = state["config"]
    agent_state = state["agent_state"]

    # Default fields always collected
    default_fields = [
        {"id": "name", "description": "Nome do usuário/cliente"}
    ]

    # Get additional data collection fields from objectives
    custom_fields = [
        {"id": obj.id.replace("collect_field_", ""), "description": obj.description}
        for obj in config.objectives
        if obj.id.startswith("collect_field_")
    ]

    # Merge default + custom (avoid duplicates)
    custom_ids = {f["id"] for f in custom_fields}
    collection_fields = [f for f in default_fields if f["id"] not in custom_ids] + custom_fields

    # Build extraction prompt from recent conversation
    recent_history = agent_state.get_recent_history(3)
    conversation_text = "\n".join([
        f"{'User' if m['role'] == 'user' else 'Agent'}: {m['content']}"
        for m in recent_history
    ])

    extraction_prompt = f"""Extract ONLY explicitly stated data from this conversation.

Conversation:
{conversation_text}

Fields to look for:
{json.dumps(collection_fields, ensure_ascii=False, indent=2)}

STRICT RULES:
- "name": ONLY extract if user explicitly says their name (e.g., "meu nome é João", "sou a Maria", "me chamo Pedro")
- Do NOT extract descriptions, statements, or context as names
- Do NOT guess or infer - only extract what is explicitly stated
- If unsure, do NOT include the field

Return empty dict if no clear data was provided."""

    try:
        # Use fast model for extraction
        llm = get_chat_llm(
            model="google/gemini-2.5-flash-lite",
            temperature=0.1,
            max_tokens=200
        )

        ExtractionSchema = create_extraction_schema(collection_fields)
        llm_structured = llm.with_structured_output(ExtractionSchema)

        result = llm_structured.invoke([HumanMessage(content=extraction_prompt)])

        if result.extracted:
            print(f"  Extracted: {result.extracted}")
            for key, value in result.extracted.items():
                agent_state.update_collected_data(key, value)
            return {"agent_state": agent_state}
        else:
            print("  No data extracted")

    except Exception as e:
        print(f"  Extraction error (skipping): {e}")

    return {}
