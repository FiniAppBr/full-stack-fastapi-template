"""
Labels API - CRUD for labels and chunk-label management.

User-scoped: each user can only see/manage their own labels.

Endpoints:
- GET /labels - List user's labels with coverage stats
- POST /labels - Create a new label
- GET /labels/{id} - Get label details with chunks
- PATCH /labels/{id} - Update label
- DELETE /labels/{id} - Delete label (if no chunks attached)
- GET /labels/{id}/chunks - Get chunks with this label
- POST /labels/{id}/chunks - Add label to chunks
- DELETE /labels/{id}/chunks - Remove label from chunks
"""
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import select, func
from sqlalchemy import and_, delete

from app.api.deps import CurrentUser, SessionDep
from app.models import Label, ChunkLabel, KnowledgeBase


router = APIRouter()


# ============================================================================
# Schemas
# ============================================================================

class LabelCreate(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    parent_id: Optional[int] = None


class LabelUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None
    deprecated: Optional[bool] = None


class LabelResponse(BaseModel):
    id: int
    name: str
    category: str
    description: Optional[str]
    parent_id: Optional[int]
    deprecated: bool
    created_at: datetime
    chunk_count: int = 0
    children: List["LabelResponse"] = []


class LabelListResponse(BaseModel):
    labels: List[LabelResponse]
    total: int
    categories: dict


class ChunkBrief(BaseModel):
    id: int
    title: Optional[str]
    content_preview: str
    labels: List[str]


class ChunkLabelsUpdate(BaseModel):
    chunk_ids: List[int]


# ============================================================================
# Helper
# ============================================================================

def get_user_label(session, label_id: int, user_id: UUID) -> Label:
    """Get label ensuring it belongs to user."""
    label = session.get(Label, label_id)
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    if label.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this label")
    return label


# ============================================================================
# Label CRUD
# ============================================================================

@router.get("", response_model=LabelListResponse)
def list_labels(
    session: SessionDep,
    current_user: CurrentUser,
    category: Optional[str] = Query(None, description="Filter by category"),
    include_deprecated: bool = Query(False, description="Include deprecated labels"),
    include_children: bool = Query(True, description="Include child labels nested"),
) -> Any:
    """List user's labels with chunk counts."""
    # Base query - filter by user
    query = select(Label).where(Label.user_id == current_user.id)
    if category:
        query = query.where(Label.category == category)
    if not include_deprecated:
        query = query.where(Label.deprecated == False)

    labels = session.exec(query.order_by(Label.category, Label.name)).all()

    # Get chunk counts for user's labels
    label_ids = [l.id for l in labels]
    if label_ids:
        count_query = select(
            ChunkLabel.label_id,
            func.count(ChunkLabel.chunk_id).label("count")
        ).where(ChunkLabel.label_id.in_(label_ids)).group_by(ChunkLabel.label_id)
        counts = {row[0]: row[1] for row in session.exec(count_query)}
    else:
        counts = {}

    # Build response
    label_map = {}
    root_labels = []

    for label in labels:
        label_resp = LabelResponse(
            id=label.id,
            name=label.name,
            category=label.category,
            description=label.description,
            parent_id=label.parent_id,
            deprecated=label.deprecated,
            created_at=label.created_at,
            chunk_count=counts.get(label.id, 0),
            children=[],
        )
        label_map[label.id] = label_resp

        if label.parent_id is None:
            root_labels.append(label_resp)

    # Nest children if requested
    if include_children:
        for label in labels:
            if label.parent_id and label.parent_id in label_map:
                label_map[label.parent_id].children.append(label_map[label.id])
        result_labels = root_labels
    else:
        result_labels = list(label_map.values())

    # Category counts
    category_counts = {}
    for label in labels:
        category_counts[label.category] = category_counts.get(label.category, 0) + 1

    return LabelListResponse(
        labels=result_labels,
        total=len(labels),
        categories=category_counts,
    )


@router.post("", response_model=LabelResponse)
def create_label(session: SessionDep, current_user: CurrentUser, data: LabelCreate) -> Any:
    """Create a new label for the current user."""
    # Validate category
    if data.category not in Label.CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {Label.CATEGORIES}"
        )

    # Check for duplicate name (per user)
    existing = session.exec(
        select(Label).where(
            and_(Label.user_id == current_user.id, Label.name == data.name)
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Label '{data.name}' already exists")

    # Validate parent if provided (must belong to same user)
    if data.parent_id:
        parent = get_user_label(session, data.parent_id, current_user.id)

    label = Label(
        user_id=current_user.id,
        name=data.name,
        category=data.category,
        description=data.description,
        parent_id=data.parent_id,
    )
    session.add(label)
    session.commit()
    session.refresh(label)

    return LabelResponse(
        id=label.id,
        name=label.name,
        category=label.category,
        description=label.description,
        parent_id=label.parent_id,
        deprecated=label.deprecated,
        created_at=label.created_at,
        chunk_count=0,
    )


@router.get("/{label_id}", response_model=LabelResponse)
def get_label(session: SessionDep, current_user: CurrentUser, label_id: int) -> Any:
    """Get label details."""
    label = get_user_label(session, label_id, current_user.id)

    # Get chunk count
    count = session.exec(
        select(func.count(ChunkLabel.chunk_id)).where(ChunkLabel.label_id == label_id)
    ).one()

    # Get children (same user)
    children = session.exec(
        select(Label).where(
            and_(Label.parent_id == label_id, Label.user_id == current_user.id)
        )
    ).all()

    return LabelResponse(
        id=label.id,
        name=label.name,
        category=label.category,
        description=label.description,
        parent_id=label.parent_id,
        deprecated=label.deprecated,
        created_at=label.created_at,
        chunk_count=count,
        children=[
            LabelResponse(
                id=c.id, name=c.name, category=c.category,
                description=c.description, parent_id=c.parent_id,
                deprecated=c.deprecated, created_at=c.created_at,
            )
            for c in children
        ],
    )


@router.patch("/{label_id}", response_model=LabelResponse)
def update_label(
    session: SessionDep, current_user: CurrentUser, label_id: int, data: LabelUpdate
) -> Any:
    """Update a label."""
    label = get_user_label(session, label_id, current_user.id)

    if data.name is not None:
        # Check for duplicate (per user)
        existing = session.exec(
            select(Label).where(
                and_(Label.user_id == current_user.id, Label.name == data.name, Label.id != label_id)
            )
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Label '{data.name}' already exists")
        label.name = data.name

    if data.category is not None:
        if data.category not in Label.CATEGORIES:
            raise HTTPException(status_code=400, detail=f"Invalid category")
        label.category = data.category

    if data.description is not None:
        label.description = data.description

    if data.parent_id is not None:
        if data.parent_id != 0:
            parent = get_user_label(session, data.parent_id, current_user.id)
            label.parent_id = data.parent_id
        else:
            label.parent_id = None

    if data.deprecated is not None:
        label.deprecated = data.deprecated

    label.updated_at = datetime.utcnow()
    session.commit()
    session.refresh(label)

    count = session.exec(
        select(func.count(ChunkLabel.chunk_id)).where(ChunkLabel.label_id == label_id)
    ).one()

    return LabelResponse(
        id=label.id,
        name=label.name,
        category=label.category,
        description=label.description,
        parent_id=label.parent_id,
        deprecated=label.deprecated,
        created_at=label.created_at,
        chunk_count=count,
    )


@router.delete("/{label_id}")
def delete_label(
    session: SessionDep, current_user: CurrentUser, label_id: int, force: bool = Query(False)
) -> Any:
    """Delete a label. Fails if chunks are attached unless force=true."""
    label = get_user_label(session, label_id, current_user.id)

    # Check for attached chunks
    chunk_count = session.exec(
        select(func.count(ChunkLabel.chunk_id)).where(ChunkLabel.label_id == label_id)
    ).one()

    if chunk_count > 0 and not force:
        raise HTTPException(
            status_code=400,
            detail=f"Label has {chunk_count} chunks attached. Use force=true to delete anyway."
        )

    # Delete chunk associations
    session.execute(delete(ChunkLabel).where(ChunkLabel.label_id == label_id))

    # Update children to remove parent reference
    children = session.exec(
        select(Label).where(and_(Label.parent_id == label_id, Label.user_id == current_user.id))
    ).all()
    for child in children:
        child.parent_id = None

    session.delete(label)
    session.commit()

    return {"message": f"Label '{label.name}' deleted", "chunks_affected": chunk_count}


# ============================================================================
# Chunk-Label Management
# ============================================================================

@router.get("/{label_id}/chunks", response_model=List[ChunkBrief])
def get_label_chunks(
    session: SessionDep, current_user: CurrentUser, label_id: int, limit: int = Query(50)
) -> Any:
    """Get chunks that have this label."""
    label = get_user_label(session, label_id, current_user.id)

    # Get chunks via junction table
    chunks = session.exec(
        select(KnowledgeBase)
        .join(ChunkLabel, ChunkLabel.chunk_id == KnowledgeBase.id)
        .where(ChunkLabel.label_id == label_id)
        .limit(limit)
    ).all()

    return [
        ChunkBrief(
            id=c.id,
            title=c.title,
            content_preview=c.content[:100] + "..." if len(c.content) > 100 else c.content,
            labels=c.labels or [],
        )
        for c in chunks
    ]


@router.post("/{label_id}/chunks")
def add_label_to_chunks(
    session: SessionDep, current_user: CurrentUser, label_id: int, data: ChunkLabelsUpdate
) -> Any:
    """Add this label to multiple chunks."""
    label = get_user_label(session, label_id, current_user.id)

    added = 0
    for chunk_id in data.chunk_ids:
        chunk = session.get(KnowledgeBase, chunk_id)
        if not chunk:
            continue

        # Check if already linked
        existing = session.exec(
            select(ChunkLabel).where(
                and_(ChunkLabel.chunk_id == chunk_id, ChunkLabel.label_id == label_id)
            )
        ).first()

        if not existing:
            link = ChunkLabel(chunk_id=chunk_id, label_id=label_id)
            session.add(link)

            # Also update the legacy labels array for backwards compatibility
            if chunk.labels is None:
                chunk.labels = []
            if label.name not in chunk.labels:
                chunk.labels = chunk.labels + [label.name]

            added += 1

    session.commit()
    return {"message": f"Added label to {added} chunks", "label": label.name}


@router.delete("/{label_id}/chunks")
def remove_label_from_chunks(
    session: SessionDep, current_user: CurrentUser, label_id: int, data: ChunkLabelsUpdate
) -> Any:
    """Remove this label from multiple chunks."""
    label = get_user_label(session, label_id, current_user.id)

    removed = 0
    for chunk_id in data.chunk_ids:
        result = session.execute(
            delete(ChunkLabel).where(
                and_(ChunkLabel.chunk_id == chunk_id, ChunkLabel.label_id == label_id)
            )
        )
        if result.rowcount > 0:
            removed += 1

            # Also update legacy array
            chunk = session.get(KnowledgeBase, chunk_id)
            if chunk and chunk.labels and label.name in chunk.labels:
                chunk.labels = [l for l in chunk.labels if l != label.name]

    session.commit()
    return {"message": f"Removed label from {removed} chunks", "label": label.name}
