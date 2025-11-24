"""Entity API routes - CRUD for products, services, policies, etc."""

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select, func

from app.api.deps import SessionDep
from app.models.entity import Entity, EntityCreate, EntityUpdate, EntityPublic, EntitiesPublic, ENTITY_CATEGORIES

router = APIRouter()


@router.get("/stats")
def get_entity_stats(session: SessionDep) -> Any:
    """Get entity counts by category for dashboard."""
    stats = {}
    for category in ENTITY_CATEGORIES:
        count = session.exec(
            select(func.count(Entity.id))
            .where(Entity.is_active == True)
            .where(Entity.category == category)
        ).one()
        stats[category] = count

    # Total count
    total = session.exec(
        select(func.count(Entity.id)).where(Entity.is_active == True)
    ).one()
    stats["total"] = total

    return stats


@router.get("/recent", response_model=EntitiesPublic)
def get_recent_entities(
    session: SessionDep,
    limit: int = 5,
) -> Any:
    """Get most recently updated entities."""
    query = (
        select(Entity)
        .where(Entity.is_active == True)
        .order_by(Entity.updated_at.desc())
        .limit(limit)
    )
    entities = session.exec(query).all()
    return EntitiesPublic(data=entities, count=len(entities))


@router.get("", response_model=EntitiesPublic)
def get_entities(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = Query(None, description="Filter by entity category"),
    template: Optional[str] = Query(None, description="Filter by template ID"),
    agent_id: Optional[str] = Query(None, description="Filter by agent ID"),
    search: Optional[str] = Query(None, description="Search by name"),
) -> Any:
    """Get all entities, optionally filtered by category, template, agent, or search."""
    query = select(Entity).where(Entity.is_active == True)

    if category:
        query = query.where(Entity.category == category)
    if template:
        query = query.where(Entity.template == template)
    if agent_id:
        query = query.where(Entity.agent_id == agent_id)
    if search:
        query = query.where(Entity.name.ilike(f"%{search}%"))

    # Order by most recent first
    query = query.order_by(Entity.updated_at.desc())
    query = query.offset(skip).limit(limit)
    entities = session.exec(query).all()

    # Get total count for pagination
    count_query = select(func.count(Entity.id)).where(Entity.is_active == True)
    if category:
        count_query = count_query.where(Entity.category == category)
    if template:
        count_query = count_query.where(Entity.template == template)
    if agent_id:
        count_query = count_query.where(Entity.agent_id == agent_id)
    if search:
        count_query = count_query.where(Entity.name.ilike(f"%{search}%"))
    total = session.exec(count_query).one()

    return EntitiesPublic(data=entities, count=total)


@router.post("", response_model=EntityPublic, status_code=201)
def create_entity(*, session: SessionDep, entity_in: EntityCreate) -> Any:
    """Create a new entity."""
    entity = Entity(
        name=entity_in.name,
        category=entity_in.category,
        template=entity_in.template,
        data=entity_in.data,
        description=entity_in.description,
        agent_id=entity_in.agent_id,
    )
    session.add(entity)
    session.commit()
    session.refresh(entity)
    return entity


@router.get("/{entity_id}", response_model=EntityPublic)
def get_entity(session: SessionDep, entity_id: int) -> Any:
    """Get entity by ID."""
    entity = session.get(Entity, entity_id)
    if not entity or not entity.is_active:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity


@router.patch("/{entity_id}", response_model=EntityPublic)
def update_entity(
    *, session: SessionDep, entity_id: int, entity_in: EntityUpdate
) -> Any:
    """Update an entity."""
    entity = session.get(Entity, entity_id)
    if not entity or not entity.is_active:
        raise HTTPException(status_code=404, detail="Entity not found")

    update_data = entity_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(entity, key, value)

    entity.updated_at = datetime.utcnow()
    session.add(entity)
    session.commit()
    session.refresh(entity)
    return entity


@router.delete("/{entity_id}", status_code=204)
def delete_entity(session: SessionDep, entity_id: int) -> None:
    """Soft delete an entity."""
    entity = session.get(Entity, entity_id)
    if not entity or not entity.is_active:
        raise HTTPException(status_code=404, detail="Entity not found")

    entity.is_active = False
    entity.updated_at = datetime.utcnow()
    session.add(entity)
    session.commit()


@router.get("/categories/list", response_model=list[str])
def get_entity_categories() -> Any:
    """Get list of all valid entity categories."""
    return ENTITY_CATEGORIES
