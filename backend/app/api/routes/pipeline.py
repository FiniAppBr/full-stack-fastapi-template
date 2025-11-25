"""Pipeline (Kanban) API routes - CRM board for managing contacts through stages."""

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import select, func

from app.api.deps import SessionDep
from app.models.pipeline import (
    PipelineColumn, PipelineColumnCreate, PipelineColumnUpdate, PipelineColumnPublic,
    PipelineCard, PipelineCardCreate, PipelineCardUpdate, PipelineCardPublic,
    DEFAULT_PIPELINE_STAGES
)
from app.models.contact import Contact

router = APIRouter()


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class BoardTask(BaseModel):
    """Task/card in the board view (matches frontend kanban format)."""
    id: str
    name: str  # Contact name
    priority: str
    labels: list[str]
    description: Optional[str] = None
    due: Optional[list[datetime]] = None
    reporter: Optional[dict] = None
    assignee: Optional[list[dict]] = None
    attachments: Optional[list[str]] = None
    comments: Optional[list[dict]] = None
    # Contact info
    contact_id: int
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None


class BoardColumn(BaseModel):
    """Column in the board view."""
    id: str
    name: str


class BoardResponse(BaseModel):
    """Full board response (matches frontend kanban format)."""
    columns: list[BoardColumn]
    tasks: dict[str, list[BoardTask]]  # column_id -> list of tasks


# =============================================================================
# BOARD ENDPOINT (for frontend Kanban)
# =============================================================================

@router.get("", response_model=dict)
def get_board(session: SessionDep) -> Any:
    """
    Get the full pipeline board for the kanban view.

    Returns the board in the format expected by the frontend kanban component:
    {
        "board": {
            "columns": [{"id": "...", "name": "..."}],
            "tasks": {
                "column_id": [{"id": "...", "name": "...", ...}]
            }
        }
    }
    """
    # Get or create columns
    columns = session.exec(
        select(PipelineColumn)
        .where(PipelineColumn.is_active == True)
        .order_by(PipelineColumn.order)
    ).all()

    # If no columns exist, create default ones
    if not columns:
        columns = []
        for stage in DEFAULT_PIPELINE_STAGES:
            column = PipelineColumn(
                name=stage["name"],
                color=stage["color"],
                order=stage["order"],
            )
            session.add(column)
            columns.append(column)
        session.commit()
        for col in columns:
            session.refresh(col)

    # Get all cards with their contacts
    cards = session.exec(
        select(PipelineCard)
        .where(PipelineCard.is_active == True)
        .order_by(PipelineCard.order)
    ).all()

    # Build tasks dict by column
    tasks = {str(col.id): [] for col in columns}

    for card in cards:
        contact = session.get(Contact, card.contact_id)
        if not contact or not contact.is_active:
            continue

        # Prefix task id with "task-" to avoid collision with column ids
        task = BoardTask(
            id=f"task-{card.id}",
            name=contact.name,
            priority=card.priority or "medium",
            labels=card.labels or [],
            description=card.notes,
            due=[card.due_date] if card.due_date else None,
            contact_id=contact.id,
            contact_phone=contact.phone,
            contact_email=contact.email,
        )

        column_id = str(card.column_id)
        if column_id in tasks:
            tasks[column_id].append(task)

    # Format columns for frontend
    board_columns = [
        BoardColumn(id=str(col.id), name=col.name)
        for col in columns
    ]

    return {
        "board": {
            "columns": board_columns,
            "tasks": tasks
        }
    }


# =============================================================================
# COLUMN OPERATIONS
# =============================================================================

class BoardOperationRequest(BaseModel):
    """Request body for board operations."""
    columnData: Optional[dict] = None
    columnId: Optional[str] = None
    columnName: Optional[str] = None
    updateColumns: Optional[list[dict]] = None
    taskData: Optional[dict] = None
    taskId: Optional[str] = None
    updateTasks: Optional[dict] = None


@router.post("", status_code=200)
def board_operation(
    session: SessionDep,
    endpoint: str = Query(..., description="Operation type"),
    body: Optional[BoardOperationRequest] = None,
) -> Any:
    """
    Handle board operations (matches frontend kanban actions).

    Supported endpoints:
    - create-column: Create a new column
    - update-column: Update column name
    - move-column: Reorder columns
    - clear-column: Remove all cards from a column
    - delete-column: Delete a column
    - create-task: Create a new card
    - update-task: Update a card
    - move-task: Move cards between columns
    - delete-task: Delete a card
    """
    # Extract values from body (or use defaults)
    columnData = body.columnData if body else None
    columnId = body.columnId if body else None
    columnName = body.columnName if body else None
    updateColumns = body.updateColumns if body else None
    taskData = body.taskData if body else None
    taskId = body.taskId if body else None
    updateTasks = body.updateTasks if body else None

    if endpoint == "create-column":
        if not columnData:
            raise HTTPException(status_code=400, detail="columnData required")

        # Get max order
        max_order = session.exec(
            select(func.max(PipelineColumn.order))
            .where(PipelineColumn.is_active == True)
        ).one() or -1

        column = PipelineColumn(
            name=columnData.get("name", "Nova Coluna"),
            color=columnData.get("color", "#00B8D9"),
            order=max_order + 1,
        )
        session.add(column)
        session.commit()
        return {"status": "ok", "column_id": column.id}

    elif endpoint == "update-column":
        if not columnId or not columnName:
            raise HTTPException(status_code=400, detail="columnId and columnName required")

        column = session.get(PipelineColumn, int(columnId))
        if not column or not column.is_active:
            raise HTTPException(status_code=404, detail="Column not found")

        column.name = columnName
        column.updated_at = datetime.utcnow()
        session.add(column)
        session.commit()
        return {"status": "ok"}

    elif endpoint == "move-column":
        if not updateColumns:
            raise HTTPException(status_code=400, detail="updateColumns required")

        # Update order based on new positions
        for i, col_data in enumerate(updateColumns):
            col_id = int(col_data["id"])
            column = session.get(PipelineColumn, col_id)
            if column and column.is_active:
                column.order = i
                column.updated_at = datetime.utcnow()
                session.add(column)

        session.commit()
        return {"status": "ok"}

    elif endpoint == "clear-column":
        if not columnId:
            raise HTTPException(status_code=400, detail="columnId required")

        # Soft delete all cards in the column
        cards = session.exec(
            select(PipelineCard)
            .where(PipelineCard.is_active == True)
            .where(PipelineCard.column_id == int(columnId))
        ).all()

        for card in cards:
            card.is_active = False
            card.updated_at = datetime.utcnow()
            session.add(card)

        session.commit()
        return {"status": "ok", "cleared": len(cards)}

    elif endpoint == "delete-column":
        if not columnId:
            raise HTTPException(status_code=400, detail="columnId required")

        column = session.get(PipelineColumn, int(columnId))
        if not column or not column.is_active:
            raise HTTPException(status_code=404, detail="Column not found")

        # Soft delete column and its cards
        column.is_active = False
        column.updated_at = datetime.utcnow()
        session.add(column)

        cards = session.exec(
            select(PipelineCard)
            .where(PipelineCard.is_active == True)
            .where(PipelineCard.column_id == int(columnId))
        ).all()

        for card in cards:
            card.is_active = False
            card.updated_at = datetime.utcnow()
            session.add(card)

        session.commit()
        return {"status": "ok"}

    elif endpoint == "create-task":
        if not columnId or not taskData:
            raise HTTPException(status_code=400, detail="columnId and taskData required")

        # Get or create contact
        contact_id = taskData.get("contact_id")
        if not contact_id:
            # Create new contact if name is provided
            contact_name = taskData.get("name", "Novo Contato")
            contact = Contact(
                name=contact_name,
                phone=taskData.get("contact_phone"),
                email=taskData.get("contact_email"),
                source="manual",
                pipeline_stage="new",
            )
            session.add(contact)
            session.flush()
            contact_id = contact.id

        # Get max order in column
        max_order = session.exec(
            select(func.max(PipelineCard.order))
            .where(PipelineCard.is_active == True)
            .where(PipelineCard.column_id == int(columnId))
        ).one() or -1

        card = PipelineCard(
            contact_id=contact_id,
            column_id=int(columnId),
            order=max_order + 1,
            priority=taskData.get("priority", "medium"),
            labels=taskData.get("labels", []),
            notes=taskData.get("description"),
        )
        session.add(card)
        session.commit()
        session.refresh(card)

        return {"status": "ok", "card_id": card.id, "contact_id": contact_id}

    elif endpoint == "update-task":
        if not columnId or not taskData:
            raise HTTPException(status_code=400, detail="columnId and taskData required")

        task_id = taskData.get("id")
        if not task_id:
            raise HTTPException(status_code=400, detail="taskData.id required")

        card = session.get(PipelineCard, int(task_id))
        if not card or not card.is_active:
            raise HTTPException(status_code=404, detail="Card not found")

        # Update card fields
        if "priority" in taskData:
            card.priority = taskData["priority"]
        if "labels" in taskData:
            card.labels = taskData["labels"]
        if "description" in taskData:
            card.notes = taskData["description"]
        if "due" in taskData and taskData["due"]:
            card.due_date = taskData["due"][0] if isinstance(taskData["due"], list) else taskData["due"]

        card.updated_at = datetime.utcnow()
        card.last_activity_at = datetime.utcnow()
        session.add(card)
        session.commit()

        return {"status": "ok"}

    elif endpoint == "move-task":
        if not updateTasks:
            raise HTTPException(status_code=400, detail="updateTasks required")

        # Map column names to pipeline stages (for known columns)
        COLUMN_TO_STAGE = {
            "Novos Leads": "new",
            "Em Contato": "contacted",
            "Qualificado": "qualified",
            "Negociação": "negotiation",
            "Fechado": "won",
            "Perdido": "lost",
        }

        # updateTasks is a dict: {column_id: [task, task, ...]}
        try:
            for column_id, tasks in updateTasks.items():
                # Get column to determine stage
                column = session.get(PipelineColumn, int(column_id))
                if not column:
                    continue
                # Use mapped stage for known columns, or column name (lowercase, normalized) for custom columns
                stage = COLUMN_TO_STAGE.get(column.name, column.name.lower().replace(" ", "_"))

                for i, task in enumerate(tasks):
                    if not task or not task.get("id"):
                        continue  # Skip invalid tasks
                    # Handle prefixed task ids (e.g., "task-1" -> 1)
                    task_id_str = str(task["id"])
                    if task_id_str.startswith("task-"):
                        task_id_str = task_id_str[5:]  # Remove "task-" prefix
                    card_id = int(task_id_str)
                    card = session.get(PipelineCard, card_id)
                    if card and card.is_active:
                        # Update card position
                        card.column_id = int(column_id)
                        card.order = i
                        card.moved_at = datetime.utcnow()
                        card.updated_at = datetime.utcnow()
                        session.add(card)

                        # Also update contact's pipeline_stage
                        if card.contact_id:
                            contact = session.get(Contact, card.contact_id)
                            if contact:
                                contact.pipeline_stage = stage
                                contact.updated_at = datetime.utcnow()
                                session.add(contact)

            session.commit()
            return {"status": "ok"}
        except Exception as e:
            session.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to move task: {str(e)}")

    elif endpoint == "delete-task":
        if not columnId or not taskId:
            raise HTTPException(status_code=400, detail="columnId and taskId required")

        card = session.get(PipelineCard, int(taskId))
        if not card or not card.is_active:
            raise HTTPException(status_code=404, detail="Card not found")

        card.is_active = False
        card.updated_at = datetime.utcnow()
        session.add(card)
        session.commit()

        return {"status": "ok"}

    else:
        raise HTTPException(status_code=400, detail=f"Unknown endpoint: {endpoint}")


# =============================================================================
# DIRECT CARD OPERATIONS (for agents)
# =============================================================================

@router.get("/cards", response_model=list[PipelineCardPublic])
def get_cards(
    session: SessionDep,
    column_id: Optional[int] = Query(None, description="Filter by column"),
    contact_id: Optional[int] = Query(None, description="Filter by contact"),
) -> Any:
    """Get pipeline cards with optional filtering."""
    query = select(PipelineCard).where(PipelineCard.is_active == True)

    if column_id:
        query = query.where(PipelineCard.column_id == column_id)
    if contact_id:
        query = query.where(PipelineCard.contact_id == contact_id)

    query = query.order_by(PipelineCard.order)
    return session.exec(query).all()


@router.post("/cards", response_model=PipelineCardPublic, status_code=201)
def create_card(
    session: SessionDep,
    card_in: PipelineCardCreate
) -> Any:
    """Create a new pipeline card (for agent use)."""
    # Verify contact exists
    contact = session.get(Contact, card_in.contact_id)
    if not contact or not contact.is_active:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Verify column exists
    column = session.get(PipelineColumn, card_in.column_id)
    if not column or not column.is_active:
        raise HTTPException(status_code=404, detail="Column not found")

    # Get max order in column
    max_order = session.exec(
        select(func.max(PipelineCard.order))
        .where(PipelineCard.is_active == True)
        .where(PipelineCard.column_id == card_in.column_id)
    ).one() or -1

    card = PipelineCard(
        contact_id=card_in.contact_id,
        column_id=card_in.column_id,
        order=card_in.order if card_in.order else max_order + 1,
        priority=card_in.priority,
        due_date=card_in.due_date,
        notes=card_in.notes,
        labels=card_in.labels,
    )
    session.add(card)
    session.commit()
    session.refresh(card)
    return card


@router.patch("/cards/{card_id}", response_model=PipelineCardPublic)
def update_card(
    session: SessionDep,
    card_id: int,
    card_in: PipelineCardUpdate
) -> Any:
    """Update a pipeline card."""
    card = session.get(PipelineCard, card_id)
    if not card or not card.is_active:
        raise HTTPException(status_code=404, detail="Card not found")

    update_data = card_in.model_dump(exclude_unset=True)

    # Track if column changed
    column_changed = "column_id" in update_data and update_data["column_id"] != card.column_id

    for key, value in update_data.items():
        setattr(card, key, value)

    if column_changed:
        card.moved_at = datetime.utcnow()

    card.updated_at = datetime.utcnow()
    card.last_activity_at = datetime.utcnow()
    session.add(card)
    session.commit()
    session.refresh(card)
    return card


@router.post("/cards/{card_id}/move")
def move_card(
    session: SessionDep,
    card_id: int,
    column_id: int = Query(..., description="Target column ID"),
    position: Optional[int] = Query(None, description="Position in column (0-indexed)")
) -> Any:
    """Move a card to a different column (for agent-driven pipeline management)."""
    card = session.get(PipelineCard, card_id)
    if not card or not card.is_active:
        raise HTTPException(status_code=404, detail="Card not found")

    # Verify target column
    column = session.get(PipelineColumn, column_id)
    if not column or not column.is_active:
        raise HTTPException(status_code=404, detail="Target column not found")

    # Get order position
    if position is not None:
        order = position
    else:
        # Add to end of column
        max_order = session.exec(
            select(func.max(PipelineCard.order))
            .where(PipelineCard.is_active == True)
            .where(PipelineCard.column_id == column_id)
        ).one() or -1
        order = max_order + 1

    card.column_id = column_id
    card.order = order
    card.moved_at = datetime.utcnow()
    card.updated_at = datetime.utcnow()
    session.add(card)
    session.commit()

    return {"status": "ok", "new_column_id": column_id, "order": order}


@router.delete("/cards/{card_id}", status_code=204)
def delete_card(session: SessionDep, card_id: int) -> None:
    """Delete a pipeline card."""
    card = session.get(PipelineCard, card_id)
    if not card or not card.is_active:
        raise HTTPException(status_code=404, detail="Card not found")

    card.is_active = False
    card.updated_at = datetime.utcnow()
    session.add(card)
    session.commit()


# =============================================================================
# COLUMN CRUD (direct operations)
# =============================================================================

@router.get("/columns", response_model=list[PipelineColumnPublic])
def get_columns(session: SessionDep) -> Any:
    """Get all pipeline columns."""
    columns = session.exec(
        select(PipelineColumn)
        .where(PipelineColumn.is_active == True)
        .order_by(PipelineColumn.order)
    ).all()

    # Create default columns if none exist
    if not columns:
        columns = []
        for stage in DEFAULT_PIPELINE_STAGES:
            column = PipelineColumn(
                name=stage["name"],
                color=stage["color"],
                order=stage["order"],
            )
            session.add(column)
            columns.append(column)
        session.commit()
        for col in columns:
            session.refresh(col)

    return columns


@router.post("/columns", response_model=PipelineColumnPublic, status_code=201)
def create_column(
    session: SessionDep,
    column_in: PipelineColumnCreate
) -> Any:
    """Create a new pipeline column."""
    # Get max order
    max_order = session.exec(
        select(func.max(PipelineColumn.order))
        .where(PipelineColumn.is_active == True)
    ).one() or -1

    column = PipelineColumn(
        name=column_in.name,
        color=column_in.color,
        order=column_in.order if column_in.order else max_order + 1,
    )
    session.add(column)
    session.commit()
    session.refresh(column)
    return column


@router.patch("/columns/{column_id}", response_model=PipelineColumnPublic)
def update_column(
    session: SessionDep,
    column_id: int,
    column_in: PipelineColumnUpdate
) -> Any:
    """Update a pipeline column."""
    column = session.get(PipelineColumn, column_id)
    if not column or not column.is_active:
        raise HTTPException(status_code=404, detail="Column not found")

    update_data = column_in.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(column, key, value)

    column.updated_at = datetime.utcnow()
    session.add(column)
    session.commit()
    session.refresh(column)
    return column


@router.delete("/columns/{column_id}", status_code=204)
def delete_column(session: SessionDep, column_id: int) -> None:
    """Delete a pipeline column (and its cards)."""
    column = session.get(PipelineColumn, column_id)
    if not column or not column.is_active:
        raise HTTPException(status_code=404, detail="Column not found")

    # Soft delete column and its cards
    column.is_active = False
    column.updated_at = datetime.utcnow()
    session.add(column)

    cards = session.exec(
        select(PipelineCard)
        .where(PipelineCard.is_active == True)
        .where(PipelineCard.column_id == column_id)
    ).all()

    for card in cards:
        card.is_active = False
        card.updated_at = datetime.utcnow()
        session.add(card)

    session.commit()


# =============================================================================
# ADD CONTACT TO PIPELINE (convenience endpoint)
# =============================================================================

@router.post("/add-contact")
def add_contact_to_pipeline(
    session: SessionDep,
    contact_id: int = Query(..., description="Contact to add"),
    column_id: Optional[int] = Query(None, description="Column to add to (default: first column)"),
    priority: str = Query("medium", description="Card priority"),
) -> Any:
    """
    Add a contact to the pipeline.

    Creates a new card for the contact in the specified column.
    If no column specified, adds to the first column (typically "New Leads").
    """
    # Verify contact
    contact = session.get(Contact, contact_id)
    if not contact or not contact.is_active:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Check if contact already has a card
    existing_card = session.exec(
        select(PipelineCard)
        .where(PipelineCard.is_active == True)
        .where(PipelineCard.contact_id == contact_id)
    ).first()

    if existing_card:
        return {
            "status": "exists",
            "card_id": existing_card.id,
            "column_id": existing_card.column_id,
            "message": "Contact already in pipeline"
        }

    # Get target column
    if column_id:
        column = session.get(PipelineColumn, column_id)
        if not column or not column.is_active:
            raise HTTPException(status_code=404, detail="Column not found")
    else:
        # Get first column
        column = session.exec(
            select(PipelineColumn)
            .where(PipelineColumn.is_active == True)
            .order_by(PipelineColumn.order)
        ).first()

        if not column:
            raise HTTPException(status_code=400, detail="No columns exist. Create columns first.")

    # Get max order
    max_order = session.exec(
        select(func.max(PipelineCard.order))
        .where(PipelineCard.is_active == True)
        .where(PipelineCard.column_id == column.id)
    ).one() or -1

    # Create card
    card = PipelineCard(
        contact_id=contact_id,
        column_id=column.id,
        order=max_order + 1,
        priority=priority,
    )
    session.add(card)
    session.commit()
    session.refresh(card)

    return {
        "status": "created",
        "card_id": card.id,
        "column_id": column.id,
        "column_name": column.name
    }
