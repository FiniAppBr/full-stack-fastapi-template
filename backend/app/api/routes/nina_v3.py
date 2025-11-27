"""
Nina v3 API endpoints.

Context-driven architecture with LangGraph persistence.
Now supports database-configured agents via NeoAgent system.
"""

import json
import logging
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Optional, Any

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from sqlmodel import Session
import time

from app.api.deps import SessionDep
from app.agent.v3.graph import run_turn_with_graph, get_conversation_state
from app.models import AgentLog
from app.agent.v3.db_loader import load_agent_config, load_agent_config_by_name
from app.agent.v3.config import BaseAgentConfig


logger = logging.getLogger(__name__)
router = APIRouter()

# Logging setup
LOGS_DIR = Path("/opt/connectai/logs/nina")
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# Config cache (clear on agent update)
_config_cache: dict[str, tuple[datetime, BaseAgentConfig]] = {}
CACHE_TTL_SECONDS = 60  # Reload config every 60 seconds


def get_agent_config(agent_id: Optional[int] = None, agent_name: str = "Nina") -> BaseAgentConfig:
    """
    Load agent config from database with caching.

    Priority:
    1. By agent_id if provided
    2. By agent_name (default: "Nina")
    """
    cache_key = f"id:{agent_id}" if agent_id else f"name:{agent_name}"

    # Check cache
    if cache_key in _config_cache:
        cached_time, config = _config_cache[cache_key]
        if (datetime.utcnow() - cached_time).total_seconds() < CACHE_TTL_SECONDS:
            return config

    # Load from database
    if agent_id:
        config = load_agent_config(agent_id)
    else:
        config = load_agent_config_by_name(agent_name)

    if config:
        _config_cache[cache_key] = (datetime.utcnow(), config)
        logger.info(f"Loaded agent config from database: {config.agent_name} (id={config.agent_id})")
        return config

    raise ValueError(f"Agent not found: {agent_id or agent_name}. Create it via Neo Agents UI.")


def clear_config_cache():
    """Clear the config cache (call after agent updates)."""
    global _config_cache
    _config_cache = {}


def log_turn(thread_id: str, agent_name: str, turn_data: dict):
    """Append turn data as JSON line to thread log file (legacy file logging)."""
    # Create agent-specific log directory
    agent_logs_dir = LOGS_DIR / agent_name.lower()
    agent_logs_dir.mkdir(parents=True, exist_ok=True)

    log_file = agent_logs_dir / f"{thread_id}.jsonl"
    turn_data["timestamp"] = datetime.now().isoformat()
    turn_data["agent"] = agent_name
    with open(log_file, "a") as f:
        f.write(json.dumps(turn_data, ensure_ascii=False) + "\n")


def log_to_database(
    session: Session,
    thread_id: str,
    agent_id: int,
    turn_number: int,
    user_message: str,
    agent_response: str,
    debug: dict,
    tokens_used: int,
    latency_ms: int,
    model_used: str = "gpt-4o-mini"
):
    """Log conversation turn to database for analytics (v3 simplified)."""
    assembled = debug.get("assembled", {})
    chunks = assembled.get("chunks", [])

    # Calculate cost (gpt-4o-mini pricing: $0.15/1M input, $0.60/1M output)
    estimated_cost = (tokens_used * 0.375) / 1_000_000

    log_entry = AgentLog(
        thread_id=thread_id,
        agent_id=agent_id,
        turn_number=turn_number,
        user_message=user_message,
        agent_response=agent_response,
        chunks_used=len(chunks),
        chunk_ids=[c.get("id") for c in chunks if c.get("id")],
        total_tokens=tokens_used,
        estimated_cost_usd=estimated_cost,
        model_used=model_used,
        latency_ms=latency_ms
    )
    session.add(log_entry)
    session.commit()


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    message: str
    thread_id: Optional[str] = None  # If None, creates new thread
    agent_id: Optional[int] = None  # NeoAgent database ID (optional)
    contact_id: Optional[int] = None  # Contact ID for data sync (None for preview)


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""
    messages: list[dict]  # [{content, typing_delay_ms, pause_after_ms}]
    thread_id: str
    state: dict
    escalation: Optional[dict] = None
    tokens_used: int
    agent_name: str
    agent_id: str


class StateResponse(BaseModel):
    """Response model for state endpoint."""
    thread_id: str
    state: Optional[dict]


class ConfigResponse(BaseModel):
    """Response model for config endpoint."""
    agent_id: str
    agent_name: str
    language: str
    source: str  # "database" or "python"
    traits: int
    intents: int
    objection_types: int
    objectives: int
    events: int
    examples: int
    guardrails: dict
    escalation_triggers: int
    models: dict


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, session: SessionDep):
    """
    Send a message to an agent.

    Uses LangGraph with PostgresSaver for state persistence.
    Conversations can be resumed using the same thread_id.

    Optionally specify agent_id to use a specific NeoAgent configuration.
    Defaults to Nina if not specified.
    """
    start_time = time.time()
    try:
        # Load agent config
        config = get_agent_config(agent_id=request.agent_id)

        # Generate thread_id if not provided
        thread_id = request.thread_id
        if not thread_id:
            import uuid
            agent_prefix = config.agent_name.lower()
            thread_id = f"{agent_prefix}_{uuid.uuid4().hex[:16]}"

        # Run turn with persistence
        result = run_turn_with_graph(
            config=config,
            thread_id=thread_id,
            message=request.message,
            contact_id=request.contact_id  # None for preview, syncs to Contact.data if set
        )

        latency_ms = int((time.time() - start_time) * 1000)

        # Extract debug info for logging
        debug = result.pop("_debug", {})

        # Log turn (v3 simplified schema)
        log_turn(thread_id, config.agent_name, {
            "turn": result["state"]["turn_count"],
            "input": request.message,
            "output": {
                "messages": [m["content"] for m in result["messages"]],
                "escalation": result.get("escalation")
            },
            "tokens": {
                "total": result["tokens_used"],
                "in": result.get("tokens_in", 0),
                "out": result.get("tokens_out", 0)
            },
            "tool_calls": debug.get("tool_calls", []),
            "system_prompt": debug.get("system_prompt", "")
        })

        # Log to database for analytics
        if config.agent_id:
            try:
                log_to_database(
                    session=session,
                    thread_id=thread_id,
                    agent_id=config.agent_id,
                    turn_number=result["state"]["turn_count"],
                    user_message=request.message,
                    agent_response=" ".join([m["content"] for m in result["messages"]]),
                    debug=debug,
                    tokens_used=result["tokens_used"],
                    latency_ms=latency_ms
                )
            except Exception as db_err:
                logger.warning(f"Failed to log to database: {db_err}")

        return ChatResponse(
            messages=result["messages"],
            thread_id=thread_id,
            state=result["state"],
            escalation=result.get("escalation"),
            tokens_used=result["tokens_used"],
            agent_name=config.agent_name,
            agent_id=config.agent_id
        )

    except Exception as e:
        logger.exception("Chat error")
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


@router.get("/config")
async def get_config(agent_id: Optional[int] = Query(None, description="NeoAgent database ID")) -> ConfigResponse:
    """
    Get the current agent configuration.

    Shows which config source is being used (database vs Python fallback).
    """
    config = get_agent_config(agent_id=agent_id)

    # Determine source
    source = "database" if config.agent_id.isdigit() else "python"

    return ConfigResponse(
        agent_id=config.agent_id,
        agent_name=config.agent_name,
        language=config.language,
        source=source,
        traits=len(config.traits),
        intents=len(config.intents),
        objection_types=len(config.objection_types),
        objectives=len(config.objectives),
        events=len(config.events),
        examples=len(config.examples),
        guardrails={
            "never_say": len(config.guardrails.never_say),
            "never_do": len(config.guardrails.never_do),
            "always_do": len(config.guardrails.always_do),
            "conditional": len(config.guardrails.conditional)
        },
        escalation_triggers=len(config.escalation_triggers),
        models={
            "extraction": config.extraction.model,
            "generation": config.generation.model
        }
    )


@router.post("/cache/clear")
async def clear_cache():
    """Clear the agent config cache (useful after updating agent in database)."""
    clear_config_cache()
    return {"status": "ok", "message": "Config cache cleared"}


@router.get("/health")
async def health(agent_id: Optional[int] = Query(None)):
    """Health check for v3."""
    config = get_agent_config(agent_id=agent_id)
    source = "database" if config.agent_id.isdigit() else "python"

    return {
        "status": "ok",
        "version": "v3",
        "agent": config.agent_name,
        "agent_id": config.agent_id,
        "config_source": source,
        "architecture": "context-driven with LangGraph persistence"
    }


@router.get("/logs/{thread_id}")
async def get_logs(thread_id: str, agent: str = "nina") -> Any:
    """Get all logged turns for a thread."""
    # Check both old and new log locations
    log_file = LOGS_DIR / agent.lower() / f"{thread_id}.jsonl"
    if not log_file.exists():
        # Try old location for backwards compatibility
        log_file = LOGS_DIR / f"{thread_id}.jsonl"

    if not log_file.exists():
        raise HTTPException(status_code=404, detail=f"No logs for thread: {thread_id}")

    turns = []
    with open(log_file) as f:
        for line in f:
            if line.strip():
                turns.append(json.loads(line))
    return {"thread_id": thread_id, "agent": agent, "turns": turns}


@router.get("/logs")
async def list_logs(agent: Optional[str] = None) -> Any:
    """List all available log files, optionally filtered by agent."""
    logs = []

    # Search in agent subdirectories
    if agent:
        search_dirs = [LOGS_DIR / agent.lower()]
    else:
        search_dirs = [d for d in LOGS_DIR.iterdir() if d.is_dir()]
        # Also include root for backwards compatibility
        search_dirs.append(LOGS_DIR)

    for search_dir in search_dirs:
        if not search_dir.exists():
            continue
        for f in search_dir.glob("*.jsonl"):
            stat = f.stat()
            agent_name = f.parent.name if f.parent != LOGS_DIR else "nina"
            logs.append({
                "thread_id": f.stem,
                "agent": agent_name,
                "size_kb": round(stat.st_size / 1024, 1),
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            })

    return {"logs": sorted(logs, key=lambda x: x["modified"], reverse=True)}
