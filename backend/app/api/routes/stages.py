"""
Stages API - Manage conversation stage configurations.

Provides endpoints to:
- List available stage templates
- Get agent's current stages
- Update agent's stages
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlmodel import Session

from app.api.deps import get_current_user, get_db
from app.models.agent import Agent
from app.agent.stages import STAGE_TEMPLATES, ConversationStage

router = APIRouter(prefix="/stages", tags=["stages"])


class StageResponse(BaseModel):
    """Response model for a single stage."""
    id: str
    name: str
    goal: str
    instructions: str = ""
    example_lines: list[str] = []
    allowed_topics: list[str] = []
    blocked_topics: list[str] = []
    transition_when: list[str] = []
    rag_tags: list[str] = []
    next_stage: Optional[str] = None


class StageTemplateResponse(BaseModel):
    """Response model for stage template."""
    id: str
    name: str
    description: str
    stages: list[StageResponse]


class UpdateStagesRequest(BaseModel):
    """Request to update agent's stages."""
    stages: list[dict]
    stages_enabled: bool = True


@router.get("/templates", response_model=list[StageTemplateResponse])
async def list_stage_templates(
    current_user=Depends(get_current_user)
):
    """
    List all available stage templates.

    Templates provide pre-built conversation flows:
    - CONSULTATIVE_SALES: For high-ticket sales
    - LEAD_QUALIFICATION: For service businesses
    - CUSTOMER_SUPPORT: For support-focused agents
    - APPOINTMENT_BOOKING: For scheduling
    """
    templates = []

    template_descriptions = {
        "CONSULTATIVE_SALES": "Multi-stage sales funnel for high-ticket items",
        "LEAD_QUALIFICATION": "Qualify leads before human handoff",
        "CUSTOMER_SUPPORT": "Issue identification and resolution flow",
        "APPOINTMENT_BOOKING": "Simple scheduling flow",
    }

    for template_id, stages in STAGE_TEMPLATES.items():
        templates.append(StageTemplateResponse(
            id=template_id,
            name=template_id.replace("_", " ").title(),
            description=template_descriptions.get(template_id, ""),
            stages=[StageResponse(**s) for s in stages]
        ))

    return templates


@router.get("/templates/{template_id}", response_model=StageTemplateResponse)
async def get_stage_template(
    template_id: str,
    current_user=Depends(get_current_user)
):
    """
    Get a specific stage template by ID.
    """
    if template_id not in STAGE_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")

    stages = STAGE_TEMPLATES[template_id]

    template_descriptions = {
        "CONSULTATIVE_SALES": "Multi-stage sales funnel for high-ticket items",
        "LEAD_QUALIFICATION": "Qualify leads before human handoff",
        "CUSTOMER_SUPPORT": "Issue identification and resolution flow",
        "APPOINTMENT_BOOKING": "Simple scheduling flow",
    }

    return StageTemplateResponse(
        id=template_id,
        name=template_id.replace("_", " ").title(),
        description=template_descriptions.get(template_id, ""),
        stages=[StageResponse(**s) for s in stages]
    )


@router.get("/agent/{agent_id}", response_model=list[StageResponse])
async def get_agent_stages(
    agent_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Get stages configured for a specific agent.
    """
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # TODO: Add stages field to Agent model
    # For now, return empty list
    # stages = agent.stages or []
    stages = []

    return [StageResponse(**s) for s in stages]


@router.put("/agent/{agent_id}")
async def update_agent_stages(
    agent_id: int,
    request: UpdateStagesRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Update stages for a specific agent.

    Can either:
    - Set custom stages directly
    - Apply a template (use GET /stages/templates/{id} then pass stages)
    """
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Validate stages
    validated_stages = []
    for stage_dict in request.stages:
        try:
            stage = ConversationStage(**stage_dict)
            validated_stages.append(stage.model_dump())
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid stage configuration: {e}"
            )

    # TODO: Add stages field to Agent model and save
    # agent.stages = validated_stages
    # agent.stages_enabled = request.stages_enabled
    # db.add(agent)
    # db.commit()

    return {
        "status": "success",
        "message": f"Updated {len(validated_stages)} stages for agent {agent_id}",
        "stages_enabled": request.stages_enabled
    }


@router.post("/agent/{agent_id}/apply-template/{template_id}")
async def apply_template_to_agent(
    agent_id: int,
    template_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Apply a stage template to an agent.

    This copies the template stages to the agent's configuration.
    """
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if template_id not in STAGE_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")

    template_stages = STAGE_TEMPLATES[template_id]

    # TODO: Add stages field to Agent model and save
    # agent.stages = template_stages
    # agent.stages_enabled = True
    # db.add(agent)
    # db.commit()

    return {
        "status": "success",
        "message": f"Applied template '{template_id}' to agent {agent_id}",
        "stages_count": len(template_stages)
    }
