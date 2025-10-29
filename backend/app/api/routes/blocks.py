"""Block API routes."""

import os
import uuid
from datetime import timedelta
from pathlib import Path
from typing import Any, Union

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlmodel import Session
from temporalio.client import Client

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
from app.agents.activities.knowledge_activities import process_document

router = APIRouter()

# File upload configuration
UPLOAD_DIR = Path("/opt/connectai/backend/uploads")
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".xls", ".txt", ".png", ".jpg", ".jpeg"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/plain",
    "image/png",
    "image/jpeg",
}

# Temporal configuration
TEMPORAL_URL = "localhost:5461"
TASK_QUEUE = "connectai-agents"


async def trigger_document_processing(file_path: str, block_id: int, agent_id: int):
    """Trigger document processing directly (not in workflow context)"""
    try:
        # Call activity function directly - we're not in a workflow context
        result = await process_document(file_path, block_id, agent_id)
        print(f"Document processing completed: {result}")
        return result
    except Exception as e:
        # Log error but don't fail the upload
        print(f"Failed to trigger document processing: {e}")
        return {"status": "error", "error": str(e)}


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


@router.post("/upload", response_model=BlockPublic, status_code=201)
async def upload_file(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    agent_id: int,
    file: UploadFile = File(...),
) -> Any:
    """
    Upload a file for knowledge extraction.

    Supports: PDF, DOCX, XLSX, TXT, PNG, JPG (max 50MB)

    Process:
    1. Validate file type and size
    2. Save to disk with unique filename
    3. Create knowledge block with status='processing'
    4. Return block immediately (processing happens async later)
    """
    # Verify ownership
    print(f"DEBUG: agent_id={agent_id}, user_id={current_user.id}")
    verify_agent_ownership(session, agent_id, current_user.id)
    print(f"DEBUG: Verification passed")

    # Validate file uploaded
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Validate MIME type
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}"
        )

    # Read file and validate size
    file_content = await file.read()
    file_size = len(file_content)

    if file_size == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    # Create agent-specific upload directory
    agent_upload_dir = UPLOAD_DIR / str(agent_id)
    agent_upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename to avoid conflicts
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = agent_upload_dir / unique_filename

    # Save file to disk
    try:
        with open(file_path, "wb") as f:
            f.write(file_content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )

    # Create knowledge block with processing status
    block_data = {
        "block_type": "knowledge",
        "name": file.filename or unique_filename,
        "description": f"Uploaded file: {file.filename}",
        "file_path": str(file_path),
        "file_type": file_ext.lstrip("."),
        "content_type": "file",
        "is_active": False,  # Inactive until processing completes
    }

    # Store file size in metadata
    if not block_data.get("metadata_"):
        block_data["metadata_"] = {}
    block_data["metadata_"]["file_size"] = file_size
    block_data["metadata_"]["original_filename"] = file.filename
    block_data["metadata_"]["status"] = "processing"
    block_data["metadata_"]["mime_type"] = file.content_type

    block = block_crud.create_block(
        session=session,
        block_data=block_data,
        agent_id=agent_id
    )

    # NOTE: Processing NOT triggered automatically
    # User must explicitly call POST /blocks/{block_id}/process to generate embeddings
    # This prevents accidental token waste and allows cost preview

    return block


@router.post("/{block_id}/process", response_model=BlockPublic)
async def process_block(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    agent_id: int,
    block_id: int,
) -> Any:
    """
    Trigger document processing and embedding generation for an uploaded file.

    This is the second step after upload:
    1. Upload file → creates block (is_active=false, status='uploaded')
    2. User confirms → calls this endpoint → generates embeddings

    Process:
    - Extract text (Docling for docs, Vision LLM for images)
    - Chunk content
    - Generate embeddings (Voyage AI)
    - Store in knowledge_base
    - Activate block (is_active=true)

    Cost: ~$0.01-0.05 per document depending on size
    """
    verify_agent_ownership(session, agent_id, current_user.id)

    # Get block
    block = block_crud.get_block(session=session, block_id=block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    if block.agent_id != agent_id:
        raise HTTPException(status_code=400, detail="Block does not belong to this agent")
    if block.block_type != "knowledge":
        raise HTTPException(status_code=400, detail="Only knowledge blocks can be processed")
    if not block.file_path:
        raise HTTPException(status_code=400, detail="Block has no file to process")

    # Check if already processed
    if block.metadata_ and block.metadata_.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Block already processed")

    # Update status to processing
    block.metadata_["status"] = "processing"
    session.add(block)
    session.commit()
    session.refresh(block)

    # Trigger async processing
    await trigger_document_processing(block.file_path, block.id, agent_id)

    return block
