#!/usr/bin/env python3
"""
Seed script to create Nina agent in the database.

This converts Nina's current Python configuration to a NeoAgent database record,
enabling configuration via the UI.

Usage:
    cd /opt/connectai/backend
    source .venv/bin/activate
    python scripts/seed_nina.py
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from sqlmodel import Session, select
from app.core.db import engine
from app.models.neo_agent import NeoAgent

# Import Nina's current config
from app.agent.core.agents.nina import (
    NINA_CONFIG,
    PRODUCT,
    TRAITS,
    INTENTS,
    OBJECTION_TYPES,
    OBJECTIVES,
    EVENTS,
    EXAMPLES,
    GUARDRAILS,
    ESCALATION_TRIGGERS,
)


def create_nina_config() -> dict:
    """Convert Nina's Python config to JSON structure for database."""

    # Personality settings
    personality = {
        "tone": "friendly",
        "formality": "casual",
        "traits": ["empathetic", "confident", "persistent"],
        "emoji_usage": "minimal",
        "response_style": "whatsapp",
        "language": NINA_CONFIG.language,
        "max_messages": NINA_CONFIG.multi_message.max_messages,
        "preferred_messages": NINA_CONFIG.multi_message.preferred_messages,
        "max_response_length": NINA_CONFIG.generation.max_tokens,
        "custom_instructions": """Nina é vendedora do curso "Aulas de Violão do Zero ao Fingerstyle" do Rafael Alves.

Tom natural:
- Amigável e leve, como conversa no WhatsApp
- Usa linguagem casual (tá, pra, né, sabe, viu)
- Às vezes começa frases sem maiúscula (entendi, legal, massa, perfeito)
- Varia ritmo: às vezes breve, às vezes mais explicativa
- Usa conectores naturais (então, bom, tipo, ah)

MAS sempre:
- Mantém conversa fluindo (nunca termina sem dar próximo passo)
- Faz perguntas pra descobrir necessidades e qualificar
- Guia naturalmente: descoberta → validação → fechamento
- É consultiva e empática, nunca agressiva"""
    }

    # Guardrails
    guardrails = {
        "avoid_topics": ["competitors_pricing", "internal_processes"],
        "escalation_triggers": ["angry", "legal_threat", "complaint"],
        "custom": "",
        "never_say": GUARDRAILS.never_say,
        "never_do": GUARDRAILS.never_do,
        "always_do": GUARDRAILS.always_do,
        "conditional": GUARDRAILS.conditional,
    }

    # Extraction schema
    extraction = {
        "traits": [
            {
                "id": t.id,
                "type": t.type,
                "options": t.options,
                "extract_hint": t.extract_hint
            }
            for t in TRAITS
        ],
        "intents": [
            {
                "id": i.id,
                "description": i.description,
                "rag_boost_labels": i.rag_boost_labels
            }
            for i in INTENTS
        ],
        "objection_types": [
            {
                "id": o.id,
                "description": o.description,
                "keywords": o.keywords
            }
            for o in OBJECTION_TYPES
        ]
    }

    # Funnel configuration
    funnel = {
        "objectives": [
            {
                "target": obj.target,
                "hint": obj.hint,
                "priority": obj.priority
            }
            for obj in OBJECTIVES
        ],
        "events": [
            {
                "id": e.id,
                "description": e.description,
                "detect_on_extraction": e.detect_on_extraction,
                "detect_regex": e.detect_regex,
                "trigger_intents": e.trigger_intents
            }
            for e in EVENTS
        ],
        "escalation_rules": [
            {
                "condition": et.condition,
                "action": et.action,
                "response": et.response
            }
            for et in ESCALATION_TRIGGERS
        ]
    }

    # Few-shot examples
    examples = [
        {
            "id": ex.id,
            "scenario": ex.scenario,
            "demonstrates": ex.demonstrates,
            "context": ex.context,
            "messages": [
                {"role": m.role, "content": m.content}
                for m in ex.messages
            ],
            "bad_example": ex.bad_example,
            "match_intents": ex.match_intents,
            "match_traits": ex.match_traits,
            "match_turn_range": list(ex.match_turn_range)
        }
        for ex in EXAMPLES
    ]

    # Model configs
    models = {
        "extraction": {
            "model": NINA_CONFIG.extraction.model,
            "temperature": NINA_CONFIG.extraction.temperature,
            "history_turns": NINA_CONFIG.extraction.history_turns
        },
        "generation": {
            "model": NINA_CONFIG.generation.model,
            "temperature": NINA_CONFIG.generation.temperature,
            "max_tokens": NINA_CONFIG.generation.max_tokens,
            "history_turns": NINA_CONFIG.generation.history_turns
        },
        "assembly": {
            "token_budget": NINA_CONFIG.assembly.token_budget,
            "base_search_limit": NINA_CONFIG.assembly.base_search_limit,
            "boost_search_limit": NINA_CONFIG.assembly.boost_search_limit,
            "similarity_threshold": NINA_CONFIG.assembly.similarity_threshold,
            "max_examples": NINA_CONFIG.assembly.max_examples
        }
    }

    # Typing config
    typing = {
        "enabled": NINA_CONFIG.multi_message.typing.enabled,
        "base_ms": NINA_CONFIG.multi_message.typing.base_ms,
        "per_char_ms": NINA_CONFIG.multi_message.typing.per_char_ms,
        "max_delay_ms": NINA_CONFIG.multi_message.typing.max_delay_ms,
        "between_messages_ms": NINA_CONFIG.multi_message.typing.between_messages_ms
    }

    # Actions
    actions = ["send_message", "send_link", "handoff_human", "collect_info"]

    return {
        "personality": personality,
        "guardrails": guardrails,
        "actions": actions,
        "extraction": extraction,
        "funnel": funnel,
        "examples": examples,
        "product": PRODUCT,
        "product_summary": NINA_CONFIG.product_summary,
        "models": models,
        "typing": typing
    }


def seed_nina():
    """Create or update Nina agent in database."""

    with Session(engine) as session:
        # Check if Nina already exists
        statement = select(NeoAgent).where(NeoAgent.name == "Nina")
        existing = session.exec(statement).first()

        config = create_nina_config()

        if existing:
            print(f"Updating existing Nina agent (id={existing.id})...")
            existing.description = NINA_CONFIG.agent_description
            existing.template = "sales_closer"
            existing.is_active = True
            existing.channels = ["whatsapp", "webchat"]
            existing.config = config
            existing.updated_at = datetime.utcnow()
            session.add(existing)
            session.commit()
            print(f"✓ Nina updated successfully (id={existing.id})")
            return existing.id
        else:
            print("Creating new Nina agent...")
            nina = NeoAgent(
                name="Nina",
                description=NINA_CONFIG.agent_description,
                template="sales_closer",
                is_active=True,
                channels=["whatsapp", "webchat"],
                linked_entities=[],
                config=config,
                stats={"conversations": 0, "conversions": 0, "satisfaction": 0.0}
            )
            session.add(nina)
            session.commit()
            session.refresh(nina)
            print(f"✓ Nina created successfully (id={nina.id})")
            return nina.id


def verify_nina():
    """Verify Nina was created correctly by loading it back."""
    from app.agent.core.db_loader import load_agent_config_by_name

    print("\nVerifying Nina configuration...")
    config = load_agent_config_by_name("Nina")

    if not config:
        print("✗ Failed to load Nina from database!")
        return False

    print(f"  Agent ID: {config.agent_id}")
    print(f"  Agent Name: {config.agent_name}")
    print(f"  Language: {config.language}")
    print(f"  Traits: {len(config.traits)}")
    print(f"  Intents: {len(config.intents)}")
    print(f"  Objection Types: {len(config.objection_types)}")
    print(f"  Objectives: {len(config.objectives)}")
    print(f"  Events: {len(config.events)}")
    print(f"  Examples: {len(config.examples)}")
    print(f"  Guardrails: never_say={len(config.guardrails.never_say)}, never_do={len(config.guardrails.never_do)}, always_do={len(config.guardrails.always_do)}")
    print(f"  Escalation Triggers: {len(config.escalation_triggers)}")
    print(f"  Extraction Model: {config.extraction.model}")
    print(f"  Generation Model: {config.generation.model}")
    print(f"  Multi-message: enabled={config.multi_message.enabled}, max={config.multi_message.max_messages}")

    print("\n✓ Nina configuration verified successfully!")
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("NINA SEED SCRIPT")
    print("=" * 60)

    agent_id = seed_nina()
    verify_nina()

    print("\n" + "=" * 60)
    print(f"Done! Nina is now available in the database (id={agent_id})")
    print("=" * 60)
