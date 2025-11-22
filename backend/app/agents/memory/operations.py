"""
Memory operations - Mem0 read/write and conversation history.
Extracted from Temporal activities for use with LangGraph.
"""
from typing import List, Dict, Any
from sqlmodel import Session, select, desc

from app.core.memory import get_memory
from app.core.db import engine
from app.models import ConversationLog


def get_relevant_memories(user_id: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Retrieve relevant memories from Mem0 for the user.

    Args:
        user_id: Customer/user ID
        query: Current message or context to search against
        limit: Max number of memories to retrieve

    Returns:
        List of memory objects with text and metadata
    """
    memory = get_memory()

    try:
        search_result = memory.search(
            query=query,
            user_id=user_id,
            limit=limit
        )

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
        print(f"Error retrieving memories: {e}")
        return []


def save_conversation_memory(
    user_id: str,
    messages: List[Dict[str, str]],
    metadata: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Save conversation to Mem0 for long-term memory extraction.

    Args:
        user_id: Customer/user ID
        messages: List of {"role": "user"|"assistant", "content": "..."}
        metadata: Optional metadata (intent, confidence, etc.)

    Returns:
        Dict with success status and estimated token usage
    """
    import tiktoken

    memory = get_memory()

    try:
        # Format conversation for Mem0
        conversation_text = "\n".join([
            f"{msg['role'].title()}: {msg['content']}"
            for msg in messages
        ])

        # Estimate token usage
        enc = tiktoken.get_encoding("cl100k_base")
        conversation_tokens = len(enc.encode(conversation_text))

        # Mem0 makes 2 LLM calls per conversation
        fact_extraction_prompt_tokens = 120
        call1_input = conversation_tokens + fact_extraction_prompt_tokens
        call1_output = 15

        memory_management_prompt_tokens = 650
        retrieved_memories_tokens = 50
        new_facts_tokens = call1_output
        overhead_tokens = 25
        call2_input = memory_management_prompt_tokens + retrieved_memories_tokens + new_facts_tokens + overhead_tokens
        call2_output = 6

        estimated_input = call1_input + call2_input
        estimated_output = call1_output + call2_output

        # Add to Mem0
        memory.add(
            messages=conversation_text,
            user_id=user_id,
            metadata=metadata or {}
        )

        return {
            "success": True,
            "input_tokens": estimated_input,
            "output_tokens": estimated_output,
            "total_tokens": estimated_input + estimated_output,
        }
    except Exception as e:
        print(f"Error saving memory: {e}")
        return {
            "success": False,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
        }


def get_conversation_history(
    customer_id: str,
    agent_id: int,
    limit: int = 3
) -> List[Dict[str, str]]:
    """
    Retrieve recent conversation history for short-term context.

    Args:
        customer_id: Customer/user ID
        agent_id: Agent/business ID
        limit: Number of recent turns to retrieve

    Returns:
        List of conversation turns: [{"role": "user"|"assistant", "content": "..."}]
    """
    try:
        with Session(engine) as session:
            statement = (
                select(ConversationLog)
                .where(ConversationLog.customer_id == customer_id)
                .where(ConversationLog.agent_id == str(agent_id))
                .order_by(desc(ConversationLog.created_at))
                .limit(limit)
            )
            logs = session.exec(statement).all()

            # Reverse to get chronological order
            history = []
            for log in reversed(logs):
                history.append({"role": "user", "content": log.message})
                history.append({"role": "assistant", "content": log.response})

            return history

    except Exception as e:
        print(f"Error retrieving conversation history: {e}")
        return []
