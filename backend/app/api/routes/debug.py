"""
Debug API - Inspect chunks and agent configurations.
"""

from typing import Any, Optional
from fastapi import APIRouter, Query
from sqlmodel import Session, select, col

from app.core.db import engine
from app.models import KnowledgeBase

router = APIRouter()


@router.get("/chunks")
async def list_chunks(
    agent_id: str = Query(default="nina", description="Agent ID"),
    label: Optional[str] = Query(default=None, description="Filter by label (partial match)"),
    search: Optional[str] = Query(default=None, description="Search in title/content"),
    limit: int = Query(default=50, le=200),
) -> Any:
    """List knowledge chunks with optional filters."""
    with Session(engine) as session:
        query = select(KnowledgeBase).where(
            KnowledgeBase.agent_id == agent_id,
            KnowledgeBase.is_active == True
        )

        results = session.exec(query).all()

        # Filter in Python (for label array and text search)
        chunks = []
        for chunk in results:
            # Label filter
            if label and chunk.labels:
                if not any(label.lower() in l.lower() for l in chunk.labels):
                    continue

            # Text search
            if search:
                search_lower = search.lower()
                title_match = chunk.title and search_lower in chunk.title.lower()
                content_match = search_lower in chunk.content.lower()
                if not (title_match or content_match):
                    continue

            chunks.append({
                "id": chunk.id,
                "title": chunk.title,
                "labels": chunk.labels or [],
                "content": chunk.content[:300] + "..." if len(chunk.content) > 300 else chunk.content,
                "token_count": chunk.token_count,
                "category": chunk.category,
            })

            if len(chunks) >= limit:
                break

        return {
            "agent_id": agent_id,
            "count": len(chunks),
            "filters": {"label": label, "search": search},
            "chunks": chunks
        }


@router.get("/chunks/{chunk_id}")
async def get_chunk(chunk_id: int) -> Any:
    """Get full chunk details."""
    with Session(engine) as session:
        chunk = session.get(KnowledgeBase, chunk_id)
        if not chunk:
            return {"error": "Chunk not found"}

        return {
            "id": chunk.id,
            "title": chunk.title,
            "labels": chunk.labels or [],
            "content": chunk.content,
            "token_count": chunk.token_count,
            "category": chunk.category,
            "agent_id": chunk.agent_id,
            "is_active": chunk.is_active,
        }


@router.get("/labels")
async def list_labels(agent_id: str = Query(default="nina")) -> Any:
    """List all unique labels for an agent."""
    with Session(engine) as session:
        results = session.exec(
            select(KnowledgeBase.labels).where(
                KnowledgeBase.agent_id == agent_id,
                KnowledgeBase.is_active == True
            )
        ).all()

        # Flatten and count
        label_counts = {}
        for labels in results:
            if labels:
                for label in labels:
                    label_counts[label] = label_counts.get(label, 0) + 1

        # Sort by count
        sorted_labels = sorted(label_counts.items(), key=lambda x: -x[1])

        return {
            "agent_id": agent_id,
            "labels": [{"label": l, "count": c} for l, c in sorted_labels]
        }


@router.get("/config/{agent_name}")
async def get_config(agent_name: str) -> Any:
    """Get agent configuration (rules, modes, signals, etc.)."""
    # Import dynamically based on agent name
    if agent_name == "nina":
        from app.agent.configs.nina_v2 import (
            MODES, GATES, SIGNALS, TRAITS, RULES, PERSONALITY, VALIDATION_RULES
        )

        return {
            "agent": agent_name,
            "personality": PERSONALITY,
            "modes": [{"id": m.id, "name": m.name} for m in MODES],
            "gates": [g.id for g in GATES],
            "signals": [{"id": s.id, "type": s.type, "options": s.options if hasattr(s, 'options') else None} for s in SIGNALS],
            "traits": [t.id for t in TRAITS],
            "rules": [
                {
                    "id": r.id,
                    "name": r.name,
                    "priority": r.priority,
                    "conditions": {
                        "operator": r.conditions.operator,
                        "clauses": [{"field": c.field, "op": c.op, "value": c.value} for c in r.conditions.clauses]
                    },
                    "action": r.assembly_action,
                    "mode_shift": r.mode_shift,
                }
                for r in RULES
            ],
            "validation_rules": VALIDATION_RULES,
        }
    else:
        return {"error": f"Unknown agent: {agent_name}"}
