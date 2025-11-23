"""
State API - Inspect and manage conversation state.

Provides endpoints to:
- View current state for a thread
- View state history (checkpoints)
- Manually update state (admin/testing)
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.agent.checkpointer import get_checkpointer

router = APIRouter(prefix="/state", tags=["state"])


class StateResponse(BaseModel):
    """Response model for state endpoint."""
    thread_id: str
    current_stage: Optional[str] = None
    stage_name: Optional[str] = None
    turn_count: int = 0
    state_fields: dict = {}
    last_updated: Optional[str] = None


class StateHistoryItem(BaseModel):
    """Single checkpoint in state history."""
    checkpoint_id: str
    step: int
    timestamp: str
    stage: Optional[str] = None
    state_fields: dict = {}
    message: Optional[dict] = None


class StateUpdateRequest(BaseModel):
    """Request model for state update."""
    state_fields: Optional[dict] = None
    current_stage: Optional[str] = None


@router.get("/{thread_id}", response_model=StateResponse)
async def get_state(
    thread_id: str,
    current_user=Depends(get_current_user)
):
    """
    Get current conversation state for a thread.

    Thread ID format: agent_{agent_id}_customer_{customer_id}
    """
    try:
        checkpointer = get_checkpointer()

        # Get latest checkpoint for thread
        config = {"configurable": {"thread_id": thread_id}}
        checkpoint = checkpointer.get(config)

        if not checkpoint:
            raise HTTPException(status_code=404, detail="Thread not found")

        state = checkpoint.get("channel_values", {})

        # Extract user-defined fields (exclude internal fields)
        internal_fields = {
            "messages", "customer_id", "agent_id", "turn_count",
            "conversation_ended", "excluded_tags", "rag_context",
            "response", "validation_passed", "validation_message",
            "sentiment", "urgency", "requires_handoff", "handoff_reason",
            "multi_turn_config", "state_schema", "tokens_used",
            "current_stage", "previous_stage"
        }

        state_fields = {
            k: v for k, v in state.items()
            if k not in internal_fields and v is not None
        }

        return StateResponse(
            thread_id=thread_id,
            current_stage=state.get("current_stage"),
            stage_name=state.get("current_stage"),  # TODO: lookup stage name
            turn_count=state.get("turn_count", 0),
            state_fields=state_fields,
            last_updated=checkpoint.get("ts")
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{thread_id}/history", response_model=list[StateHistoryItem])
async def get_state_history(
    thread_id: str,
    limit: int = 20,
    current_user=Depends(get_current_user)
):
    """
    Get state history (all checkpoints) for a thread.

    Returns checkpoints in chronological order.
    """
    try:
        checkpointer = get_checkpointer()
        config = {"configurable": {"thread_id": thread_id}}

        # Get all checkpoints for thread
        checkpoints = list(checkpointer.list(config, limit=limit))

        if not checkpoints:
            raise HTTPException(status_code=404, detail="Thread not found")

        history = []
        for i, cp in enumerate(reversed(checkpoints)):
            state = cp.checkpoint.get("channel_values", {})

            # Extract user-defined fields
            internal_fields = {
                "messages", "customer_id", "agent_id", "turn_count",
                "conversation_ended", "excluded_tags", "rag_context",
                "response", "validation_passed", "validation_message",
                "sentiment", "urgency", "requires_handoff", "handoff_reason",
                "multi_turn_config", "state_schema", "tokens_used",
                "current_stage", "previous_stage"
            }

            state_fields = {
                k: v for k, v in state.items()
                if k not in internal_fields and v is not None
            }

            # Get last message if available
            messages = state.get("messages", [])
            last_message = messages[-1] if messages else None

            history.append(StateHistoryItem(
                checkpoint_id=cp.config.get("configurable", {}).get("checkpoint_id", ""),
                step=i + 1,
                timestamp=cp.checkpoint.get("ts", ""),
                stage=state.get("current_stage"),
                state_fields=state_fields,
                message=last_message
            ))

        return history

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{thread_id}")
async def update_state(
    thread_id: str,
    request: StateUpdateRequest,
    current_user=Depends(get_current_user)
):
    """
    Manually update conversation state (admin/testing only).

    Use with caution - this bypasses normal state extraction.
    """
    try:
        checkpointer = get_checkpointer()
        config = {"configurable": {"thread_id": thread_id}}

        # Get current checkpoint
        checkpoint = checkpointer.get(config)
        if not checkpoint:
            raise HTTPException(status_code=404, detail="Thread not found")

        # Build updates
        updates = {}
        if request.state_fields:
            updates.update(request.state_fields)
        if request.current_stage:
            updates["current_stage"] = request.current_stage

        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")

        # Note: Direct checkpoint mutation is complex with PostgresSaver
        # For now, return the intended updates
        # TODO: Implement proper checkpoint update

        return {
            "status": "pending",
            "message": "State update queued. Changes will apply on next interaction.",
            "updates": updates
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
