#!/usr/bin/env python3
"""
Test Nina Extraction - Validate the 2x2 extraction pipeline.

This script tests the extraction stage in isolation:
1. Loads Nina's production configuration
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

from app.agent.schema import RuntimeState
from app.agent.pipeline import extract
from app.agent.configs import NINA_CONFIG, create_nina_initial_state


def test_extraction(state: RuntimeState, message: str) -> RuntimeState:
    """Run extraction and return updated state."""
    print(f"\n{'='*60}")
    print(f"Message: {message}")
    print(f"{'='*60}")

    result = extract(NINA_CONFIG, state, message)

    print(f"\nResult:")
    print(f"  Signals: {result.signals}")
    print(f"  Trait updates: {result.trait_updates}")
    print(f"  Gate updates: {result.gate_updates}")
    print(f"  Mode shift: {result.mode_shift}")

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
    print("NINA EXTRACTION TEST (Production Config)")
    print("=" * 60)
    print(f"Signals: {[s.id for s in NINA_CONFIG.signals]}")
    print(f"Traits: {[t.id for t in NINA_CONFIG.traits]}")
    print(f"Gates: {[g.id for g in NINA_CONFIG.gates]}")
    print(f"Modes: {[m.id for m in NINA_CONFIG.modes]}")
    print(f"Rules: {len(NINA_CONFIG.rules)}")

    state = create_nina_initial_state()

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
        state = test_extraction(state, msg)
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
