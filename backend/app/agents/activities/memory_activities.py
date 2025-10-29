"""
Memory Activities for Temporal Workflows
Handles Mem0 read/write operations and conversation history as durable activities
"""
from temporalio import activity
from typing import List, Dict, Any, Optional


@activity.defn
async def get_relevant_memories(user_id: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Retrieve relevant memories from Mem0 for the user.

    Args:
        user_id: Customer/user ID
        query: Current message or context to search against
        limit: Max number of memories to retrieve

    Returns:
        List of memory objects with text and metadata
    """
    from app.core.memory import get_memory

    memory = get_memory()

    try:
        # Search for relevant memories
        search_result = memory.search(
            query=query,
            user_id=user_id,
            limit=limit
        )

        # Mem0 returns: {'results': [...]}
        memories = []
        if isinstance(search_result, dict) and 'results' in search_result:
            for result in search_result['results']:
                memories.append({
                    "text": result.get("memory", ""),
                    "score": result.get("score", 0.0),
                    "metadata": result.get("metadata", {}),
                    "created_at": result.get("created_at", ""),
                    "id": result.get("id", ""),
                })

        return memories
    except Exception as e:
        activity.logger.error(f"Error retrieving memories: {e}")
        return []  # Fail gracefully, return empty list


@activity.defn
async def save_conversation_memory(
    user_id: str,
    messages: List[Dict[str, str]],
    metadata: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Save conversation to Mem0 for long-term memory extraction.
    This runs ASYNC after response is sent - fire and forget.

    Args:
        user_id: Customer/user ID
        messages: List of {"role": "user"|"assistant", "content": "..."}
        metadata: Optional metadata (intent, confidence, etc.)

    Returns:
        Dict with success status and estimated token usage
    """
    from app.core.memory import get_memory
    import traceback
    import tiktoken

    activity.logger.info(f"🔵 Starting memory save for user {user_id}")

    memory = get_memory()

    try:
        # Format conversation for Mem0
        conversation_text = "\n".join([
            f"{msg['role'].title()}: {msg['content']}"
            for msg in messages
        ])

        activity.logger.info(f"🔵 Formatted conversation: {conversation_text[:100]}...")

        # Estimate token usage (since Mem0 doesn't expose it)
        enc = tiktoken.get_encoding("cl100k_base")
        conversation_tokens = len(enc.encode(conversation_text))

        # Add system prompt overhead for fact extraction (Mem0's internal prompt)
        system_prompt_overhead = 150

        # Estimated input: conversation + system prompt
        estimated_input = conversation_tokens + system_prompt_overhead

        # Estimated output: extracted fact (usually ~10-20 tokens)
        estimated_output = 15

        # Add to Mem0 - it will extract facts automatically
        result = memory.add(
            messages=conversation_text,
            user_id=user_id,
            metadata=metadata or {}
        )

        activity.logger.info(f"✅ Saved memory for user {user_id}")
        activity.logger.info(f"📊 Estimated tokens - Input: {estimated_input}, Output: {estimated_output}")

        return {
            "success": True,
            "input_tokens": estimated_input,
            "output_tokens": estimated_output,
            "total_tokens": estimated_input + estimated_output,
        }
    except Exception as e:
        activity.logger.error(f"❌ Error saving memory: {e}")
        activity.logger.error(f"Traceback: {traceback.format_exc()}")
        return {
            "success": False,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
        }


@activity.defn
async def get_conversation_history(
    customer_id: str,
    agent_id: str,
    limit: int = 3
) -> List[Dict[str, str]]:
    """
    Retrieve recent conversation history for short-term context.

    Args:
        customer_id: Customer/user ID
        agent_id: Agent/business ID
        limit: Number of recent turns to retrieve (default: 3)

    Returns:
        List of conversation turns: [{"role": "user"|"assistant", "content": "..."}]
    """
    from sqlmodel import Session, create_engine, select, desc
    from app.models import ConversationLog
    from app.core.config import settings

    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

    try:
        with Session(engine) as session:
            # Get recent conversations, ordered by newest first
            statement = (
                select(ConversationLog)
                .where(ConversationLog.customer_id == customer_id)
                .where(ConversationLog.agent_id == agent_id)
                .order_by(desc(ConversationLog.created_at))
                .limit(limit)
            )
            logs = session.exec(statement).all()

            # Reverse to get chronological order (oldest first)
            history = []
            for log in reversed(logs):
                history.append({"role": "user", "content": log.message})
                history.append({"role": "assistant", "content": log.response})

            return history

    except Exception as e:
        activity.logger.error(f"Error retrieving conversation history: {e}")
        return []  # Fail gracefully
