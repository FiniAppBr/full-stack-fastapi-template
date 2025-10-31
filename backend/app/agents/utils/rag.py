"""
RAG (Retrieval-Augmented Generation) Utilities
Optimized for token efficiency
"""
from typing import Any


def build_contextual_search_query(
    current_message: str,
    conversation_history: list[dict[str, str]] | None = None,
    max_context_turns: int = 3
) -> str:
    """
    Build a contextual search query for RAG by combining recent history.

    This helps with follow-up questions like:
    - "E agora?" (And now?)
    - "What about for a large one?"
    - "How much does that cost?"

    Args:
        current_message: The user's current message
        conversation_history: Recent conversation turns [{"role": "user|assistant", "content": "..."}]
        max_context_turns: How many recent messages to include for context

    Returns:
        Contextual search query string

    Example:
        history = [
            {"role": "user", "content": "Do you do dog grooming?"},
            {"role": "assistant", "content": "Yes, we offer grooming for small dogs."}
        ]
        query = build_contextual_search_query("What about large dogs?", history)
        # Returns: "Do you do dog grooming? Yes, we offer grooming for small dogs. What about large dogs?"
    """
    if not conversation_history:
        return current_message

    # Take last N messages for context (avoid token bloat)
    recent_messages = conversation_history[-max_context_turns:]
    context_parts = [msg["content"] for msg in recent_messages]

    # Combine: "previous context... current question"
    return " ".join(context_parts + [current_message])


def build_knowledge_context(
    knowledge_chunks: list[dict[str, Any]],
    max_tokens: int = 500,
    avg_chars_per_token: int = 4
) -> str:
    """
    Build formatted knowledge context from RAG chunks.

    Optimized for token efficiency:
    - Limits total context size
    - Uses concise formatting
    - Includes category for context

    Args:
        knowledge_chunks: List of chunks from search_knowledge activity
            Each chunk has: {id, content, category, similarity, title}
        max_tokens: Maximum tokens to use for RAG context (default: 500)
        avg_chars_per_token: Average characters per token for estimation

    Returns:
        Formatted knowledge context string

    Example:
        chunks = [
            {"content": "We groom small dogs for $50", "category": "grooming", "similarity": 0.85},
            {"content": "Open 9am-5pm Mon-Fri", "category": "hours", "similarity": 0.72}
        ]
        context = build_knowledge_context(chunks, max_tokens=100)
        # Returns:
        # "Relevant business information:
        # 1. [grooming] We groom small dogs for $50
        # 2. [hours] Open 9am-5pm Mon-Fri"
    """
    if not knowledge_chunks:
        return "No relevant knowledge found in the database."

    max_chars = max_tokens * avg_chars_per_token
    context_lines = ["Relevant business information:"]
    current_chars = len(context_lines[0])

    for idx, chunk in enumerate(knowledge_chunks, 1):
        # Format: "1. [category] content"
        line = f"{idx}. [{chunk['category']}] {chunk['content']}"
        line_chars = len(line)

        # Stop if adding this line would exceed token limit
        if current_chars + line_chars > max_chars:
            context_lines.append(f"... ({len(knowledge_chunks) - idx + 1} more results truncated for token efficiency)")
            break

        context_lines.append(line)
        current_chars += line_chars

    return "\n".join(context_lines)
