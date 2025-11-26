"""
Database loader for v3 agents.

Converts NeoAgent database records to BaseAgentConfig instances.
"""

from typing import Optional
from sqlmodel import Session, select

from app.core.db import engine
from app.models.neo_agent import NeoAgent
from app.agent.v3.config import (
    BaseAgentConfig,
    GenerationConfig,
    RAGConfig,
    MultiMessageConfig,
    TypingConfig,
)
from app.agent.v3.schema import (
    Objective,
    Guardrails,
    EscalationTrigger,
)


def load_agent_config(agent_id: int) -> Optional[BaseAgentConfig]:
    """
    Load agent configuration from database and convert to BaseAgentConfig.

    Args:
        agent_id: The NeoAgent database ID

    Returns:
        BaseAgentConfig instance or None if not found
    """
    with Session(engine) as session:
        agent = session.get(NeoAgent, agent_id)
        if not agent:
            return None

        return neo_agent_to_config(agent)


def load_agent_config_by_name(name: str) -> Optional[BaseAgentConfig]:
    """
    Load agent configuration by name.

    Args:
        name: The agent name (case-insensitive)

    Returns:
        BaseAgentConfig instance or None if not found
    """
    with Session(engine) as session:
        statement = select(NeoAgent).where(NeoAgent.name.ilike(name))
        agent = session.exec(statement).first()
        if not agent:
            return None

        return neo_agent_to_config(agent)


def neo_agent_to_config(agent: NeoAgent) -> BaseAgentConfig:
    """
    Convert a NeoAgent database record to BaseAgentConfig.

    Simplified config structure:
    {
        "personality": { language, max_messages, preferred_messages },
        "guardrails": { never_say, never_do, always_do },
        "funnel": {
            "objectives": [{ id, description, priority }],
            "escalation_rules": [{ condition, message }]
        },
        "models": {
            "generation": { model, temperature, max_tokens, history_turns }
        },
        "rag": { context_turns, search_limit, similarity_threshold },
        "typing": { enabled, base_ms, per_char_ms, max_delay_ms, between_messages_ms },
        "enabled_tool_categories": ["inventory", "booking", ...]
    }
    """
    config = agent.config or {}
    personality = config.get("personality", {})
    guardrails_data = config.get("guardrails", {})
    funnel_data = config.get("funnel", {})
    models_data = config.get("models", {})
    rag_data = config.get("rag", {})
    typing_data = config.get("typing", {})

    # Build objectives
    objectives = [
        Objective(
            id=obj.get("id", obj.get("target", "")),  # Support both old "target" and new "id"
            description=obj.get("description", obj.get("hint", "")),  # Support both
            priority=obj.get("priority", 50)
        )
        for obj in funnel_data.get("objectives", [])
    ]

    # Build guardrails
    guardrails = Guardrails(
        never_say=guardrails_data.get("never_say", []),
        never_do=guardrails_data.get("never_do", []),
        always_do=guardrails_data.get("always_do", []),
    )

    # Build escalation triggers
    escalation_triggers = [
        EscalationTrigger(
            condition=et["condition"],
            message=et.get("message", et.get("response", [""])[0] if et.get("response") else "")
        )
        for et in funnel_data.get("escalation_rules", [])
    ]

    # Build generation config
    # max_response_length (chars) from personality overrides max_tokens if set
    # Rough conversion: 1 token ≈ 4 chars, so divide by 4
    gen_data = models_data.get("generation", {})
    max_response_length = personality.get("max_response_length")
    max_tokens = gen_data.get("max_tokens", 500)
    if max_response_length:
        max_tokens = max(100, max_response_length // 2)  # Conservative: 2 chars per token

    generation_config = GenerationConfig(
        model=gen_data.get("model", "google/gemini-2.0-flash-001"),
        temperature=gen_data.get("temperature", 0.7),
        max_tokens=max_tokens,
        history_turns=gen_data.get("history_turns", 5)
    )

    # Build RAG config
    rag_config = RAGConfig(
        context_turns=rag_data.get("context_turns", 2),
        search_limit=rag_data.get("search_limit", 5),
        similarity_threshold=rag_data.get("similarity_threshold", 0.3),
    )

    # Build typing config
    typing_config = TypingConfig(
        enabled=typing_data.get("enabled", True),
        base_ms=typing_data.get("base_ms", 800),
        per_char_ms=typing_data.get("per_char_ms", 30),
        max_delay_ms=typing_data.get("max_delay_ms", 3000),
        between_messages_ms=typing_data.get("between_messages_ms", 500)
    )

    # Build multi-message config
    # min_messages from frontend maps to preferred_messages
    multi_message_config = MultiMessageConfig(
        enabled=True,
        max_messages=personality.get("max_messages", 4),
        preferred_messages=personality.get("min_messages", personality.get("preferred_messages", 1)),
        typing=typing_config
    )

    # Parse linked_entities (stored as strings in DB)
    linked_entity_ids = []
    if agent.linked_entities:
        for eid in agent.linked_entities:
            try:
                linked_entity_ids.append(int(eid))
            except (ValueError, TypeError):
                pass

    # Parse enabled_tool_categories
    enabled_tool_categories = config.get("enabled_tool_categories", [])

    # Build the config
    return BaseAgentConfig(
        agent_id=str(agent.id),
        agent_name=agent.name,
        agent_description=agent.description or "",
        agent_slug=agent.name.lower(),
        linked_entities=linked_entity_ids,
        enabled_tool_categories=enabled_tool_categories,
        language=personality.get("language", "pt"),
        objectives=objectives,
        guardrails=guardrails,
        escalation_triggers=escalation_triggers,
        generation=generation_config,
        rag=rag_config,
        multi_message=multi_message_config,
    )
