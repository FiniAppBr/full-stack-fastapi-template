"""
Agent API endpoints
"""
import asyncio
from typing import List, Optional
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlmodel import select, func
from app.services.agent_service import agent_service
from app.api.deps import SessionDep
from app.models import ConversationLog

router = APIRouter()


class MessageRequest(BaseModel):
    """Request to send a message to the agent"""
    customer_id: str
    message: str
    agent_id: str


class MessageResponse(BaseModel):
    """Response from the agent"""
    response: str
    intent: str
    confidence: float
    workflow_id: str  # For WebSocket connection
    duration_seconds: float
    agent_timings: dict


@router.post("/message", response_model=MessageResponse)
async def send_message(request: MessageRequest):
    """
    Send a message to the Assistant AI and get a response

    This endpoint:
    1. Receives a customer message
    2. Executes the Temporal workflow (3 agents: intent, retrieval, response)
    3. Returns the AI-generated response

    Example request:
    ```json
    {
        "customer_id": "customer-123",
        "message": "Quanto custa o banho?",
        "agent_id": "agent-456"
    }
    ```
    """
    try:
        workflow_id, result = await agent_service.send_message(
            customer_id=request.customer_id,
            message=request.message,
            agent_id=request.agent_id
        )

        return MessageResponse(
            response=result.response,
            intent=result.intent,
            confidence=result.confidence,
            workflow_id=workflow_id,
            duration_seconds=result.duration_seconds,
            agent_timings=result.agent_timings
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process message: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Check if agent service is healthy"""
    try:
        await agent_service.connect()
        return {"status": "healthy", "temporal_connected": True}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e), "temporal_connected": False}


# Analytics Models
class ConversationLogPublic(BaseModel):
    """Public conversation log for analytics"""
    id: int
    workflow_id: str
    customer_id: str
    agent_id: str
    message: str
    response: str
    intent: str
    confidence: float
    duration_seconds: float
    agent_timings: dict
    status: str
    created_at: str
    # Token tracking
    input_tokens: int
    output_tokens: int
    total_tokens: int
    token_details: dict
    model_used: str
    estimated_cost_usd: float


class AnalyticsSummary(BaseModel):
    """Analytics summary stats"""
    total_conversations: int
    avg_duration_seconds: float
    success_rate: float
    intents: dict  # {"question": 32, "booking": 10, ...}
    # Token/cost tracking
    total_tokens_used: int
    total_cost_usd: float
    avg_tokens_per_conversation: float
    avg_cost_per_conversation: float


class AnalyticsResponse(BaseModel):
    """Full analytics response"""
    summary: AnalyticsSummary
    recent_executions: List[ConversationLogPublic]


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    session: SessionDep,
    limit: int = 50
):
    """
    Get agent analytics and recent conversation logs

    Returns:
    - Summary stats (total conversations, avg duration, success rate, intent distribution)
    - Recent conversation executions with full details
    """
    # Get total count
    total_query = select(func.count(ConversationLog.id))
    total_conversations = session.exec(total_query).one()

    # Get average duration
    avg_duration_query = select(func.avg(ConversationLog.duration_seconds))
    avg_duration = session.exec(avg_duration_query).one() or 0.0

    # Get success rate
    success_query = select(func.count(ConversationLog.id)).where(
        ConversationLog.status == "completed"
    )
    success_count = session.exec(success_query).one()
    success_rate = success_count / total_conversations if total_conversations > 0 else 0.0

    # Get intent distribution
    intent_query = select(
        ConversationLog.intent,
        func.count(ConversationLog.id).label("count")
    ).group_by(ConversationLog.intent)
    intent_results = session.exec(intent_query).all()
    intents = {intent: count for intent, count in intent_results}

    # Get token/cost stats
    total_tokens_query = select(func.sum(ConversationLog.total_tokens))
    total_tokens = session.exec(total_tokens_query).one() or 0

    total_cost_query = select(func.sum(ConversationLog.estimated_cost_usd))
    total_cost = session.exec(total_cost_query).one() or 0.0

    avg_tokens = total_tokens / total_conversations if total_conversations > 0 else 0
    avg_cost = total_cost / total_conversations if total_conversations > 0 else 0.0

    # Get recent executions
    recent_query = select(ConversationLog).order_by(
        ConversationLog.created_at.desc()
    ).limit(limit)
    recent_logs = session.exec(recent_query).all()

    return AnalyticsResponse(
        summary=AnalyticsSummary(
            total_conversations=total_conversations,
            avg_duration_seconds=float(avg_duration),
            success_rate=float(success_rate),
            intents=intents,
            total_tokens_used=int(total_tokens),
            total_cost_usd=float(total_cost),
            avg_tokens_per_conversation=float(avg_tokens),
            avg_cost_per_conversation=float(avg_cost)
        ),
        recent_executions=[
            ConversationLogPublic(
                id=log.id,
                workflow_id=log.workflow_id,
                customer_id=log.customer_id,
                agent_id=log.agent_id,
                message=log.message,
                response=log.response,
                intent=log.intent,
                confidence=log.confidence,
                duration_seconds=log.duration_seconds,
                agent_timings=log.agent_timings,
                status=log.status,
                created_at=log.created_at.isoformat(),
                # Token tracking
                input_tokens=log.input_tokens,
                output_tokens=log.output_tokens,
                total_tokens=log.total_tokens,
                token_details=log.token_details,
                model_used=log.model_used,
                estimated_cost_usd=log.estimated_cost_usd
            )
            for log in recent_logs
        ]
    )


@router.websocket("/ws/{workflow_id}")
async def workflow_progress_websocket(websocket: WebSocket, workflow_id: str):
    """
    WebSocket endpoint for real-time workflow progress updates

    Connect to this endpoint with a workflow_id to receive real-time updates
    about the workflow's progress as it executes.

    The workflow must support the `get_progress` query method.
    """
    await websocket.accept()

    try:
        # Connect to Temporal and get workflow handle
        client = await agent_service.connect()
        handle = client.get_workflow_handle(workflow_id)

        # Poll workflow progress every 500ms
        while True:
            try:
                # Query the workflow for current progress
                progress = await handle.query("get_progress")

                # Send progress update to frontend
                await websocket.send_json({
                    "workflow_id": workflow_id,
                    "current_step": progress["current_step"],
                    "progress": progress["progress"],
                    "agent_timings": progress["agent_timings"]
                })

                # Stop polling once workflow is completed
                if progress["current_step"] == "completed":
                    await websocket.send_json({"status": "completed"})
                    break

                await asyncio.sleep(0.5)  # Poll every 500ms

            except Exception as e:
                # Workflow might have completed or errored
                await websocket.send_json({
                    "status": "error",
                    "error": str(e)
                })
                break

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for workflow {workflow_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"error": str(e)})
        except:
            pass
