"""
Agent API endpoints
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.agent_service import agent_service

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
        result = await agent_service.send_message(
            customer_id=request.customer_id,
            message=request.message,
            agent_id=request.agent_id
        )

        return MessageResponse(
            response=result.response,
            intent=result.intent,
            confidence=result.confidence
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
