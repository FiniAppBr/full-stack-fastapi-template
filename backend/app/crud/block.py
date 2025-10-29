"""CRUD operations for Block model."""

import os
from datetime import datetime
from typing import Optional
from pathlib import Path

from sqlmodel import Session, select, text

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
    """Get all blocks for an agent (excludes soft-deleted)."""
    statement = select(Block).where(
        Block.agent_id == agent_id,
        Block.deleted_at == None  # Exclude soft-deleted
    )
    return list(session.exec(statement).all())


def get_blocks_by_type(
    *, session: Session, agent_id: int, block_type: str
) -> list[Block]:
    """Get blocks by type for an agent (excludes soft-deleted)."""
    statement = (
        select(Block)
        .where(Block.agent_id == agent_id)
        .where(Block.block_type == block_type)
        .where(Block.deleted_at == None)  # Exclude soft-deleted
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
    """
    Soft delete a block and cascade to knowledge_base.

    Steps:
    1. Mark block as deleted (soft delete)
    2. Mark all related knowledge chunks as inactive
    3. Delete uploaded file from disk
    4. Commit transaction

    Note: Actual cleanup happens via nightly job (removes records older than 7 days)
    """
    # 1. Soft delete block
    block.deleted_at = datetime.utcnow()
    block.is_active = False
    session.add(block)

    # 2. Cascade: Mark all knowledge_base entries as inactive
    if block.block_type == "knowledge":
        try:
            cascade_query = text("""
                UPDATE knowledge_base
                SET is_active = false
                WHERE block_id = :block_id
            """)
            session.execute(cascade_query, {"block_id": block.id})
        except Exception as e:
            print(f"Warning: Failed to cascade delete to knowledge_base: {e}")

    # 3. Delete file from disk if it exists
    if block.file_path:
        try:
            file_path = Path(block.file_path)
            if file_path.exists():
                os.remove(file_path)
                print(f"Deleted file: {file_path}")
        except Exception as e:
            print(f"Warning: Failed to delete file {block.file_path}: {e}")

    session.commit()


def reorder_blocks(*, session: Session, agent_id: int, block_ids: list[int]) -> None:
    """Reorder blocks for an agent (future: add position field)."""
    # TODO: Add position field to Block model for explicit ordering
    # For now, this is a placeholder for future implementation
    pass
