"""
Format Pipeline Stage - Multi-message response formatting.

Splits long responses into multiple shorter messages
for more natural chat-like conversation flow.

This is the final stage of the pipeline.
"""
import re
from typing import Literal


def split_response_messages(
    response: str,
    max_splits: int = 4,
    style: Literal["short", "medium", "long"] = "medium"
) -> list[str]:
    """
    Split a response into multiple messages for natural conversation flow.

    Args:
        response: The full response text
        max_splits: Maximum number of messages to create (default 4)
        style: Splitting style
            - short: One sentence per message (energetic, quick)
            - medium: Balanced 1-2 sentences per message (natural)
            - long: 2-3 sentences per message (deliberate)

    Returns:
        List of message strings
    """
    if max_splits <= 1:
        return [response]

    response = response.strip()
    if not response:
        return []

    # Split into sentences
    sentences = re.split(r'(?<=[.!?])\s+', response)
    sentences = [s.strip() for s in sentences if s.strip()]

    if not sentences:
        return [response]

    if len(sentences) == 1:
        return [response]

    if style == "short":
        return _split_short(sentences, max_splits)
    elif style == "long":
        return _split_long(sentences, max_splits)
    else:
        return _split_medium(sentences, max_splits)


def _split_short(sentences: list[str], max_splits: int) -> list[str]:
    """One sentence per message - energetic, quick."""
    if len(sentences) <= max_splits:
        return sentences

    # First (max_splits - 1) sentences as individual messages
    # Last message gets all remaining sentences joined
    messages = sentences[:max_splits - 1]
    remaining = sentences[max_splits - 1:]
    messages.append(' '.join(remaining))
    return messages


def _split_medium(sentences: list[str], max_splits: int) -> list[str]:
    """1-2 sentences per message - natural conversation."""
    if len(sentences) <= max_splits:
        return sentences

    messages = []
    sentences_per_message = max(1, len(sentences) // max_splits)

    for i in range(0, len(sentences), sentences_per_message):
        chunk = sentences[i:i+sentences_per_message]
        if chunk:
            messages.append(' '.join(chunk))
        if len(messages) >= max_splits:
            break

    # Handle remaining sentences
    if messages and len(messages) < max_splits:
        remaining_start = len(messages) * sentences_per_message
        if remaining_start < len(sentences):
            remaining = sentences[remaining_start:]
            if remaining:
                if len(messages) < max_splits:
                    messages.append(' '.join(remaining))
                else:
                    messages[-1] = messages[-1] + ' ' + ' '.join(remaining)

    return messages


def _split_long(sentences: list[str], max_splits: int) -> list[str]:
    """2-3 sentences per message - deliberate, complete thoughts."""
    if len(sentences) <= 3:
        return [' '.join(sentences)]

    messages = []
    sentences_per_message = max(2, len(sentences) // max(2, max_splits // 2))

    for i in range(0, len(sentences), sentences_per_message):
        chunk = sentences[i:i+sentences_per_message]
        if chunk:
            messages.append(' '.join(chunk))
        if len(messages) >= max_splits:
            break

    # Handle remaining
    if messages and len(messages) < max_splits:
        remaining_start = len(messages) * sentences_per_message
        if remaining_start < len(sentences):
            remaining = sentences[remaining_start:]
            if remaining:
                messages[-1] = messages[-1] + ' ' + ' '.join(remaining)

    return messages
