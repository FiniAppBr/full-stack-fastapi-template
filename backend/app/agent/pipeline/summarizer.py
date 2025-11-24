"""
Summarizer - History compression for token efficiency.

When conversation gets long, summarize older messages
to fit within context limits while preserving key info.
"""
import os
from typing import Optional

from openai import OpenAI

from app.llm.openai import models
from app.lib.retry import openai_retry


_openai_client = None


def _get_client() -> OpenAI:
    """Get or create OpenAI client."""
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _openai_client


@openai_retry
def _call_summarize_api(client, model, messages, max_tokens):
    """Call OpenAI API for summarization."""
    return client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.3,
        max_tokens=max_tokens,
        extra_body={
            "provider": {
                "order": ["Chutes"],
                "allow_fallbacks": True,
            }
        }
    )


def summarize_history(
    messages: list[dict],
    keep_recent: int = 4,
    max_summary_tokens: int = 200
) -> tuple[str, list[dict]]:
    """
    Summarize old messages, keep recent ones in full.

    Args:
        messages: Full message history
        keep_recent: Number of recent messages to keep in full
        max_summary_tokens: Max tokens for summary

    Returns:
        Tuple of (summary_text, recent_messages)
    """
    if len(messages) <= keep_recent:
        return "", messages

    # Split into old (to summarize) and recent (to keep)
    old_messages = messages[:-keep_recent]
    recent_messages = messages[-keep_recent:]

    # Format old messages for summarization
    conversation_text = "\n".join([
        f"{msg.get('role', 'user').upper()}: {msg.get('content', '')}"
        for msg in old_messages
    ])

    try:
        client = _get_client()
        response = _call_summarize_api(
            client,
            models.extraction_model,  # Use faster model for summarization
            [
                {
                    "role": "system",
                    "content": """Summarize this conversation history into 2-3 sentences.

Focus on:
- Key customer needs/interests identified
- Important decisions made
- Any commitments or next steps agreed

Keep the summary brief but capture essential context."""
                },
                {
                    "role": "user",
                    "content": conversation_text
                }
            ],
            max_summary_tokens
        )

        summary = response.choices[0].message.content
        return summary, recent_messages

    except Exception as e:
        print(f"Summarization error: {e}")
        # On error, just truncate without summary
        return "", recent_messages


def estimate_tokens(text: str, avg_chars_per_token: int = 4) -> int:
    """
    Estimate token count from text.

    Args:
        text: Text to estimate
        avg_chars_per_token: Average characters per token (4 for English/Portuguese)

    Returns:
        Estimated token count
    """
    return len(text) // avg_chars_per_token


def should_summarize(
    messages: list[dict],
    max_history_tokens: int = 3500,
    max_message_count: int = 6
) -> bool:
    """
    Check if history should be summarized.

    Args:
        messages: Current message history
        max_history_tokens: Token limit for history
        max_message_count: Message count limit

    Returns:
        True if summarization needed
    """
    # Check message count
    if len(messages) > max_message_count:
        return True

    # Check estimated token count
    total_text = " ".join(msg.get("content", "") for msg in messages)
    estimated_tokens = estimate_tokens(total_text)

    return estimated_tokens > max_history_tokens
