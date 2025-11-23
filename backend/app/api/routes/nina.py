"""
Nina Debug Chat API - Context System v2
Returns full pipeline state for debugging.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agent.graph_v2 import get_v2_graph
from app.agent.schema import RuntimeState
from app.agent.pipeline.typing import add_typing_times

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


class NinaChatRequest(BaseModel):
    """Chat request for Nina debug."""
    message: str
    thread_id: str = "debug-session"


class MessageInfo(BaseModel):
    """Message with typing time for natural display."""
    text: str
    typing_time: float  # Seconds to simulate typing


class ChunkInfo(BaseModel):
    """Chunk info for debug display."""
    id: int
    title: Optional[str]
    labels: list[str]
    content: str
    score: float
    source_rule: Optional[str]
    token_count: int


class StateDelta(BaseModel):
    """What changed this turn - for inline display."""
    mode_changed: Optional[str] = None  # New mode if changed
    gates_activated: list[str] = []     # Gates that became True
    traits_updated: dict[str, str] = {} # Traits that were set/changed
    signals: dict[str, Optional[str]] = {}  # Current turn signals
    rules_fired: list[str] = []         # Rules that fired


class NinaChatResponse(BaseModel):
    """Chat response with full state for debugging."""
    # Response
    response: str
    messages: list[MessageInfo]  # Messages with typing times

    # Runtime state (2x2 model)
    mode: str
    gates: dict[str, bool]
    traits: dict[str, Optional[str]]
    signals: dict[str, Optional[str]]
    turn_count: int

    # Assembly info
    chunks: list[ChunkInfo]
    rules_fired: list[str]
    total_chunk_tokens: int

    # Delta - what changed this turn
    delta: StateDelta

    # Token usage
    tokens_used: dict


@router.post("/chat", response_model=NinaChatResponse)
async def nina_chat(request: NinaChatRequest) -> Any:
    """
    Chat with Nina v2 and return full pipeline state for debugging.
    """
    print(f"\n{'='*60}")
    print(f"Nina Debug Chat")
    print(f"Thread: {request.thread_id}")
    print(f"Message: {request.message[:50]}...")
    print(f"{'='*60}")

    # Get v2 graph
    try:
        graph = get_v2_graph("nina")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load graph: {e}")

    # Execute with thread_id for state persistence
    config = {"configurable": {"thread_id": request.thread_id}}

    # Get previous state for delta calculation
    prev_runtime = RuntimeState()
    try:
        prev_state = graph.get_state(config)
        if prev_state and prev_state.values:
            prev_runtime_dict = prev_state.values.get("runtime", {})
            if prev_runtime_dict:
                prev_runtime = RuntimeState(**prev_runtime_dict)
    except Exception:
        pass  # First message, no previous state

    # Only pass new message - checkpointer will provide persisted state
    # add_messages reducer will merge the new message with history
    initial_state = {
        "messages": [{"role": "user", "content": request.message}],
        "agent_config_name": "nina",
    }

    try:
        result = graph.invoke(initial_state, config=config)
    except Exception as e:
        print(f"Graph execution error: {e}")
        raise HTTPException(status_code=500, detail=f"Execution failed: {e}")

    # Extract runtime state
    runtime_dict = result.get("runtime", {})
    runtime = RuntimeState(**runtime_dict) if runtime_dict else RuntimeState()

    # Extract chunks info
    chunks_data = result.get("context_chunks", [])
    chunks_info = []
    total_chunk_tokens = 0
    rules_fired = set()

    for cd in chunks_data:
        chunk = cd.get("chunk", {})
        token_count = chunk.get("token_count", 0)
        total_chunk_tokens += token_count

        source_rule = cd.get("source_rule")
        if source_rule:
            rules_fired.add(source_rule)

        chunks_info.append(ChunkInfo(
            id=chunk.get("id", 0),
            title=chunk.get("title"),
            labels=chunk.get("labels", []),
            content=chunk.get("content", "")[:200] + "..." if len(chunk.get("content", "")) > 200 else chunk.get("content", ""),
            score=cd.get("score", 0),
            source_rule=source_rule,
            token_count=token_count
        ))

    # Get response and add typing times
    response = result.get("response", "")
    response_messages_raw = result.get("response_messages", [response] if response else [])

    # Add typing times to messages
    messages_with_typing = add_typing_times(response_messages_raw)

    print(f"Response: {response[:100]}...")
    print(f"Mode: {runtime.mode}")
    print(f"Chunks: {len(chunks_info)}, Tokens: {total_chunk_tokens}")
    print(f"{'='*60}\n")

    # Calculate delta - what changed this turn
    mode_changed = runtime.mode if runtime.mode != prev_runtime.mode else None
    gates_activated = [
        k for k, v in runtime.gates.items()
        if v and not prev_runtime.gates.get(k, False)
    ]
    traits_updated = {
        k: v for k, v in runtime.traits.items()
        if v and v != prev_runtime.traits.get(k)
    }

    delta = StateDelta(
        mode_changed=mode_changed,
        gates_activated=gates_activated,
        traits_updated=traits_updated,
        signals=runtime.signals,
        rules_fired=list(rules_fired)
    )

    # Log full turn data
    log_turn(request.thread_id, {
        "turn": runtime.turn_count,
        "input": request.message,
        "output": {
            "response": response,
            "messages": [m.text for m in messages_with_typing],
        },
        "extract": {
            "signals": runtime.signals,
            "gates_before": dict(prev_runtime.gates),
            "gates_after": dict(runtime.gates),
            "traits_before": dict(prev_runtime.traits),
            "traits_after": dict(runtime.traits),
        },
        "assemble": {
            "rules_fired": list(rules_fired),
            "chunks": [{"title": c.title, "labels": c.labels, "score": c.score, "source_rule": c.source_rule} for c in chunks_info],
            "total_tokens": total_chunk_tokens,
        },
        "mode": {
            "before": prev_runtime.mode,
            "after": runtime.mode,
        },
    })

    return NinaChatResponse(
        response=response,
        messages=[MessageInfo(text=m.text, typing_time=m.typing_time) for m in messages_with_typing],
        mode=runtime.mode,
        gates=runtime.gates,
        traits=runtime.traits,
        signals=runtime.signals,
        turn_count=runtime.turn_count,
        chunks=chunks_info,
        rules_fired=list(rules_fired),
        total_chunk_tokens=total_chunk_tokens,
        delta=delta,
        tokens_used={}  # TODO: Pass through from generate
    )


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


@router.post("/reset")
async def nina_reset(thread_id: str = "debug-session") -> Any:
    """
    Reset Nina conversation state for a thread.
    """
    # Force rebuild graph to clear any cached state
    get_v2_graph("nina", force_rebuild=True)

    return {
        "success": True,
        "thread_id": thread_id,
        "message": "Session reset"
    }
