"""
v3 Post-Process Pipeline - Event detection and timing calculation.

Input: config + state + generated response
Output: Messages with timing + updated state
"""

import re
from typing import Optional

from app.agent.v3.schema import (
    AgentState,
    GenerateResult,
    MessageWithTiming,
)
from app.agent.v3.config import BaseAgentConfig


def calculate_typing_delays(
    messages: list[str],
    config: BaseAgentConfig
) -> list[MessageWithTiming]:
    """
    Calculate typing simulation delays for each message.

    Args:
        messages: List of message strings
        config: Agent configuration (for timing settings)

    Returns:
        List of MessageWithTiming with delays
    """
    typing_config = config.multi_message.typing
    result = []

    for i, msg in enumerate(messages):
        # Calculate typing delay based on message length
        delay = min(
            typing_config.base_ms + len(msg) * typing_config.per_char_ms,
            typing_config.max_delay_ms
        )

        # Pause after message (except last)
        pause = typing_config.between_messages_ms if i < len(messages) - 1 else 0

        result.append(MessageWithTiming(
            content=msg,
            typing_delay_ms=delay,
            pause_after_ms=pause
        ))

    return result


def detect_events_from_response(
    config: BaseAgentConfig,
    state: AgentState,
    messages: list[str]
) -> AgentState:
    """
    Detect events from response using regex patterns.

    Args:
        config: Agent configuration
        state: Current state
        messages: Generated messages

    Returns:
        Updated state with detected events
    """
    # Combine all messages for regex matching
    full_response = " ".join(messages)

    for event in config.events:
        # Skip if already set
        if state.get_event(event.id):
            continue

        # Check regex pattern if defined
        if event.detect_regex:
            try:
                if re.search(event.detect_regex, full_response, re.IGNORECASE):
                    state.set_event(event.id, True)
                    print(f"  Event detected: {event.id}")
            except re.error as e:
                print(f"  Regex error for event {event.id}: {e}")

    return state


def check_escalation(
    config: BaseAgentConfig,
    state: AgentState,
    intent: str
) -> Optional[dict]:
    """
    Check if escalation should be triggered.

    Args:
        config: Agent configuration
        state: Current state
        intent: Detected intent

    Returns:
        Escalation info dict if triggered, None otherwise
    """
    for trigger in config.escalation_triggers:
        condition = trigger.condition
        should_escalate = False

        # Simple condition evaluation
        if "intent ==" in condition:
            # e.g., "intent == 'wants_human'"
            expected_intent = condition.split("==")[1].strip().strip("'\"")
            should_escalate = intent == expected_intent

        elif "same_objection_count >=" in condition:
            # e.g., "same_objection_count >= 3"
            threshold = int(condition.split(">=")[1].strip())
            # Count max occurrences of same objection
            from collections import Counter
            counts = Counter(state.objections_raised)
            max_count = max(counts.values()) if counts else 0
            should_escalate = max_count >= threshold

        if should_escalate:
            return {
                "action": trigger.action,
                "response": trigger.response
            }

    return None


def post_process(
    config: BaseAgentConfig,
    state: AgentState,
    generated: GenerateResult,
    intent: str
) -> tuple[list[MessageWithTiming], AgentState, Optional[dict]]:
    """
    Post-process generated response.

    Args:
        config: Agent configuration
        state: Current state
        generated: Generation result
        intent: Detected intent (for escalation check)

    Returns:
        Tuple of (messages_with_timing, updated_state, escalation_info)
    """
    print("-> Post-process (v3)")

    # 1. Detect events from response
    state = detect_events_from_response(config, state, generated.messages)

    # 2. Check for escalation
    escalation = check_escalation(config, state, intent)
    if escalation:
        print(f"  Escalation triggered: {escalation['action']}")

    # 3. Calculate typing delays
    messages_with_timing = calculate_typing_delays(generated.messages, config)

    print(f"  Messages: {len(messages_with_timing)}")

    return messages_with_timing, state, escalation
