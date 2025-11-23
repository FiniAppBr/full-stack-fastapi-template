"""
Prompt Composition - Build system prompts from agent config.

Composes prompts from:
1. Base identity (business description, tone)
2. Stage instructions (current stage goal, constraints)
3. RAG context (relevant knowledge)
4. State context (extracted customer info)

Design: YAGNI - Single file until parts exceed 100 lines each.
"""
from typing import Optional

from .stages import ConversationStage, get_stage_instructions


def compose_system_prompt(
    agent_config: dict,
    current_stage: Optional[ConversationStage] = None,
    rag_context: str = "",
    state_context: dict = None
) -> str:
    """
    Compose the full system prompt from agent configuration.

    Args:
        agent_config: Agent configuration dict containing:
            - business_description: Main identity/purpose
            - tone: "professional" | "friendly" | "energetic"
            - language: "pt" | "en" | "both"
            - emoji_usage: "none" | "minimal" | "frequent"
        current_stage: Optional current conversation stage
        rag_context: Knowledge context from RAG search
        state_context: Extracted customer state fields

    Returns:
        Complete system prompt string
    """
    parts = []

    # 1. Identity
    identity = _build_identity_section(agent_config)
    parts.append(identity)

    # 2. Style
    style = _build_style_section(agent_config)
    if style:
        parts.append(style)

    # 3. Stage instructions
    if current_stage:
        stage_instructions = get_stage_instructions(current_stage)
        if stage_instructions:
            parts.append(stage_instructions)

    # 4. Customer context (extracted state)
    if state_context:
        customer_context = _build_customer_context(state_context)
        if customer_context:
            parts.append(customer_context)

    # 5. RAG context
    if rag_context:
        parts.append(f"## Relevant Information\n{rag_context}")

    # 6. Response guidelines
    guidelines = _build_response_guidelines(agent_config)
    parts.append(guidelines)

    return "\n\n".join(parts)


def _build_identity_section(agent_config: dict) -> str:
    """Build the agent identity section."""
    business_description = agent_config.get("business_description", "")
    name = agent_config.get("name", "Assistant")

    if business_description:
        return f"""## Identity
You are {name}, an AI assistant.

{business_description}"""
    else:
        return f"""## Identity
You are {name}, a helpful AI assistant."""


def _build_style_section(agent_config: dict) -> str:
    """Build the communication style section."""
    tone = agent_config.get("tone", "friendly")
    language = agent_config.get("language", "pt")
    emoji_usage = agent_config.get("emoji_usage", "minimal")

    parts = ["## Communication Style"]

    # Tone
    tone_descriptions = {
        "professional": "Communicate in a professional, courteous manner. Be clear and direct.",
        "friendly": "Be warm and approachable. Use a conversational tone.",
        "energetic": "Be enthusiastic and upbeat! Show excitement about helping."
    }
    parts.append(tone_descriptions.get(tone, tone_descriptions["friendly"]))

    # Language
    if language == "pt":
        parts.append("Always respond in Portuguese (Brazilian).")
    elif language == "en":
        parts.append("Always respond in English.")
    elif language == "both":
        parts.append("Respond in the same language the customer uses (Portuguese or English).")

    # Emojis
    emoji_descriptions = {
        "none": "Do not use emojis.",
        "minimal": "Use emojis sparingly, only when they add warmth (1-2 per message max).",
        "frequent": "Use emojis liberally to add personality and warmth."
    }
    parts.append(emoji_descriptions.get(emoji_usage, emoji_descriptions["minimal"]))

    return "\n".join(parts)


def _build_customer_context(state_context: dict) -> str:
    """Build customer context from extracted state."""
    if not state_context:
        return ""

    # Filter out None/unknown values
    relevant = {
        k: v for k, v in state_context.items()
        if v and v not in ["unknown", "none", "not_mentioned", ""]
    }

    if not relevant:
        return ""

    lines = ["## What We Know About This Customer"]
    for field, value in relevant.items():
        # Format field name for readability
        readable_field = field.replace("_", " ").title()
        lines.append(f"- {readable_field}: {value}")

    lines.append("\nUse this information to personalize your responses.")

    return "\n".join(lines)


def _build_response_guidelines(agent_config: dict) -> str:
    """Build response guidelines section."""
    guidelines = ["## Response Guidelines"]

    # Length
    guidelines.append("- Keep responses concise (2-4 sentences typically)")
    guidelines.append("- Get to the point quickly")

    # Handoff triggers
    handoff_triggers = agent_config.get("handoff_triggers", [])
    if handoff_triggers:
        triggers_str = ", ".join(handoff_triggers)
        guidelines.append(f"- If customer shows: {triggers_str} → offer to connect with a human")

    # Validation rules as guidelines
    validation_rules = agent_config.get("validation_rules", [])
    for rule in validation_rules:
        if "never_say" in rule:
            guidelines.append(f"- Never mention: {rule['never_say']}")
        if "always_include" in rule:
            guidelines.append(f"- Always include: {rule['always_include']}")

    return "\n".join(guidelines)


# ============================================================================
# PROMPT TEMPLATES - Common prompt patterns
# ============================================================================

EXTRACTION_PROMPT = """Extract customer information from this message.

Fields to extract:
{schema_description}

CURRENT STATE (from previous messages):
{previous_state}

Rules:
- Extract NEW information from this message only
- If this message updates a field, use the new value
- If a field is not mentioned, keep the current state value
- Return ALL fields with their current or updated values

Return JSON with ALL fields."""


VALIDATION_PROMPT = """Check if this response follows the rules.

Response to check:
{response}

Rules:
{rules}

Current state:
{state}

Return JSON:
{{
  "valid": true/false,
  "issues": ["issue1", "issue2"],
  "suggested_fix": "corrected response if invalid, empty if valid"
}}"""


SUMMARIZATION_PROMPT = """Summarize this conversation history into 2-3 sentences.

Focus on:
- Key customer needs/interests
- Important decisions made
- Any commitments or next steps

Conversation:
{messages}

Keep the summary brief but capture essential context."""
