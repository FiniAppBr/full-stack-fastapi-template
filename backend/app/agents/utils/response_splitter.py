"""
Multi-turn Response Splitter

Splits long AI responses into multiple shorter messages to feel more natural,
like how real people type in chat apps.
"""
import re
from typing import Literal


def split_response(
    response: str,
    max_splits: int = 3,
    style: Literal["natural", "rapid", "formal"] = "natural"
) -> list[str]:
    """
    Split a response into multiple messages for more natural conversation flow.

    Args:
        response: The full response text
        max_splits: Maximum number of messages to create (1 = no split)
        style: Splitting style
            - natural: Split on sentences, keep flow natural
            - rapid: Short bursts, energetic feel (2-3 short messages)
            - formal: Longer splits, more deliberate

    Returns:
        List of message strings

    Example:
        >>> response = "Here's our menu! We have 15 pizzas. Which one sounds good?"
        >>> split_response(response, style="natural")
        ["Here's our menu!", "We have 15 pizzas 🍕", "Which one sounds good?"]
    """
    if max_splits <= 1:
        return [response]

    # Clean and normalize
    response = response.strip()

    # Split into sentences
    sentences = re.split(r'([.!?]+[\s])', response)
    sentences = [''.join(sentences[i:i+2]).strip() for i in range(0, len(sentences)-1, 2)]

    # If response didn't end with punctuation, add last part
    if len(sentences) > 0 and not sentences[-1]:
        sentences = sentences[:-1]
    if response and not response[-1] in '.!?':
        sentences.append(response.split(sentences[-1] if sentences else '')[-1].strip())

    # Remove empty sentences
    sentences = [s for s in sentences if s]

    if not sentences:
        return [response]

    # If only 1-2 sentences, don't split
    if len(sentences) <= 2:
        return [response]

    # Apply style-specific splitting
    if style == "rapid":
        # Quick bursts - prefer shorter splits
        return _split_rapid(sentences, max_splits)
    elif style == "formal":
        # Longer, more deliberate splits
        return _split_formal(sentences, max_splits)
    else:  # natural
        # Balanced, conversational splits
        return _split_natural(sentences, max_splits)


def _split_natural(sentences: list[str], max_splits: int) -> list[str]:
    """Natural conversational splitting - balanced message lengths"""
    if len(sentences) <= max_splits:
        return sentences[:max_splits]

    # Group sentences into roughly equal chunks
    chunk_size = len(sentences) // max_splits
    messages = []

    for i in range(0, len(sentences), chunk_size):
        chunk = sentences[i:i+chunk_size]
        if chunk:
            messages.append(' '.join(chunk))
        if len(messages) >= max_splits:
            break

    return messages


def _split_rapid(sentences: list[str], max_splits: int) -> list[str]:
    """Rapid energetic splitting - shorter bursts"""
    # Take first max_splits sentences, keep them short
    messages = []
    for sentence in sentences[:max_splits]:
        # If sentence is very long, try to split further
        if len(sentence) > 100:
            # Split on commas or conjunctions
            parts = re.split(r',\s+|\s+and\s+|\s+but\s+', sentence, maxsplit=1)
            messages.extend(parts[:2])
        else:
            messages.append(sentence)

        if len(messages) >= max_splits:
            break

    return messages[:max_splits]


def _split_formal(sentences: list[str], max_splits: int) -> list[str]:
    """Formal deliberate splitting - longer, complete thoughts"""
    if len(sentences) <= 2:
        return sentences

    # Keep 2-3 longer messages with complete thoughts
    splits = min(max_splits, 2)
    messages = []

    mid = len(sentences) // 2
    messages.append(' '.join(sentences[:mid]))
    messages.append(' '.join(sentences[mid:]))

    return messages
