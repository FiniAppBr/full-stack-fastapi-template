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
        # Mem0 makes TWO LLM calls per conversation:
        # 1. Fact extraction: conversation + USER_MEMORY_EXTRACTION_PROMPT (~500 tokens)
        # 2. Memory management: DEFAULT_UPDATE_MEMORY_PROMPT (~800 tokens) + old memories + new facts

        enc = tiktoken.get_encoding("cl100k_base")
        conversation_tokens = len(enc.encode(conversation_text))

        # Call 1: Fact Extraction
        # Based on actual OpenRouter data: ~200 input tokens total
        fact_extraction_prompt_tokens = 120  # USER_MEMORY_EXTRACTION_PROMPT (actual, not estimated)
        call1_input = conversation_tokens + fact_extraction_prompt_tokens
        call1_output = 15  # Extracted facts (short JSON)

        # Call 2: Memory Management (ADD/UPDATE/DELETE decisions)
        # Based on actual OpenRouter data: ~740 input tokens total
        # Breakdown: prompt (~650) + old memories (~50) + new facts (~15) + overhead (~25)
        memory_management_prompt_tokens = 650  # DEFAULT_UPDATE_MEMORY_PROMPT (calibrated from real data)
        retrieved_memories_tokens = 50  # Average: ~5 old memories retrieved from vector search
        new_facts_tokens = call1_output  # Facts from Call 1
        overhead_tokens = 25  # JSON formatting, system messages
        call2_input = memory_management_prompt_tokens + retrieved_memories_tokens + new_facts_tokens + overhead_tokens
        call2_output = 6  # JSON response with actions

        # Total across both calls
        estimated_input = call1_input + call2_input
        estimated_output = call1_output + call2_output

        # Add to Mem0 - it will extract facts automatically
        result = memory.add(
            messages=conversation_text,
            user_id=user_id,
            metadata=metadata or {}
        )

        activity.logger.info(f"✅ Saved memory for user {user_id}")
        activity.logger.info(f"📊 Estimated tokens (2 LLM calls):")
        activity.logger.info(f"   Call 1 (fact extraction): {call1_input}→{call1_output}")
        activity.logger.info(f"   Call 2 (memory mgmt): {call2_input}→{call2_output}")
        activity.logger.info(f"   Total: {estimated_input}→{estimated_output} = {estimated_input + estimated_output}")

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
