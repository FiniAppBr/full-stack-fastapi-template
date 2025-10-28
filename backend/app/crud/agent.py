"""CRUD operations for Agent model."""

import uuid
from typing import Optional

from sqlmodel import Session, select

from app.models.agent import Agent


def create_agent(*, session: Session, agent_data: dict, owner_id: uuid.UUID) -> Agent:
    """Create a new agent for a user."""
    db_agent = Agent(**agent_data, owner_id=owner_id)
    session.add(db_agent)
    session.commit()
    session.refresh(db_agent)
    return db_agent


def get_agent(*, session: Session, agent_id: int) -> Optional[Agent]:
    """Get agent by ID."""
    return session.get(Agent, agent_id)


def get_agents_by_owner(*, session: Session, owner_id: uuid.UUID) -> list[Agent]:
    """Get all agents for a user."""
    statement = select(Agent).where(Agent.owner_id == owner_id)
    return list(session.exec(statement).all())


def update_agent(*, session: Session, agent: Agent, agent_data: dict) -> Agent:
    """Update an existing agent."""
    for key, value in agent_data.items():
        setattr(agent, key, value)
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return agent


def delete_agent(*, session: Session, agent: Agent) -> None:
    """Delete an agent."""
    session.delete(agent)
    session.commit()
