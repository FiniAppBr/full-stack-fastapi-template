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
from app.agent.core.graph import run_turn_with_graph, get_conversation_state
from app.models import AgentLog
from app.agent.core.db_loader import load_agent_config, load_agent_config_by_name
from app.agent.core.config import BaseAgentConfig
from app.agent.core.prompts import build_generation_prompt
from app.agent.core.schema import AgentState
from app.agent.tools.registry.resolver import get_enabled_tools, get_available_tools_summary
from app.agent.tools.registry.definitions import TOOL_METADATA
from app.agent.tools.registry.categories import TOOL_CATEGORIES


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


# =============================================================================
# DEBUG ENDPOINTS
# =============================================================================

def _get_contact_fields(session, raw_config: dict) -> dict:
    """Get contact field names for data collection field IDs."""
    from sqlmodel import select
    from app.models.contact import ContactField

    if not raw_config:
        return {}

    data_collection = raw_config.get("data_collection", {})
    fields = data_collection.get("fields", [])

    if not fields:
        return {}

    field_ids = [f.get("field_id") for f in fields if f.get("field_id")]
    if not field_ids:
        return {}

    contact_fields = session.exec(
        select(ContactField).where(ContactField.id.in_(field_ids))
    ).all()

    return {
        f.id: {"key": f.key, "label": f.label, "field_type": str(f.field_type.value) if f.field_type else "text"}
        for f in contact_fields
    }


@router.get("/debug/agent/{agent_id}")
async def debug_agent(agent_id: int, session: SessionDep) -> Any:
    """
    Get complete debug information for an agent.

    Returns:
    - Full config (parsed from DB)
    - Raw config (for editing)
    - Rendered system prompt (with empty state)
    - Available tools
    - Linked entities with chunk info
    """
    from app.models.entity import Entity
    from app.models.knowledge import KnowledgeBase
    from app.models.neo_agent import NeoAgent
    from sqlmodel import select

    try:
        config = get_agent_config(agent_id=agent_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Get raw NeoAgent for editing
    neo_agent = session.get(NeoAgent, agent_id)
    raw_config = None
    if neo_agent and neo_agent.config:
        if hasattr(neo_agent.config, 'model_dump'):
            raw_config = neo_agent.config.model_dump()
        else:
            raw_config = neo_agent.config

    # Get linked entities with their chunk counts
    entities_info = []
    if config.linked_entities:
        entities = session.exec(
            select(Entity).where(Entity.id.in_(config.linked_entities))
        ).all()

        for entity in entities:
            # Count chunks for this entity
            chunk_count = session.exec(
                select(KnowledgeBase).where(
                    KnowledgeBase.entity_id == entity.id,
                    KnowledgeBase.is_active == True
                )
            ).all()

            entities_info.append({
                "id": entity.id,
                "name": entity.name,
                "category": entity.category,
                "template": entity.template,
                "capabilities": entity.capabilities or [],
                "chunk_count": len(chunk_count),
                "data_keys": list((entity.data or {}).keys()),
            })

    # Get available tools
    enabled_tools = get_enabled_tools(config.enabled_tool_categories)
    tools_info = []
    for tool_name in enabled_tools:
        meta = TOOL_METADATA.get(tool_name)
        if meta:
            tools_info.append({
                "name": meta.name,
                "category": meta.category,
                "instruction": meta.instruction,
                "trigger_intents": meta.trigger_intents,
                "requires_confirmation": meta.requires_confirmation,
            })

    # Build sample system prompt (turn 0, no RAG chunks)
    sample_state = AgentState(
        agent_id=config.agent_id,
        thread_id="debug-preview",
        turn_count=0,
        history=[]
    )
    sample_prompt = build_generation_prompt(config, sample_state, chunks=[])

    # Build config summary
    config_dict = config.model_dump()

    return {
        "agent_id": config.agent_id,
        "agent_name": config.agent_name,
        "agent_description": config.agent_description,

        # Config sections
        "config": {
            "language": config.language,
            "objectives": [{"id": o.id, "description": o.description, "priority": o.priority} for o in config.objectives],
            "guardrails": {
                "never_say": [{"text": r.text, "trigger": r.trigger} for r in config.guardrails.never_say],
                "never_do": [{"text": r.text, "trigger": r.trigger} for r in config.guardrails.never_do],
                "always_do": [{"text": r.text, "trigger": r.trigger} for r in config.guardrails.always_do],
            },
            "escalation_triggers": [{"condition": e.condition, "message": e.message} for e in config.escalation_triggers],
            "generation": config_dict["generation"],
            "rag": config_dict["rag"],
            "multi_message": config_dict["multi_message"],
            "enabled_tool_categories": config.enabled_tool_categories,
        },

        # Tools
        "tools": {
            "categories": config.enabled_tool_categories,
            "available": tools_info,
            "summary": get_available_tools_summary(config.enabled_tool_categories),
        },

        # Entities
        "entities": entities_info,

        # Sample prompt (turn 0)
        "sample_prompt": sample_prompt,

        # Raw config for editing
        "raw_config": raw_config,

        # Linked entity IDs
        "linked_entities": config.linked_entities,

        # Contact field names for data collection display
        "contact_fields": _get_contact_fields(session, raw_config),

        # Tool categories reference
        "tool_categories_reference": {
            cat_id: {
                "name": cat_info["name"],
                "description": cat_info.get("description", ""),
                "always_enabled": cat_info.get("always_enabled", False),
            }
            for cat_id, cat_info in TOOL_CATEGORIES.items()
        },
    }


@router.post("/debug/chat")
async def debug_chat(request: ChatRequest, session: SessionDep) -> Any:
    """
    Send a message with full debug trace.

    Returns everything the normal chat endpoint returns, plus:
    - Full pipeline trace with timing per node
    - System prompt used
    - RAG chunks with scores
    - Tool calls with args and results
    - Validation results
    """
    start_time = time.time()

    try:
        config = get_agent_config(agent_id=request.agent_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

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
        contact_id=request.contact_id
    )

    latency_ms = int((time.time() - start_time) * 1000)

    # Extract debug info (don't pop, keep it)
    debug = result.get("_debug", {})

    return {
        # Normal response fields
        "messages": result["messages"],
        "thread_id": thread_id,
        "state": result["state"],
        "escalation": result.get("escalation"),
        "tokens_used": result["tokens_used"],
        "agent_name": config.agent_name,
        "agent_id": config.agent_id,
        "latency_ms": latency_ms,

        # Debug fields
        "debug": {
            "system_prompt": debug.get("system_prompt", ""),
            "tool_calls": debug.get("tool_calls", []),
            "pipeline_trace": debug.get("pipeline_trace", []),
            "assembled": debug.get("assembled", {}),
            "validation": debug.get("validation", {}),
            "extraction": debug.get("extraction", {}),
        }
    }


def _detect_agent_issues(config, raw_config, entities_data, contact_fields_data) -> list[dict]:
    """Auto-detect common issues with agent configuration."""
    issues = []

    # Check 1: No description
    if not config.agent_description or len(config.agent_description) < 20:
        issues.append({
            "severity": "high",
            "issue": "Missing or short agent description",
            "detail": f"Description is only {len(config.agent_description or '')} chars. This is the main personality instruction.",
            "fix": "Edit neo_agents.description in DB or via debug UI",
            "file": "app/agent/core/prompts.py:20 (GENERATION_SYSTEM_TEMPLATE uses {agent_description})"
        })

    # Check 2: No guardrails from entities
    guardrail_entities = [e for e in entities_data if e.get("category") == "guardrails"]
    if len(guardrail_entities) == 0:
        issues.append({
            "severity": "medium",
            "issue": "No guardrail entities linked",
            "detail": "Guardrails come from entities with category='guardrails', not from config.guardrails",
            "fix": "Create entities with category='guardrails' and template='never_say'/'never_do'/'always_do', then link to agent",
            "file": "app/agent/core/db_loader.py:149-160 (builds guardrails from entities)"
        })

    # Check 3: Data collection fields without hints
    dc_fields = raw_config.get("data_collection", {}).get("fields", []) if raw_config else []
    missing_hints = [f for f in dc_fields if not f.get("collection_hint")]
    if missing_hints:
        issues.append({
            "severity": "medium",
            "issue": f"{len(missing_hints)} data collection fields without collection_hint",
            "detail": f"Fields without hints: {[f.get('field_id') for f in missing_hints]}",
            "fix": "Add collection_hint to each field in config.data_collection.fields",
            "file": "app/models/neo_agent.py:56 (DataCollectionField schema)"
        })

    # Check 4: No objectives
    if len(config.objectives) == 0:
        issues.append({
            "severity": "low",
            "issue": "No objectives defined",
            "detail": "Agent has no conversation goals set",
            "fix": "Add objectives in config.funnel.objectives",
            "file": "app/agent/core/db_loader.py:126-134 (builds objectives from funnel config)"
        })

    # Check 5: No linked entities
    if len(entities_data) == 0:
        issues.append({
            "severity": "medium",
            "issue": "No entities linked",
            "detail": "Agent has no knowledge base - RAG will return nothing",
            "fix": "Link entities via neo_agents.linked_entities array",
            "file": "app/agent/core/pipeline/assemble.py (uses linked_entities for RAG)"
        })

    # Check 6: Too many objectives (prompt bloat)
    if len(config.objectives) > 5:
        issues.append({
            "severity": "low",
            "issue": f"Many objectives ({len(config.objectives)})",
            "detail": "Too many objectives can confuse the LLM",
            "fix": "Consider reducing or prioritizing objectives",
            "file": "app/agent/core/prompts.py:115-120 (objectives section)"
        })

    # Check 7: High temperature for sales agent
    if config.generation.temperature > 0.8:
        issues.append({
            "severity": "low",
            "issue": f"High temperature ({config.generation.temperature})",
            "detail": "High temperature = more random responses. For sales, 0.5-0.7 is usually better.",
            "fix": "Lower config.models.generation.temperature",
            "file": "app/agent/core/config.py:GenerationConfig"
        })

    # Check 8: Response length too short
    if config.multi_message.max_response_length < 100:
        issues.append({
            "severity": "low",
            "issue": f"Very short max response ({config.multi_message.max_response_length} chars)",
            "detail": "May truncate responses unnaturally",
            "fix": "Increase config.personality.max_response_length",
            "file": "app/agent/core/config.py:MultiMessageConfig"
        })

    return issues


@router.get("/debug/export/{agent_id}")
async def export_agent_debug(agent_id: int, session: SessionDep, full: bool = False) -> Any:
    """
    Export agent debug data to JSON file.

    Query params:
    - full=false (default): Slim export - config, entity metadata, issues (no chunk content)
    - full=true: Full export - includes all chunk content

    Saves to: /opt/connectai/exports/agent_{id}_{timestamp}.json
    """
    from sqlmodel import select
    from pathlib import Path
    from app.models.entity import Entity
    from app.models.knowledge import KnowledgeBase
    from app.models.neo_agent import NeoAgent
    from app.models.contact import ContactField
    from app.agent.core.schema import AgentState

    try:
        config = get_agent_config(agent_id=agent_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Get raw NeoAgent
    neo_agent = session.get(NeoAgent, agent_id)
    raw_config = None
    if neo_agent and neo_agent.config:
        if hasattr(neo_agent.config, 'model_dump'):
            raw_config = neo_agent.config.model_dump()
        else:
            raw_config = neo_agent.config

    # Build sample prompt
    sample_state = AgentState(
        agent_id=config.agent_id,
        thread_id="export-preview",
        turn_count=0,
        history=[]
    )
    sample_prompt = build_generation_prompt(config, sample_state, chunks=[])

    # Get linked entities with full content
    entities_data = []
    if config.linked_entities:
        entities = session.exec(
            select(Entity).where(Entity.id.in_(config.linked_entities))
        ).all()

        for entity in entities:
            # Get chunks for this entity
            chunks = session.exec(
                select(KnowledgeBase).where(
                    KnowledgeBase.entity_id == entity.id,
                    KnowledgeBase.is_active == True
                )
            ).all()

            entity_export = {
                "id": entity.id,
                "name": entity.name,
                "category": entity.category,
                "template": entity.template,
                "description": entity.description,
                "data": entity.data,
                "capabilities": entity.capabilities or [],
                "chunk_count": len(chunks),
                "total_tokens": sum(c.token_count or 0 for c in chunks),
                "_refs": {
                    "model": "app/models/entity.py:72 (Entity)",
                    "db_table": "entities",
                    "chunking": "app/api/routes/entities/__init__.py"
                }
            }

            if full:
                # Full mode: include all chunk content
                entity_export["chunks"] = [
                    {"id": c.id, "title": c.title, "content": c.content, "token_count": c.token_count}
                    for c in chunks
                ]
            elif entity.category != "documents":
                # Slim mode: include chunk summaries for non-document entities
                entity_export["chunks_summary"] = [
                    {"id": c.id, "title": c.title, "token_count": c.token_count}
                    for c in chunks
                ]
            # Documents in slim mode: just show chunk_count and total_tokens (already added above)

            entities_data.append(entity_export)

    # Get contact fields used in data collection
    contact_fields_data = []
    data_collection_fields = raw_config.get("data_collection", {}).get("fields", []) if raw_config else []
    field_ids = [f.get("field_id") for f in data_collection_fields if f.get("field_id")]

    if field_ids:
        contact_fields = session.exec(
            select(ContactField).where(ContactField.id.in_(field_ids))
        ).all()

        for cf in contact_fields:
            dc_config = next((f for f in data_collection_fields if f.get("field_id") == cf.id), {})
            contact_fields_data.append({
                "id": cf.id,
                "key": cf.key,
                "label": cf.label,
                "field_type": str(cf.field_type.value) if cf.field_type else "text",
                "necessity": dc_config.get("necessity", "optional"),
                "collection_hint": dc_config.get("collection_hint", ""),
                "_refs": {
                    "model": "app/models/contact.py:ContactField",
                    "db_table": "contact_fields",
                    "data_collection_config": "app/models/neo_agent.py:56 (DataCollectionField)"
                }
            })

    # Get recent conversation logs
    recent_conversations = []
    logs_dir = Path(f"/opt/connectai/logs/nina/{config.agent_name.lower()}")
    if logs_dir.exists():
        log_files = sorted(logs_dir.glob("*.jsonl"), key=lambda x: x.stat().st_mtime, reverse=True)[:5]
        for log_file in log_files:
            try:
                turns = []
                with open(log_file, "r") as f:
                    for line in f:
                        if line.strip():
                            turn_data = json.loads(line)
                            turns.append({
                                "timestamp": turn_data.get("timestamp"),
                                "user": turn_data.get("input"),
                                "assistant": turn_data.get("output"),
                                "tokens": turn_data.get("tokens_used"),
                                "tool_calls": turn_data.get("tool_calls", []),
                            })
                if turns:
                    recent_conversations.append({
                        "thread_id": log_file.stem,
                        "turns": turns[-10:]  # Last 10 turns max
                    })
            except Exception as e:
                logger.warning(f"Failed to read log {log_file}: {e}")

    # Build export
    export_data = {
        "export_version": "1.0",
        "exported_at": datetime.utcnow().isoformat() + "Z",

        "agent": {
            "id": agent_id,
            "name": config.agent_name,
            "description": config.agent_description,
            "language": config.language,
            "raw_config": raw_config,
            "rendered_prompt": sample_prompt,
            "enabled_tool_categories": config.enabled_tool_categories,
            "linked_entity_ids": config.linked_entities,
            "_refs": {
                "config_schema": "app/models/neo_agent.py:103 (NeoAgentConfigSchema)",
                "db_table": "neo_agents",
                "db_loader": "app/agent/core/db_loader.py:28 (load_agent_config)",
                "config_class": "app/agent/core/config.py:71 (BaseAgentConfig)",
                "prompt_builder": "app/agent/core/prompts.py:104 (build_generation_prompt)"
            }
        },

        "entities": entities_data,

        "contact_fields": contact_fields_data,

        "recent_conversations": recent_conversations[:3],  # Max 3 conversations

        "_architecture": {
            "pipeline": "app/agent/core/graph.py",
            "pipeline_nodes": [
                "preprocess (line 160)",
                "assemble (line 194)",
                "agent (line 332)",
                "tools (line 391)",
                "extract_data (line 500)",
                "generate (line 573)",
                "validate (line 706)",
                "post_process (line 841)"
            ],
            "tools_registry": "app/agent/tools/registry/",
            "tool_definitions": "app/agent/tools/registry/definitions.py",
            "api_endpoint": "app/api/routes/chat.py",
            "prompts": "app/agent/core/prompts.py",
            "schema_types": "app/agent/core/schema.py"
        },

        "_detected_issues": _detect_agent_issues(config, raw_config, entities_data, contact_fields_data),

        "_common_issues": {
            "guardrails_not_working": "Check if guardrails are in entities (category='guardrails') or config.guardrails - they come from ENTITIES not config",
            "prompt_too_long": "Check config.multi_message.max_response_length and objectives count",
            "wrong_tool_called": "Check tool trigger_intents in app/agent/tools/registry/definitions.py",
            "data_not_collected": "Check data_collection.fields has collection_hint set",
            "greeting_on_turn_2": "validate_node checks turn_count > 1 for greetings"
        }
    }

    # Save to file
    exports_dir = Path("/opt/connectai/exports")
    exports_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    mode = "full" if full else "slim"
    export_file = exports_dir / f"agent_{agent_id}_{mode}_{timestamp}.json"

    with open(export_file, "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=2, ensure_ascii=False)

    logger.info(f"Exported agent {agent_id} to {export_file}")

    return {
        "success": True,
        "file_path": str(export_file),
        "data": export_data
    }
