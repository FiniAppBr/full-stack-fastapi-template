"""
Token Utilities - Token counting and budget management.
"""
from typing import List


def estimate_tokens(text: str, avg_chars_per_token: int = 4) -> int:
    """
    Estimate token count from text.

    Uses simple character-based estimation.
    For more accuracy, use tiktoken library.

    Args:
        text: Text to estimate
        avg_chars_per_token: Average characters per token (4 for English/Portuguese)

    Returns:
        Estimated token count
    """
    if not text:
        return 0
    return len(text) // avg_chars_per_token


def count_message_tokens(messages: List[dict]) -> int:
    """
    Estimate total tokens in message list.

    Args:
        messages: List of message dicts with 'content' key

    Returns:
        Estimated total tokens
    """
    total = 0
    for msg in messages:
        content = msg.get("content", "")
        total += estimate_tokens(content)
        # Add overhead for message structure
        total += 4  # ~4 tokens per message for role, etc.
    return total


def check_token_budget(
    messages: List[dict],
    system_prompt: str,
    rag_context: str = "",
    max_input_tokens: int = 8000,
    reserve_for_response: int = 2000
) -> tuple[bool, int, int]:
    """
    Check if content fits within token budget.

    Args:
        messages: Conversation messages
        system_prompt: System prompt text
        rag_context: RAG context text
        max_input_tokens: Maximum input tokens allowed
        reserve_for_response: Tokens reserved for model response

    Returns:
        Tuple of (within_budget, estimated_tokens, available_tokens)
    """
    available = max_input_tokens - reserve_for_response

    estimated = (
        estimate_tokens(system_prompt) +
        estimate_tokens(rag_context) +
        count_message_tokens(messages)
    )

    return estimated <= available, estimated, available


# Default budget breakdown (from proposed-react.txt)
DEFAULT_BUDGET = {
    "max_input_tokens": 8000,
    "reserve_for_response": 2000,
    "system_prompt": 1500,
    "stage_instructions": 300,
    "rag_context": 2000,
    "message_history": 3500,
    "tool_definitions": 700,
}
