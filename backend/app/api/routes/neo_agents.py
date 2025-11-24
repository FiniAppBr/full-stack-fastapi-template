"""
Neo Agents API routes.
"""
from typing import Any
from datetime import datetime

from fastapi import APIRouter, HTTPException
from sqlmodel import select, func

from app.api.deps import SessionDep
from app.models.neo_agent import (
    NeoAgent,
    NeoAgentCreate,
    NeoAgentUpdate,
    NeoAgentPublic,
    NeoAgentsPublic,
)

router = APIRouter(prefix="/neo-agents", tags=["neo-agents"])


@router.get("", response_model=NeoAgentsPublic)
def list_neo_agents(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Get all Neo Agents."""
    count_statement = select(func.count(NeoAgent.id))
    count = session.exec(count_statement).one()

    statement = select(NeoAgent).offset(skip).limit(limit).order_by(NeoAgent.created_at.desc())
    agents = session.exec(statement).all()

    # Add entities_count to each agent
    agents_with_counts = []
    for agent in agents:
        agent_dict = agent.model_dump()
        agent_dict["entities_count"] = len(agent.linked_entities) if agent.linked_entities else 0
        agents_with_counts.append(NeoAgentPublic(**agent_dict))

    return NeoAgentsPublic(data=agents_with_counts, count=count)


@router.get("/{agent_id}", response_model=NeoAgentPublic)
def get_neo_agent(session: SessionDep, agent_id: int) -> Any:
    """Get a specific Neo Agent by ID."""
    agent = session.get(NeoAgent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent_dict = agent.model_dump()
    agent_dict["entities_count"] = len(agent.linked_entities) if agent.linked_entities else 0
    return NeoAgentPublic(**agent_dict)


@router.post("", response_model=NeoAgentPublic)
def create_neo_agent(session: SessionDep, agent_in: NeoAgentCreate) -> Any:
    """Create a new Neo Agent."""
    agent = NeoAgent.model_validate(agent_in)
    agent.created_at = datetime.utcnow()
    agent.updated_at = datetime.utcnow()

    session.add(agent)
    session.commit()
    session.refresh(agent)

    agent_dict = agent.model_dump()
    agent_dict["entities_count"] = len(agent.linked_entities) if agent.linked_entities else 0
    return NeoAgentPublic(**agent_dict)


@router.patch("/{agent_id}", response_model=NeoAgentPublic)
def update_neo_agent(
    session: SessionDep,
    agent_id: int,
    agent_in: NeoAgentUpdate,
) -> Any:
    """Update a Neo Agent."""
    agent = session.get(NeoAgent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    update_data = agent_in.model_dump(exclude_unset=True)
    agent.sqlmodel_update(update_data)
    agent.updated_at = datetime.utcnow()

    session.add(agent)
    session.commit()
    session.refresh(agent)

    agent_dict = agent.model_dump()
    agent_dict["entities_count"] = len(agent.linked_entities) if agent.linked_entities else 0
    return NeoAgentPublic(**agent_dict)


@router.delete("/{agent_id}")
def delete_neo_agent(session: SessionDep, agent_id: int) -> Any:
    """Delete a Neo Agent."""
    agent = session.get(NeoAgent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    session.delete(agent)
    session.commit()
    return {"ok": True}
