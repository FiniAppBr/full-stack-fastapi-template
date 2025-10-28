"""Agent API routes."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.deps import CurrentUser, SessionDep
from app.crud import agent as agent_crud
from app.schemas import AgentCreate, AgentPublic, AgentsPublic, AgentUpdate

router = APIRouter()


@router.get("", response_model=AgentsPublic)
def get_agents(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """Get all agents for current user."""
    agents = agent_crud.get_agents_by_owner(session=session, owner_id=current_user.id)
    return AgentsPublic(data=agents, count=len(agents))


@router.post("", response_model=AgentPublic, status_code=201)
def create_agent(
    *, session: SessionDep, current_user: CurrentUser, agent_in: AgentCreate
) -> Any:
    """Create new agent."""
    agent = agent_crud.create_agent(
        session=session, agent_data=agent_in.model_dump(), owner_id=current_user.id
    )
    return agent


@router.get("/{agent_id}", response_model=AgentPublic)
def get_agent(session: SessionDep, current_user: CurrentUser, agent_id: int) -> Any:
    """Get agent by ID."""
    agent = agent_crud.get_agent(session=session, agent_id=agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this agent")
    return agent


@router.patch("/{agent_id}", response_model=AgentPublic)
def update_agent(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    agent_id: int,
    agent_in: AgentUpdate,
) -> Any:
    """Update agent."""
    agent = agent_crud.get_agent(session=session, agent_id=agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this agent")

    update_data = agent_in.model_dump(exclude_unset=True)
    agent = agent_crud.update_agent(session=session, agent=agent, agent_data=update_data)
    return agent


@router.delete("/{agent_id}", status_code=204)
def delete_agent(session: SessionDep, current_user: CurrentUser, agent_id: int) -> None:
    """Delete agent."""
    agent = agent_crud.get_agent(session=session, agent_id=agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this agent")

    agent_crud.delete_agent(session=session, agent=agent)
