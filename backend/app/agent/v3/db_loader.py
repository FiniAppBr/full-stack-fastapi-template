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
    ExtractionConfig,
    GenerationConfig,
    AssemblyConfig,
    MultiMessageConfig,
    TypingConfig,
)
from app.agent.v3.schema import (
    Trait,
    IntentType,
    ObjectionType,
    Objective,
    Event,
    ConversationExample,
    ExampleMessage,
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

    The config JSON structure:
    {
        "personality": { tone, formality, traits, emoji_usage, response_style, language, max_messages, max_response_length, custom_instructions },
        "guardrails": { avoid_topics, escalation_triggers, custom, never_say, never_do, always_do, conditional },
        "extraction": {
            "traits": [{ id, type, options, extract_hint }],
            "intents": [{ id, description, rag_boost_labels }],
            "objection_types": [{ id, description, keywords }]
        },
        "funnel": {
            "objectives": [{ target, hint, priority }],
            "events": [{ id, description, detect_on_extraction, detect_regex, trigger_intents }],
            "escalation_rules": [{ condition, action, response }]
        },
        "examples": [{ id, scenario, demonstrates, context, messages, match_intents, match_traits, match_turn_range, bad_example }],
        "product": { ... product data ... },
        "product_summary": "...",
        "models": {
            "extraction": { model, temperature, history_turns },
            "generation": { model, temperature, max_tokens, history_turns },
            "assembly": { token_budget, base_search_limit, boost_search_limit, similarity_threshold, max_examples }
        },
        "typing": { enabled, base_ms, per_char_ms, max_delay_ms, between_messages_ms }
    }
    """
    config = agent.config or {}
    personality = config.get("personality", {})
    guardrails_data = config.get("guardrails", {})
    extraction_data = config.get("extraction", {})
    funnel_data = config.get("funnel", {})
    examples_data = config.get("examples", [])
    product_data = config.get("product", {})
    models_data = config.get("models", {})
    typing_data = config.get("typing", {})

    # Build traits
    traits = [
        Trait(
            id=t["id"],
            type=t.get("type", "string"),
            options=t.get("options", []),
            extract_hint=t.get("extract_hint", "")
        )
        for t in extraction_data.get("traits", [])
    ]

    # Build intents
    intents = [
        IntentType(
            id=i["id"],
            description=i.get("description", ""),
            rag_boost_labels=i.get("rag_boost_labels", [])
        )
        for i in extraction_data.get("intents", [])
    ]

    # Build objection types
    objection_types = [
        ObjectionType(
            id=o["id"],
            description=o.get("description", ""),
            keywords=o.get("keywords", [])
        )
        for o in extraction_data.get("objection_types", [])
    ]

    # Build objectives
    objectives = [
        Objective(
            target=obj["target"],
            hint=obj.get("hint", ""),
            priority=obj.get("priority", 50)
        )
        for obj in funnel_data.get("objectives", [])
    ]

    # Build events
    events = [
        Event(
            id=e["id"],
            description=e.get("description", ""),
            detect_on_extraction=e.get("detect_on_extraction", False),
            detect_regex=e.get("detect_regex"),
            trigger_intents=e.get("trigger_intents", [])
        )
        for e in funnel_data.get("events", [])
    ]

    # Build examples
    examples = [
        ConversationExample(
            id=ex["id"],
            scenario=ex.get("scenario", ""),
            demonstrates=ex.get("demonstrates", []),
            context=ex.get("context", ""),
            messages=[
                ExampleMessage(role=m["role"], content=m["content"])
                for m in ex.get("messages", [])
            ],
            bad_example=ex.get("bad_example"),
            match_intents=ex.get("match_intents", []),
            match_traits=ex.get("match_traits", {}),
            match_turn_range=tuple(ex.get("match_turn_range", [0, 999]))
        )
        for ex in examples_data
    ]

    # Build guardrails
    guardrails = Guardrails(
        never_say=guardrails_data.get("never_say", []),
        never_do=guardrails_data.get("never_do", []),
        always_do=guardrails_data.get("always_do", []),
        conditional=guardrails_data.get("conditional", {})
    )

    # Build escalation triggers
    escalation_triggers = [
        EscalationTrigger(
            condition=et["condition"],
            action=et.get("action", "offer_handoff"),
            response=et.get("response", [])
        )
        for et in funnel_data.get("escalation_rules", [])
    ]

    # Build stage configs
    extraction_config = ExtractionConfig(
        model=models_data.get("extraction", {}).get("model", "google/gemini-2.0-flash-001"),
        temperature=models_data.get("extraction", {}).get("temperature", 0.1),
        history_turns=models_data.get("extraction", {}).get("history_turns", 3)
    )

    generation_config = GenerationConfig(
        model=models_data.get("generation", {}).get("model", "google/gemini-2.0-flash-001"),
        temperature=models_data.get("generation", {}).get("temperature", 0.7),
        max_tokens=models_data.get("generation", {}).get("max_tokens", 500),
        history_turns=models_data.get("generation", {}).get("history_turns", 5)
    )

    assembly_config = AssemblyConfig(
        token_budget=models_data.get("assembly", {}).get("token_budget", 1500),
        base_search_limit=models_data.get("assembly", {}).get("base_search_limit", 5),
        boost_search_limit=models_data.get("assembly", {}).get("boost_search_limit", 2),
        similarity_threshold=models_data.get("assembly", {}).get("similarity_threshold", 0.4),
        max_examples=models_data.get("assembly", {}).get("max_examples", 2)
    )

    typing_config = TypingConfig(
        enabled=typing_data.get("enabled", True),
        base_ms=typing_data.get("base_ms", 800),
        per_char_ms=typing_data.get("per_char_ms", 30),
        max_delay_ms=typing_data.get("max_delay_ms", 3000),
        between_messages_ms=typing_data.get("between_messages_ms", 500)
    )

    multi_message_config = MultiMessageConfig(
        enabled=True,
        max_messages=personality.get("max_messages", 4),
        preferred_messages=personality.get("preferred_messages", 2),
        typing=typing_config
    )

    # Build the config
    return BaseAgentConfig(
        agent_id=str(agent.id),
        agent_name=agent.name,
        agent_description=agent.description or "",
        language=personality.get("language", "pt"),
        product=product_data,
        traits=traits,
        intents=intents,
        objection_types=objection_types,
        objectives=objectives,
        events=events,
        examples=examples,
        guardrails=guardrails,
        escalation_triggers=escalation_triggers,
        extraction=extraction_config,
        generation=generation_config,
        assembly=assembly_config,
        multi_message=multi_message_config,
        product_summary=config.get("product_summary")
    )
