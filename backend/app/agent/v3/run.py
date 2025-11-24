"""
v3 Run - Main orchestration function for agent conversations.

This ties together the pipeline stages and handles the full turn flow.
"""

from typing import Optional
from app.agent.v3.schema import AgentState, MessageWithTiming
from app.agent.v3.config import BaseAgentConfig
from app.agent.v3.pipeline import extract, assemble, generate, post_process
from app.agent.v3.pipeline.extract import update_state_from_extraction
from app.agent.v3.pipeline.generate import update_state_from_generation


class TurnResult:
    """Result of processing a single turn."""
    def __init__(
        self,
        messages: list[MessageWithTiming],
        state: AgentState,
        escalation: Optional[dict] = None,
        tokens_used: int = 0
    ):
        self.messages = messages
        self.state = state
        self.escalation = escalation
        self.tokens_used = tokens_used

    def get_plain_messages(self) -> list[str]:
        """Get just the message strings without timing."""
        return [m.content for m in self.messages]

    def to_dict(self) -> dict:
        """Convert to dictionary for API response."""
        return {
            "messages": [
                {
                    "content": m.content,
                    "typing_delay_ms": m.typing_delay_ms,
                    "pause_after_ms": m.pause_after_ms
                }
                for m in self.messages
            ],
            "escalation": self.escalation,
            "tokens_used": self.tokens_used,
            "state": {
                "traits": self.state.traits,
                "events": self.state.events,
                "turn_count": self.state.turn_count,
                "objections_raised": self.state.objections_raised
            }
        }


def run_turn(
    config: BaseAgentConfig,
    state: AgentState,
    message: str
) -> TurnResult:
    """
    Process a single conversation turn.

    Args:
        config: Agent configuration
        state: Current conversation state
        message: User's message

    Returns:
        TurnResult with messages, updated state, and optional escalation

    Flow:
        1. EXTRACT: Get traits, intent, objection from message
        2. UPDATE STATE: Apply extraction results
        3. CHECK ESCALATION: See if we need to hand off
        4. ASSEMBLE: Build context from RAG + examples
        5. GENERATE: Create response
        6. POST-PROCESS: Detect events, calculate timing
    """
    print(f"\n{'='*60}")
    print(f"Turn {state.turn_count + 1}: {message[:50]}...")
    print(f"{'='*60}")

    total_tokens = 0

    # 1. EXTRACT
    extraction_result = extract(config, state, message)
    total_tokens += extraction_result.tokens_used

    # 2. UPDATE STATE from extraction
    state = update_state_from_extraction(config, state, extraction_result, message)

    # 3. CHECK ESCALATION (early exit if triggered)
    escalation = post_process.check_escalation(config, state, extraction_result.intent)
    if escalation and escalation["action"] == "handoff":
        # Return escalation response immediately
        escalation_messages = [
            MessageWithTiming(content=msg, typing_delay_ms=800, pause_after_ms=500)
            for msg in escalation["response"]
        ]
        return TurnResult(
            messages=escalation_messages,
            state=state,
            escalation=escalation,
            tokens_used=total_tokens
        )

    # 4. ASSEMBLE context
    assembled = assemble(config, state, extraction_result, message)

    # 5. GENERATE response
    generated = generate(config, state, assembled)
    total_tokens += generated.tokens_used

    # 6. POST-PROCESS
    messages_with_timing, state, soft_escalation = post_process.post_process(
        config, state, generated, extraction_result.intent
    )

    # 7. Update state with assistant messages
    state = update_state_from_generation(state, generated)

    print(f"\nTotal tokens: {total_tokens}")
    print(f"State: traits={state.traits}, events={state.events}")

    return TurnResult(
        messages=messages_with_timing,
        state=state,
        escalation=soft_escalation,  # Soft escalation (offer_handoff) doesn't stop flow
        tokens_used=total_tokens
    )


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def run_conversation(
    config: BaseAgentConfig,
    messages: list[str],
    initial_state: Optional[AgentState] = None
) -> list[TurnResult]:
    """
    Run a full conversation (for testing).

    Args:
        config: Agent configuration
        messages: List of user messages
        initial_state: Optional initial state (creates new if None)

    Returns:
        List of TurnResult for each turn
    """
    state = initial_state or config.create_initial_state("test_thread")
    results = []

    for message in messages:
        result = run_turn(config, state, message)
        results.append(result)
        state = result.state

        # Stop if hard escalation
        if result.escalation and result.escalation["action"] == "handoff":
            break

    return results


def quick_test(message: str = "oi, quero aprender violão"):
    """Quick test function for development."""
    from app.agent.v3.agents.nina import NINA_CONFIG, create_nina_state

    state = create_nina_state("test_thread")
    result = run_turn(NINA_CONFIG, state, message)

    print("\n" + "="*60)
    print("RESPONSE:")
    print("="*60)
    for msg in result.messages:
        print(f"  [{msg.typing_delay_ms}ms] {msg.content}")

    return result
