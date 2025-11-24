"""Entity API routes - CRUD for products, services, policies, etc."""

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select

from app.api.deps import SessionDep
from app.models.entity import Entity, EntityCreate, EntityUpdate, EntityPublic, EntitiesPublic

router = APIRouter()


@router.get("", response_model=EntitiesPublic)
def get_entities(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
    type: Optional[str] = Query(None, description="Filter by entity type"),
    agent_id: Optional[str] = Query(None, description="Filter by agent ID"),
) -> Any:
    """Get all entities, optionally filtered by type or agent."""
    query = select(Entity).where(Entity.is_active == True)

    if type:
        query = query.where(Entity.type == type)
    if agent_id:
        query = query.where(Entity.agent_id == agent_id)

    query = query.offset(skip).limit(limit)
    entities = session.exec(query).all()

    return EntitiesPublic(data=entities, count=len(entities))


@router.post("", response_model=EntityPublic, status_code=201)
def create_entity(*, session: SessionDep, entity_in: EntityCreate) -> Any:
    """Create a new entity."""
    entity = Entity(
        name=entity_in.name,
        type=entity_in.type,
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


@router.get("/types/list", response_model=list[str])
def get_entity_types(session: SessionDep) -> Any:
    """Get list of all entity types in use."""
    query = select(Entity.type).where(Entity.is_active == True).distinct()
    types = session.exec(query).all()
    return types
