"""
Typing Time Calculator - Simulates human typing delays.

Calculates realistic typing time for each message based on:
- Character count
- Base typing speed (chars per second)
- Random variance for naturalness
- Minimum/maximum bounds
"""

import random
from pydantic import BaseModel


class MessageWithTyping(BaseModel):
    """Message with simulated typing time."""
    text: str
    typing_time: float  # Seconds to "type" this message


# Typing speed config (chars per second)
# Average human: ~40 WPM = ~3.3 chars/sec
# Casual WhatsApp: ~8-10 chars/sec
DEFAULT_CHARS_PER_SECOND = 9.0   # Casual, natural typing
VARIANCE_PERCENT = 0.30  # ±30% variance for natural feel
MIN_TYPING_TIME = 0.8    # Minimum seconds
MAX_TYPING_TIME = 6.0    # Cap for longer messages


def calculate_typing_time(
    text: str,
    chars_per_second: float = DEFAULT_CHARS_PER_SECOND,
    variance: float = VARIANCE_PERCENT,
    min_time: float = MIN_TYPING_TIME,
    max_time: float = MAX_TYPING_TIME
) -> float:
    """
    Calculate realistic typing time for a message.

    Args:
        text: The message text
        chars_per_second: Base typing speed
        variance: Random variance (0.25 = ±25%)
        min_time: Minimum typing time in seconds
        max_time: Maximum typing time in seconds

    Returns:
        Typing time in seconds (rounded to 1 decimal)
    """
    char_count = len(text)

    # Base time from character count
    base_time = char_count / chars_per_second

    # Add random variance
    variance_amount = base_time * variance
    adjusted_time = base_time + random.uniform(-variance_amount, variance_amount)

    # Clamp to bounds
    final_time = max(min_time, min(max_time, adjusted_time))

    return round(final_time, 1)


def add_typing_times(messages: list[str]) -> list[MessageWithTyping]:
    """
    Add typing times to a list of messages.

    Args:
        messages: List of message strings

    Returns:
        List of MessageWithTyping objects
    """
    return [
        MessageWithTyping(
            text=msg,
            typing_time=calculate_typing_time(msg)
        )
        for msg in messages
    ]


def messages_to_dict(messages_with_typing: list[MessageWithTyping]) -> list[dict]:
    """
    Convert MessageWithTyping list to dict format for JSON response.

    Args:
        messages_with_typing: List of MessageWithTyping objects

    Returns:
        List of {"text": str, "typing_time": float} dicts
    """
    return [
        {"text": m.text, "typing_time": m.typing_time}
        for m in messages_with_typing
    ]
