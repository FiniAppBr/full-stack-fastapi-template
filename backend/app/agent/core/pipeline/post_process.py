"""
Post-process node - Timing calculation and data sync.

Single responsibility: Format output with typing delays and sync data to Contact.
"""

import re
import random

from sqlmodel import Session

from app.core.db import engine
from app.models.contact import Contact
from app.agent.core.state import GraphState
from app.agent.core.schema import MessageWithTiming


def _sync_contact_data(contact_id: int, collected_data: dict):
    """
    Sync collected data to Contact.data in database.

    Args:
        contact_id: Database ID of the contact
        collected_data: Data to sync
    """
    with Session(engine) as session:
        contact = session.get(Contact, contact_id)
        if contact:
            if contact.data is None:
                contact.data = {}
            contact.data.update(collected_data)
            session.add(contact)
            session.commit()


def post_process_node(state: GraphState) -> dict:
    """
    Calculate typing delays and sync data to Contact.

    Timing formula:
    - Base delay: 1.7s (reading message + thinking)
    - Per char: 138ms (~7 chars/sec - realistic mobile typing)
    - Variance: -300ms to +400ms for natural feel
    - Floor: 1.5s minimum

    Args:
        state: Current graph state with response_messages

    Returns:
        Updated state with messages (with timing) and updated agent_state
    """
    print("-> [Node] Post-process")

    config = state["config"]
    agent_state = state["agent_state"]
    response_messages = state.get("response_messages", [])
    final_response = state.get("final_response", "")

    if not response_messages:
        response_messages = ["Desculpe, ocorreu um erro. Pode repetir?"]
        final_response = response_messages[0]

    # Calculate typing times - realistic human mobile typing speed
    messages_with_timing = []
    for i, msg in enumerate(response_messages):
        if config.multi_message.typing.enabled:
            char_count = len(msg)
            # Base delay: 1.7s (reading message + thinking what to say)
            # Per char: 138ms (~7 chars/sec - realistic for mobile typing)
            base = 1725
            per_char = 138
            variance = random.randint(-300, 400)
            typing_ms = int(base + (char_count * per_char) + variance)
            typing_ms = max(typing_ms, 1500)  # Floor at 1.5s
        else:
            typing_ms = 0

        pause_ms = config.multi_message.typing.between_messages_ms if i < len(response_messages) - 1 else 0

        messages_with_timing.append(
            MessageWithTiming(content=msg, typing_delay_ms=typing_ms, pause_after_ms=pause_ms)
        )

    # Update history
    for msg in response_messages:
        agent_state.add_to_history("assistant", msg)

    # Track soft gate states based on agent's response
    combined_response = " ".join(response_messages).lower()

    # If agent asked about budget/orçamento, mark the gate as triggered
    budget_keywords = ["orçamento", "orcamento", "budget", "quanto.*investir", "quanto.*gastar"]
    for kw in budget_keywords:
        if re.search(kw, combined_response):
            agent_state.update_collected_data("_gate_price_budget_asked", True)
            print("  Gate tracked: price.budget asked")
            break

    # Sync to Contact if linked
    if agent_state.contact_id and agent_state.collected_data:
        try:
            _sync_contact_data(agent_state.contact_id, agent_state.collected_data)
            print(f"  Synced to contact {agent_state.contact_id}: {list(agent_state.collected_data.keys())}")
        except Exception as e:
            print(f"  Sync error: {e}")

    return {
        "final_response": final_response,
        "messages": messages_with_timing,
        "agent_state": agent_state
    }
