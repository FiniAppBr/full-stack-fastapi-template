"""
Nina v3 API endpoints.

Context-driven architecture with LangGraph persistence.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agent.v3.graph import run_turn_with_graph, get_conversation_state
from app.agent.v3.agents.nina import NINA_CONFIG


router = APIRouter()

# Logging setup
LOGS_DIR = Path("/opt/connectai/logs/nina")
LOGS_DIR.mkdir(parents=True, exist_ok=True)


def log_turn(thread_id: str, turn_data: dict):
    """Append turn data as JSON line to thread log file."""
    log_file = LOGS_DIR / f"{thread_id}.jsonl"
    turn_data["timestamp"] = datetime.now().isoformat()
    with open(log_file, "a") as f:
        f.write(json.dumps(turn_data, ensure_ascii=False) + "\n")


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    message: str
    thread_id: Optional[str] = None  # If None, creates new thread


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""
    messages: list[dict]  # [{content, typing_delay_ms, pause_after_ms}]
    thread_id: str
    state: dict
    escalation: Optional[dict] = None
    tokens_used: int


class StateResponse(BaseModel):
    """Response model for state endpoint."""
    thread_id: str
    state: Optional[dict]


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Send a message to Nina v3.

    Uses LangGraph with PostgresSaver for state persistence.
    Conversations can be resumed using the same thread_id.
    """
    try:
        # Generate thread_id if not provided
        thread_id = request.thread_id
        if not thread_id:
            import uuid
            thread_id = f"nina_{uuid.uuid4().hex[:16]}"

        # Run turn with persistence
        result = run_turn_with_graph(
            config=NINA_CONFIG,
            thread_id=thread_id,
            message=request.message
        )

        # Extract debug info for logging
        debug = result.pop("_debug", {})

        # Log turn
        log_turn(thread_id, {
            "turn": result["state"]["turn_count"],
            "input": request.message,
            "output": {
                "messages": [m["content"] for m in result["messages"]],
                "escalation": result.get("escalation")
            },
            "extract": {
                "intent": debug.get("extraction", {}).get("intent"),
                "objection_type": debug.get("extraction", {}).get("objection_type"),
                "trait_updates": debug.get("extraction", {}).get("trait_updates", {}),
                "traits_before": debug.get("prev_state", {}).get("traits", {}),
                "traits_after": result["state"]["traits"],
                "events_before": debug.get("prev_state", {}).get("events", {}),
                "events_after": result["state"]["events"],
                "objections_before": debug.get("prev_state", {}).get("objections_raised", []),
                "objections_after": result["state"]["objections_raised"]
            },
            "assemble": {
                "chunks": debug.get("assembled", {}).get("chunks", []),
                "examples_used": debug.get("assembled", {}).get("examples_used", [])
            },
            "tokens_used": result["tokens_used"]
        })

        return ChatResponse(
            messages=result["messages"],
            thread_id=thread_id,
            state=result["state"],
            escalation=result.get("escalation"),
            tokens_used=result["tokens_used"]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/state/{thread_id}", response_model=StateResponse)
async def get_state(thread_id: str):
    """
    Get the current state for a conversation thread.

    Useful for debugging or displaying conversation status.
    """
    try:
        state = get_conversation_state(thread_id)

        return StateResponse(
            thread_id=thread_id,
            state=state
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health():
    """Health check for v3."""
    return {
        "status": "ok",
        "version": "v3",
        "agent": NINA_CONFIG.agent_name,
        "architecture": "context-driven with LangGraph persistence"
    }


@router.get("/logs/{thread_id}")
async def get_logs(thread_id: str) -> Any:
    """Get all logged turns for a thread."""
    log_file = LOGS_DIR / f"{thread_id}.jsonl"
    if not log_file.exists():
        raise HTTPException(status_code=404, detail=f"No logs for thread: {thread_id}")

    turns = []
    with open(log_file) as f:
        for line in f:
            if line.strip():
                turns.append(json.loads(line))
    return {"thread_id": thread_id, "turns": turns}


@router.get("/logs")
async def list_logs() -> Any:
    """List all available log files."""
    logs = []
    for f in LOGS_DIR.glob("*.jsonl"):
        stat = f.stat()
        logs.append({
            "thread_id": f.stem,
            "size_kb": round(stat.st_size / 1024, 1),
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        })
    return {"logs": sorted(logs, key=lambda x: x["modified"], reverse=True)}
