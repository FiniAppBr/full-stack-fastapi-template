"""
Analytics API endpoints.

Provides aggregated analytics data for agent conversations.
"""

from datetime import datetime, timedelta
from typing import Optional, Any

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import Integer
from sqlmodel import select, func, text

from app.api.deps import SessionDep
from app.models import AgentLog, NeoAgent


router = APIRouter()


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class OverviewStats(BaseModel):
    """High-level stats for dashboard."""
    total_conversations: int
    total_turns: int
    total_tokens: int
    total_cost_usd: float
    avg_turns_per_conversation: float
    avg_tokens_per_turn: float
    avg_latency_ms: float
    handoff_rate: float


class TimeSeriesPoint(BaseModel):
    """Single point in time series."""
    date: str
    value: float


class IntentBreakdown(BaseModel):
    """Intent distribution."""
    intent: str
    count: int
    percentage: float


class AgentStats(BaseModel):
    """Stats for a single agent."""
    agent_id: int
    agent_name: str
    total_conversations: int
    total_turns: int
    total_tokens: int
    total_cost_usd: float
    avg_latency_ms: float
    handoff_rate: float


class AnalyticsResponse(BaseModel):
    """Complete analytics response."""
    overview: OverviewStats
    tokens_over_time: list[TimeSeriesPoint]
    conversations_over_time: list[TimeSeriesPoint]
    cost_over_time: list[TimeSeriesPoint]
    intent_breakdown: list[IntentBreakdown]
    agents: list[AgentStats]
    top_chunks: list[dict]
    period_start: str
    period_end: str


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/overview", response_model=AnalyticsResponse)
def get_analytics(
    session: SessionDep,
    agent_id: Optional[int] = Query(None, description="Filter by agent ID"),
    days: int = Query(30, description="Number of days to analyze", ge=1, le=365)
) -> Any:
    """
    Get comprehensive analytics for agent conversations.

    Returns overview stats, time series data, intent breakdown, and per-agent stats.
    """
    period_end = datetime.utcnow()
    period_start = period_end - timedelta(days=days)

    # Base filter
    base_filter = AgentLog.created_at >= period_start
    if agent_id:
        base_filter = base_filter & (AgentLog.agent_id == agent_id)

    # Overview stats
    overview_query = select(
        func.count(func.distinct(AgentLog.thread_id)).label("total_conversations"),
        func.count(AgentLog.id).label("total_turns"),
        func.coalesce(func.sum(AgentLog.total_tokens), 0).label("total_tokens"),
        func.coalesce(func.sum(AgentLog.estimated_cost_usd), 0).label("total_cost"),
        func.coalesce(func.avg(AgentLog.latency_ms), 0).label("avg_latency"),
        func.coalesce(func.avg(AgentLog.requires_handoff.cast(Integer)), 0).label("handoff_rate")
    ).where(base_filter)

    overview_result = session.exec(overview_query).first()

    total_conversations = overview_result.total_conversations or 0
    total_turns = overview_result.total_turns or 0

    overview = OverviewStats(
        total_conversations=total_conversations,
        total_turns=total_turns,
        total_tokens=overview_result.total_tokens or 0,
        total_cost_usd=round(overview_result.total_cost or 0, 4),
        avg_turns_per_conversation=round(total_turns / max(total_conversations, 1), 2),
        avg_tokens_per_turn=round((overview_result.total_tokens or 0) / max(total_turns, 1), 2),
        avg_latency_ms=round(overview_result.avg_latency or 0, 0),
        handoff_rate=round((overview_result.handoff_rate or 0) * 100, 2)
    )

    # Time series - tokens per day
    tokens_query = select(
        func.date(AgentLog.created_at).label("date"),
        func.sum(AgentLog.total_tokens).label("value")
    ).where(base_filter).group_by(func.date(AgentLog.created_at)).order_by(func.date(AgentLog.created_at))

    tokens_results = session.exec(tokens_query).all()
    tokens_over_time = [
        TimeSeriesPoint(date=str(r.date), value=r.value or 0)
        for r in tokens_results
    ]

    # Time series - conversations per day
    conv_query = select(
        func.date(AgentLog.created_at).label("date"),
        func.count(func.distinct(AgentLog.thread_id)).label("value")
    ).where(base_filter).group_by(func.date(AgentLog.created_at)).order_by(func.date(AgentLog.created_at))

    conv_results = session.exec(conv_query).all()
    conversations_over_time = [
        TimeSeriesPoint(date=str(r.date), value=r.value or 0)
        for r in conv_results
    ]

    # Time series - cost per day
    cost_query = select(
        func.date(AgentLog.created_at).label("date"),
        func.sum(AgentLog.estimated_cost_usd).label("value")
    ).where(base_filter).group_by(func.date(AgentLog.created_at)).order_by(func.date(AgentLog.created_at))

    cost_results = session.exec(cost_query).all()
    cost_over_time = [
        TimeSeriesPoint(date=str(r.date), value=round(r.value or 0, 4))
        for r in cost_results
    ]

    # Intent breakdown
    intent_query = select(
        AgentLog.intent,
        func.count(AgentLog.id).label("count")
    ).where(base_filter).group_by(AgentLog.intent).order_by(func.count(AgentLog.id).desc())

    intent_results = session.exec(intent_query).all()
    total_intents = sum(r.count for r in intent_results) or 1
    intent_breakdown = [
        IntentBreakdown(
            intent=r.intent or "unknown",
            count=r.count,
            percentage=round((r.count / total_intents) * 100, 2)
        )
        for r in intent_results
    ]

    # Per-agent stats
    agent_query = select(
        AgentLog.agent_id,
        func.count(func.distinct(AgentLog.thread_id)).label("total_conversations"),
        func.count(AgentLog.id).label("total_turns"),
        func.sum(AgentLog.total_tokens).label("total_tokens"),
        func.sum(AgentLog.estimated_cost_usd).label("total_cost"),
        func.avg(AgentLog.latency_ms).label("avg_latency"),
        func.avg(AgentLog.requires_handoff.cast(Integer)).label("handoff_rate")
    ).where(base_filter).group_by(AgentLog.agent_id)

    agent_results = session.exec(agent_query).all()

    # Get agent names
    agent_ids = [r.agent_id for r in agent_results]
    agents_map = {}
    if agent_ids:
        agents = session.exec(select(NeoAgent).where(NeoAgent.id.in_(agent_ids))).all()
        agents_map = {a.id: a.name for a in agents}

    agents_stats = [
        AgentStats(
            agent_id=r.agent_id,
            agent_name=agents_map.get(r.agent_id, f"Agent {r.agent_id}"),
            total_conversations=r.total_conversations or 0,
            total_turns=r.total_turns or 0,
            total_tokens=r.total_tokens or 0,
            total_cost_usd=round(r.total_cost or 0, 4),
            avg_latency_ms=round(r.avg_latency or 0, 0),
            handoff_rate=round((r.handoff_rate or 0) * 100, 2)
        )
        for r in agent_results
    ]

    # Top chunks used
    chunk_query = text("""
        SELECT chunk_id, COUNT(*) as usage_count
        FROM agent_log, jsonb_array_elements(chunk_ids::jsonb) as chunk_id
        WHERE created_at >= :start_date
        GROUP BY chunk_id
        ORDER BY usage_count DESC
        LIMIT 10
    """)

    try:
        chunk_results = session.exec(chunk_query, params={"start_date": period_start}).all()
        top_chunks = [{"chunk_id": r[0], "usage_count": r[1]} for r in chunk_results]
    except Exception:
        top_chunks = []

    return AnalyticsResponse(
        overview=overview,
        tokens_over_time=tokens_over_time,
        conversations_over_time=conversations_over_time,
        cost_over_time=cost_over_time,
        intent_breakdown=intent_breakdown,
        agents=agents_stats,
        top_chunks=top_chunks,
        period_start=period_start.isoformat(),
        period_end=period_end.isoformat()
    )


@router.get("/conversations")
def get_conversations(
    session: SessionDep,
    agent_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
) -> Any:
    """
    Get recent conversations with aggregated stats.
    """
    # Get distinct thread_ids with stats
    query = select(
        AgentLog.thread_id,
        AgentLog.agent_id,
        func.min(AgentLog.created_at).label("started_at"),
        func.max(AgentLog.created_at).label("last_message_at"),
        func.count(AgentLog.id).label("turn_count"),
        func.sum(AgentLog.total_tokens).label("total_tokens"),
        func.sum(AgentLog.estimated_cost_usd).label("total_cost"),
        func.bool_or(AgentLog.requires_handoff).label("had_handoff")
    ).group_by(AgentLog.thread_id, AgentLog.agent_id).order_by(func.max(AgentLog.created_at).desc())

    if agent_id:
        query = query.where(AgentLog.agent_id == agent_id)

    query = query.limit(limit).offset(offset)
    results = session.exec(query).all()

    # Get agent names
    agent_ids = list(set(r.agent_id for r in results))
    agents_map = {}
    if agent_ids:
        agents = session.exec(select(NeoAgent).where(NeoAgent.id.in_(agent_ids))).all()
        agents_map = {a.id: a.name for a in agents}

    return {
        "conversations": [
            {
                "thread_id": r.thread_id,
                "agent_id": r.agent_id,
                "agent_name": agents_map.get(r.agent_id, f"Agent {r.agent_id}"),
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "last_message_at": r.last_message_at.isoformat() if r.last_message_at else None,
                "turn_count": r.turn_count,
                "total_tokens": r.total_tokens or 0,
                "total_cost": round(r.total_cost or 0, 4),
                "had_handoff": r.had_handoff or False
            }
            for r in results
        ],
        "limit": limit,
        "offset": offset
    }


@router.get("/conversation/{thread_id}")
def get_conversation_detail(
    session: SessionDep,
    thread_id: str
) -> Any:
    """
    Get full conversation history for a thread.
    """
    query = select(AgentLog).where(
        AgentLog.thread_id == thread_id
    ).order_by(AgentLog.turn_number)

    results = session.exec(query).all()

    if not results:
        return {"turns": [], "stats": None}

    # Calculate stats
    total_tokens = sum(r.total_tokens for r in results)
    total_cost = sum(r.estimated_cost_usd for r in results)
    avg_latency = sum(r.latency_ms for r in results) / len(results) if results else 0

    return {
        "turns": [
            {
                "turn_number": r.turn_number,
                "user_message": r.user_message,
                "agent_response": r.agent_response,
                "intent": r.intent,
                "tokens": r.total_tokens,
                "latency_ms": r.latency_ms,
                "created_at": r.created_at.isoformat()
            }
            for r in results
        ],
        "stats": {
            "thread_id": thread_id,
            "agent_id": results[0].agent_id if results else None,
            "total_turns": len(results),
            "total_tokens": total_tokens,
            "total_cost": round(total_cost, 4),
            "avg_latency_ms": round(avg_latency, 0),
            "started_at": results[0].created_at.isoformat() if results else None,
            "ended_at": results[-1].created_at.isoformat() if results else None
        }
    }
