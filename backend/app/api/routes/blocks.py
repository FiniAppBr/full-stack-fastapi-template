"""Block API routes."""

from typing import Any, Union

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.deps import CurrentUser, SessionDep
from app.crud import agent as agent_crud
from app.crud import block as block_crud
from app.schemas import (
    ActionBlockCreate,
    BlockPublic,
    BlocksPublic,
    BlockUpdate,
    KnowledgeBlockCreate,
    PersonalityBlockCreate,
)

router = APIRouter()


def verify_agent_ownership(
    session: Session, agent_id: int, user_id: str
) -> None:
    """Verify user owns the agent."""
    agent = agent_crud.get_agent(session=session, agent_id=agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this agent")


@router.get("", response_model=BlocksPublic)
def get_blocks(
    session: SessionDep,
    current_user: CurrentUser,
    agent_id: int,
    block_type: str | None = None,
) -> Any:
    """Get all blocks for an agent, optionally filtered by type."""
    verify_agent_ownership(session, agent_id, current_user.id)

    if block_type:
        blocks = block_crud.get_blocks_by_type(
            session=session, agent_id=agent_id, block_type=block_type
        )
    else:
        blocks = block_crud.get_blocks_by_agent(session=session, agent_id=agent_id)

    return BlocksPublic(data=blocks, count=len(blocks))


@router.post("", response_model=BlockPublic, status_code=201)
def create_block(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    agent_id: int,
    block_in: Union[KnowledgeBlockCreate, PersonalityBlockCreate, ActionBlockCreate],
) -> Any:
    """Create new block for an agent."""
    verify_agent_ownership(session, agent_id, current_user.id)

    block = block_crud.create_block(
        session=session, block_data=block_in.model_dump(), agent_id=agent_id
    )
    return block


@router.get("/{block_id}", response_model=BlockPublic)
def get_block(
    session: SessionDep, current_user: CurrentUser, agent_id: int, block_id: int
) -> Any:
    """Get block by ID."""
    verify_agent_ownership(session, agent_id, current_user.id)

    block = block_crud.get_block(session=session, block_id=block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    if block.agent_id != agent_id:
        raise HTTPException(status_code=400, detail="Block does not belong to this agent")

    return block


@router.patch("/{block_id}", response_model=BlockPublic)
def update_block(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    agent_id: int,
    block_id: int,
    block_in: BlockUpdate,
) -> Any:
    """Update block."""
    verify_agent_ownership(session, agent_id, current_user.id)

    block = block_crud.get_block(session=session, block_id=block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    if block.agent_id != agent_id:
        raise HTTPException(status_code=400, detail="Block does not belong to this agent")

    update_data = block_in.model_dump(exclude_unset=True)
    block = block_crud.update_block(session=session, block=block, block_data=update_data)
    return block


@router.delete("/{block_id}", status_code=204)
def delete_block(
    session: SessionDep, current_user: CurrentUser, agent_id: int, block_id: int
) -> None:
    """Delete block."""
    verify_agent_ownership(session, agent_id, current_user.id)

    block = block_crud.get_block(session=session, block_id=block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    if block.agent_id != agent_id:
        raise HTTPException(status_code=400, detail="Block does not belong to this agent")

    block_crud.delete_block(session=session, block=block)
