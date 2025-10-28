"""CRUD operations for Block model."""

from typing import Optional

from sqlmodel import Session, select

from app.models.block import Block


def create_block(*, session: Session, block_data: dict, agent_id: int) -> Block:
    """Create a new block for an agent."""
    db_block = Block(**block_data, agent_id=agent_id)
    session.add(db_block)
    session.commit()
    session.refresh(db_block)
    return db_block


def get_block(*, session: Session, block_id: int) -> Optional[Block]:
    """Get block by ID."""
    return session.get(Block, block_id)


def get_blocks_by_agent(*, session: Session, agent_id: int) -> list[Block]:
    """Get all blocks for an agent."""
    statement = select(Block).where(Block.agent_id == agent_id)
    return list(session.exec(statement).all())


def get_blocks_by_type(
    *, session: Session, agent_id: int, block_type: str
) -> list[Block]:
    """Get blocks by type for an agent."""
    statement = (
        select(Block)
        .where(Block.agent_id == agent_id)
        .where(Block.block_type == block_type)
    )
    return list(session.exec(statement).all())


def update_block(*, session: Session, block: Block, block_data: dict) -> Block:
    """Update an existing block."""
    for key, value in block_data.items():
        setattr(block, key, value)
    session.add(block)
    session.commit()
    session.refresh(block)
    return block


def delete_block(*, session: Session, block: Block) -> None:
    """Delete a block."""
    session.delete(block)
    session.commit()


def reorder_blocks(*, session: Session, agent_id: int, block_ids: list[int]) -> None:
    """Reorder blocks for an agent (future: add position field)."""
    # TODO: Add position field to Block model for explicit ordering
    # For now, this is a placeholder for future implementation
    pass
