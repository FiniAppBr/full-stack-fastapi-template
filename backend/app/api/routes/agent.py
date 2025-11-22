"""
Agent Chat API - LangGraph + Mem0 Implementation
Replaces Temporal workflow with direct LangGraph execution.
"""

from dataclasses import asdict
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import get_db
from app.models import ConversationLog
from app.langgraph import (
    get_or_create_agent_graph,
    split_response_from_state,
    clear_agent_graph_cache
)
from app.agents.config import OptimizationConfig

router = APIRouter()


class ChatRequest(BaseModel):
    """Chat request payload."""
    agent_id: int
    customer_id: str
    message: str
    conversation_id: Optional[int] = None
    conversation_ended: bool = False


class ChatResponse(BaseModel):
    """Chat response payload."""
    messages: list[str]  # Split messages for multi-turn
    response: str  # Full response (backward compat)
    state: dict  # Current state fields
    conversation_id: int
    memory_saved: bool
    save_reason: str
    tokens_used: Optional[dict] = None  # Token usage stats


def load_conversation_history(
    db: Session,
    customer_id: str,
    agent_id: int,
    limit: int = 5
) -> list[dict]:
    """
    Load conversation history from database.
    Simplified version using conversation_log table.

    Args:
        db: Database session
        customer_id: Customer identifier
        agent_id: Agent identifier
        limit: Max conversation turns to load

    Returns:
        List of messages [{"role": "user", "content": "..."}, ...]
    """
    # Load most recent conversations for this customer+agent
    statement = (
        select(ConversationLog)
        .where(ConversationLog.customer_id == customer_id)
        .where(ConversationLog.agent_id == str(agent_id))
        .order_by(ConversationLog.created_at.desc())
        .limit(limit)
    )

    logs = db.exec(statement).all()

    # Convert to LangGraph format (reverse to chronological order)
    # Each log has user message + assistant response
    messages = []
    for log in reversed(logs):
        messages.append({"role": "user", "content": log.message})
        messages.append({"role": "assistant", "content": log.response})

    return messages


def save_conversation_to_db(
    db: Session,
    agent_id: int,
    customer_id: str,
    user_message: str,
    assistant_messages: list[str],
    state: dict,
    duration_seconds: float = 0.0
) -> int:
    """
    Save conversation turn to database.
    Simplified version using conversation_log table.

    Args:
        db: Database session
        agent_id: Agent ID
        customer_id: Customer ID
        user_message: User's message
        assistant_messages: Assistant's split messages
        state: Current state dict
        duration_seconds: Execution time

    Returns:
        Conversation log ID
    """
    # Create conversation log entry
    conversation = ConversationLog(
        workflow_id=f"langgraph-{agent_id}-{customer_id}",
        agent_id=str(agent_id),
        customer_id=customer_id,
        message=user_message,
        response=" ".join(assistant_messages),  # Join split messages
        sentiment=state.get("sentiment", "neutral"),
        requires_handoff=state.get("requires_handoff", False),
        urgency=state.get("urgency", "normal"),
        duration_seconds=duration_seconds,
        status="completed",
        model_used="gpt-4o-mini"
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return conversation.id


@router.post("/chat", response_model=ChatResponse)
async def agent_chat(
    request: ChatRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Chat with an agent using LangGraph + Mem0.

    Replaces the Temporal workflow with direct LangGraph execution.
    """
    # Load conversation history
    history = load_conversation_history(
        db=db,
        customer_id=request.customer_id,
        agent_id=request.agent_id,
        limit=5
    )

    # Add current user message to history
    current_messages = history + [{"role": "user", "content": request.message}]

    # Calculate turn count
    turn_count = len([m for m in current_messages if m["role"] == "user"])

    # Get or create agent graph
    try:
        graph = get_or_create_agent_graph(request.agent_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Build initial state
    initial_state = {
        "messages": current_messages,
        "customer_id": request.customer_id,
        "agent_id": request.agent_id,
        "turn_count": turn_count,
        "conversation_ended": request.conversation_ended,
        # Defaults
        "memory_context": "",
        "excluded_tags": [],
        "rag_context": "",
        "response": "",
        "validation_passed": False,
        "memory_worthy": False,
        "sentiment": "neutral",
        "urgency": "normal",
        "requires_handoff": False,
        "memory_saved": False,
        "save_reason": "",
        # Config
        "optimization_config": asdict(OptimizationConfig()),
    }

    # Execute graph with thread_id for checkpointer
    # Thread ID = agent_id + customer_id (unique per conversation)
    thread_id = f"agent_{request.agent_id}_customer_{request.customer_id}"

    print(f"\n{'='*60}")
    print(f"Executing Agent {request.agent_id} for customer {request.customer_id}")
    print(f"Thread: {thread_id}")
    print(f"Turn: {turn_count}, Message: {request.message[:50]}...")
    print(f"{'='*60}")

    try:
        # Config with thread_id for state persistence
        config = {"configurable": {"thread_id": thread_id}}
        result = graph.invoke(initial_state, config=config)
    except Exception as e:
        print(f"✗ Graph execution error: {e}")
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {e}")

    # Split response if multi-turn enabled
    messages = split_response_from_state(result)

    # Save to database
    conversation_id = save_conversation_to_db(
        db=db,
        agent_id=request.agent_id,
        customer_id=request.customer_id,
        user_message=request.message,
        assistant_messages=messages,
        state=result,
        duration_seconds=0.0  # TODO: Track actual duration
    )

    # Extract state for response - get all tracked fields
    tracked_fields = ["budget_range", "lead_quality", "contact_captured",
                      "catalogue_requested", "competitor_mentioned", "consultation_interest"]
    state_fields = {
        field: result.get(field)
        for field in tracked_fields
        if result.get(field) is not None
    }

    tokens_used = result.get("tokens_used", {})
    print(f"✓ Response: {len(messages)} messages")
    print(f"✓ Memory saved: {result.get('memory_saved', False)} ({result.get('save_reason', 'N/A')})")
    if tokens_used:
        print(f"✓ Tokens: {tokens_used.get('total_tokens', 0)} (prompt: {tokens_used.get('prompt_tokens', 0)}, completion: {tokens_used.get('completion_tokens', 0)})")
    print(f"{'='*60}\n")

    return ChatResponse(
        messages=messages,
        response=" ".join(messages) if messages else "",
        state=state_fields,
        conversation_id=conversation_id,
        memory_saved=result.get("memory_saved", False),
        save_reason=result.get("save_reason", ""),
        tokens_used=tokens_used
    )


@router.post("/agent/{agent_id}/rebuild-graph")
async def rebuild_agent_graph(agent_id: int) -> Any:
    """
    Force rebuild agent graph from database.
    Call when agent config changes.
    """
    clear_agent_graph_cache(agent_id)
    graph = get_or_create_agent_graph(agent_id, force_rebuild=True)

    return {
        "success": True,
        "agent_id": agent_id,
        "message": "Graph rebuilt from database"
    }
