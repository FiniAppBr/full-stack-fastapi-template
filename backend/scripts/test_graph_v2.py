#!/usr/bin/env python3
"""
Test v2 Graph with PostgresSaver persistence.

This script tests:
1. Graph execution with extraction
2. State persistence across invocations
3. Session resumption via thread_id

Usage:
    cd /opt/connectai/backend
    source .venv/bin/activate
    python scripts/test_graph_v2.py

    # Test persistence (run twice with same thread_id)
    python scripts/test_graph_v2.py --thread test123
    python scripts/test_graph_v2.py --thread test123 --resume
"""

import sys
import os
import argparse

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv("/opt/connectai/.env")

from langchain_core.messages import HumanMessage, AIMessage
from app.agent.graph_v2 import get_v2_graph


def run_conversation(thread_id: str, messages: list[str], resume: bool = False):
    """Run a conversation through the v2 graph."""
    print(f"\n{'='*60}")
    print(f"V2 GRAPH TEST")
    print(f"Thread: {thread_id}")
    print(f"Resume: {resume}")
    print(f"{'='*60}")

    # Get compiled graph
    graph = get_v2_graph("nina")

    # Config for this thread
    config = {"configurable": {"thread_id": thread_id}}

    if resume:
        # Get current state from checkpointer
        state = graph.get_state(config)
        if state.values:
            print(f"\nResumed state:")
            runtime = state.values.get("runtime", {})
            print(f"  Mode: {runtime.get('mode', 'unknown')}")
            print(f"  Turn: {runtime.get('turn_count', 0)}")
            print(f"  Gates: {[k for k, v in runtime.get('gates', {}).items() if v]}")
            print(f"  Traits: {[k for k, v in runtime.get('traits', {}).items() if v]}")
            msg_count = len(state.values.get("messages", []))
            print(f"  Messages: {msg_count}")
        else:
            print("\nNo previous state found - starting fresh")

    # Run each message
    for i, message in enumerate(messages):
        print(f"\n{'-'*60}")
        print(f"Turn {i + 1}: {message}")
        print(f"{'-'*60}")

        # Invoke graph
        result = graph.invoke(
            {
                "messages": [HumanMessage(content=message)],
                "agent_config_name": "nina"
            },
            config
        )

        # Show results
        runtime = result.get("runtime", {})
        response_messages = result.get("response_messages", [])

        print(f"\nResult:")
        print(f"  Mode: {runtime.get('mode')}")
        print(f"  Signals: {runtime.get('signals', {})}")
        print(f"  Response: {response_messages[0] if response_messages else 'None'}")

    # Final state check
    print(f"\n{'='*60}")
    print("FINAL STATE (from checkpointer)")
    print(f"{'='*60}")

    state = graph.get_state(config)
    if state.values:
        runtime = state.values.get("runtime", {})
        print(f"Mode: {runtime.get('mode')}")
        print(f"Turn count: {runtime.get('turn_count')}")
        print(f"Gates: {runtime.get('gates')}")
        print(f"Traits: {runtime.get('traits')}")
        print(f"Total messages: {len(state.values.get('messages', []))}")


def main():
    parser = argparse.ArgumentParser(description="Test v2 graph with persistence")
    parser.add_argument("--thread", default="test_v2_default", help="Thread ID for state persistence")
    parser.add_argument("--resume", action="store_true", help="Resume from existing state")
    parser.add_argument("--message", "-m", action="append", help="Custom message(s) to send")
    args = parser.parse_args()

    if args.message:
        messages = args.message
    elif args.resume:
        # If resuming, just send one follow-up
        messages = ["E aí, como funciona o curso?"]
    else:
        # Default test conversation
        messages = [
            "Oi, tudo bem? Me chamo João",
            "Nunca toquei violão, sou iniciante completo",
            "Quero aprender pra tocar na igreja",
        ]

    run_conversation(args.thread, messages, args.resume)


if __name__ == "__main__":
    main()
