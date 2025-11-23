#!/usr/bin/env python3
"""
Test Nina Extraction - Validate the 2x2 extraction pipeline.

This script tests the extraction stage in isolation:
1. Loads Nina's v2 configuration
2. Runs extraction on sample messages
3. Prints extracted state (signals, traits, gates, mode)

Usage:
    cd /opt/connectai/backend
    source .venv/bin/activate
    python scripts/test_nina_extraction.py
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv("/opt/connectai/.env")

from app.agent.schema import (
    Gate, Trait, Mode, Signal, RuntimeState, Rule, Condition, Clause
)
from app.agent.pipeline import extract, AgentConfig


def create_nina_config() -> AgentConfig:
    """Create Nina's v2 configuration."""

    signals = [
        Signal(
            id="intent",
            name="Intent",
            type="enum",
            options=["greeting", "question", "objection", "agreement", "ready_to_buy", "not_ready", "purchased", "request_human", "other"],
            detection_hint="What is the user trying to do? greeting=hi/hello, question=asking about course, objection=doubt/concern, agreement=positive response, ready_to_buy=wants to purchase, not_ready=hesitant, purchased=confirms bought, request_human=wants real person"
        ),
        Signal(
            id="objection_type",
            name="Objection Type",
            type="enum",
            options=["talent", "time", "money", "trust", "method", "equipment", "age", "other", "none"],
            detection_hint="If objection, what type? talent=thinks they lack gift, time=too busy, money=too expensive, trust=doubts legitimacy, method=doubts it works, equipment=no guitar, age=too old/young, none=no objection"
        ),
        Signal(
            id="interest_level",
            name="Interest Level",
            type="enum",
            options=["cold", "warm", "hot"],
            detection_hint="How interested is the user? cold=just curious, warm=interested but hesitant, hot=ready to act"
        ),
    ]

    traits = [
        Trait(
            id="customer_name",
            name="Customer Name",
            type="string",
            detection_hint="The customer's name if they mention it"
        ),
        Trait(
            id="skill_level",
            name="Skill Level",
            type="enum",
            options=["zero", "beginner", "intermediate"],
            detection_hint="zero=never played guitar, beginner=knows basic chords, intermediate=plays but wants to improve"
        ),
        Trait(
            id="use_case",
            name="Use Case",
            type="enum",
            options=["igreja", "hobby", "profissional", "familia"],
            detection_hint="Why they want to learn: igreja=church/worship, hobby=personal enjoyment, profissional=career, familia=play with family"
        ),
    ]

    gates = [
        Gate(id="name_captured", name="Name Captured", enforcement="soft"),
        Gate(id="skill_identified", name="Skill Identified", enforcement="soft"),
        Gate(id="need_identified", name="Need Identified", enforcement="soft"),
        Gate(id="interest_confirmed", name="Interest Confirmed", required_for=["pricing", "payment"], enforcement="hard"),
        Gate(id="link_sent", name="Link Sent", enforcement="soft"),
        Gate(id="purchased", name="Purchased", required_for=["onboarding"], enforcement="hard"),
    ]

    modes = [
        Mode(id="conexao", name="Conexão", default_labels=["stage:conexao", "rapport"]),
        Mode(id="descoberta", name="Descoberta", default_labels=["stage:descoberta"]),
        Mode(id="validacao", name="Validação", default_labels=["stage:validacao"]),
        Mode(id="objection_handling", name="Objeções", default_labels=["objection"]),
        Mode(id="apresentacao", name="Apresentação", default_labels=["stage:apresentacao", "method"]),
        Mode(id="fechamento", name="Fechamento", default_labels=["pricing", "payment"]),
    ]

    # Mode transition rules (priority 50+)
    rules = [
        Rule(
            id="shift_to_objection",
            name="Shift to objection handling",
            priority=2,
            conditions=Condition(operator="AND", clauses=[
                Clause(field="signal.intent", op="==", value="objection")
            ]),
            mode_shift="objection_handling"
        ),
        Rule(
            id="shift_to_validation",
            name="Shift to validation",
            priority=50,
            conditions=Condition(operator="AND", clauses=[
                Clause(field="gate.skill_identified", op="==", value=True),
                Clause(field="gate.need_identified", op="==", value=True),
                Clause(field="mode", op="==", value="descoberta")
            ]),
            mode_shift="validacao"
        ),
        Rule(
            id="shift_to_closing",
            name="Shift to closing",
            priority=51,
            conditions=Condition(operator="AND", clauses=[
                Clause(field="signal.intent", op="==", value="ready_to_buy")
            ]),
            mode_shift="fechamento"
        ),
        Rule(
            id="return_from_objection",
            name="Return from objection handling",
            priority=53,
            conditions=Condition(operator="AND", clauses=[
                Clause(field="signal.intent", op="==", value="agreement"),
                Clause(field="mode", op="==", value="objection_handling")
            ]),
            mode_shift="validacao"
        ),
    ]

    return AgentConfig(
        signals=signals,
        traits=traits,
        gates=gates,
        modes=modes,
        rules=rules
    )


def create_initial_state() -> RuntimeState:
    """Create initial empty state."""
    return RuntimeState(
        gates={
            "name_captured": False,
            "skill_identified": False,
            "need_identified": False,
            "interest_confirmed": False,
            "link_sent": False,
            "purchased": False,
        },
        traits={
            "customer_name": None,
            "skill_level": None,
            "use_case": None,
        },
        mode="conexao",
        signals={},
        turn_count=0
    )


def test_extraction(config: AgentConfig, state: RuntimeState, message: str) -> RuntimeState:
    """Run extraction and return updated state."""
    print(f"\n{'='*60}")
    print(f"Message: {message}")
    print(f"{'='*60}")

    result = extract(config, state, message)

    print(f"\nResult:")
    print(f"  Signals: {result.signals}")
    print(f"  Trait updates: {result.trait_updates}")
    print(f"  Gate updates: {result.gate_updates}")
    print(f"  Mode shift: {result.mode_shift}")
    print(f"  Reasoning: {result.reasoning}")

    # Apply updates to state
    new_state = RuntimeState(
        gates={**state.gates, **result.gate_updates},
        traits={**state.traits, **{k: v for k, v in result.trait_updates.items() if v}},
        mode=result.mode_shift or state.mode,
        signals=result.signals,
        last_message=message,
        turn_count=state.turn_count + 1
    )

    print(f"\nNew state:")
    print(f"  Mode: {new_state.mode}")
    print(f"  Gates: {new_state.gates}")
    print(f"  Traits: {new_state.traits}")

    return new_state


def main():
    print("=" * 60)
    print("NINA EXTRACTION TEST")
    print("=" * 60)

    config = create_nina_config()
    state = create_initial_state()

    # Test messages simulating a conversation
    test_messages = [
        # 1. Initial greeting
        "Oi, tudo bem? Vi os vídeos do Rafael e fiquei interessado",

        # 2. Revealing skill level
        "Nunca toquei violão na vida, sou completamente iniciante",

        # 3. Revealing use case
        "Quero aprender pra tocar na igreja",

        # 4. Objection
        "Mas será que eu consigo? Acho que não tenho dom pra música",

        # 5. Agreement after objection handled
        "É verdade, faz sentido. Vou tentar!",

        # 6. Ready to buy
        "Tá bom, quero entrar no curso. Quanto custa?",
    ]

    for msg in test_messages:
        state = test_extraction(config, state, msg)
        print("\n" + "-" * 60)

    print("\n" + "=" * 60)
    print("FINAL STATE")
    print("=" * 60)
    print(f"Mode: {state.mode}")
    print(f"Gates: {state.gates}")
    print(f"Traits: {state.traits}")
    print(f"Turns: {state.turn_count}")


if __name__ == "__main__":
    main()
