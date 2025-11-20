"""
Multi-turn Response Splitter

Splits long AI responses into multiple shorter messages to feel more natural,
like how real people type in chat apps.
"""
import re
from typing import Literal


def split_response(
    response: str,
    max_splits: int = 4,
    style: Literal["short", "medium", "long"] = "medium"
) -> list[str]:
    """
    Split a response into multiple messages for more natural conversation flow.

    Args:
        response: The full response text
        max_splits: Maximum number of messages to create (default 4)
        style: Splitting style
            - short: One sentence per message (energetic, quick)
            - medium: Balanced 1-2 sentences per message (natural conversation)
            - long: 2-3 sentences per message (more deliberate)

    Returns:
        List of message strings

    Example:
        >>> response = "Here's our menu! We have 15 pizzas. Which one sounds good?"
        >>> split_response(response, style="medium")
        ["Here's our menu!", "We have 15 pizzas.", "Which one sounds good?"]
    """
    if max_splits <= 1:
        return [response]

    # Clean and normalize
    response = response.strip()
    if not response:
        return []

    # Split into sentences using better regex
    # Matches: period/exclamation/question followed by space or end of string
    sentences = re.split(r'(?<=[.!?])\s+', response)

    # Clean up empty strings
    sentences = [s.strip() for s in sentences if s.strip()]

    if not sentences:
        return [response]

    # If only 1 sentence, return as-is
    if len(sentences) == 1:
        return [response]

    # Apply style-specific splitting
    if style == "short":
        return _split_short(sentences, max_splits)
    elif style == "long":
        return _split_long(sentences, max_splits)
    else:  # medium (default)
        return _split_medium(sentences, max_splits)


def _split_short(sentences: list[str], max_splits: int) -> list[str]:
    """
    Short splitting - one sentence per message.
    Energetic, quick responses like casual chat.
    """
    # Return first max_splits sentences as individual messages
    return sentences[:max_splits]


def _split_medium(sentences: list[str], max_splits: int) -> list[str]:
    """
    Medium splitting - balanced 1-2 sentences per message.
    Natural conversational flow.
    """
    # If we have fewer sentences than max_splits, return as-is
    if len(sentences) <= max_splits:
        return sentences

    # Group sentences into balanced chunks
    messages = []
    sentences_per_message = max(1, len(sentences) // max_splits)

    for i in range(0, len(sentences), sentences_per_message):
        chunk = sentences[i:i+sentences_per_message]
        if chunk:
            messages.append(' '.join(chunk))
        if len(messages) >= max_splits:
            break

    # Handle remaining sentences if any were left out
    if messages and len(messages) < max_splits:
        remaining_start = len(messages) * sentences_per_message
        if remaining_start < len(sentences):
            remaining = sentences[remaining_start:]
            if remaining:
                # Add to last message or create new one
                if len(messages) < max_splits:
                    messages.append(' '.join(remaining))
                else:
                    messages[-1] = messages[-1] + ' ' + ' '.join(remaining)

    return messages


def _split_long(sentences: list[str], max_splits: int) -> list[str]:
    """
    Long splitting - 2-3 sentences per message.
    More deliberate, complete thoughts.
    """
    # If we have very few sentences, group them
    if len(sentences) <= 3:
        return [' '.join(sentences)]

    # Group 2-3 sentences per message
    messages = []
    sentences_per_message = max(2, len(sentences) // max(2, max_splits // 2))

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
                # Add to last message
                messages[-1] = messages[-1] + ' ' + ' '.join(remaining)

    return messages
