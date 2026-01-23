"""Operations API routes - Booking configs, inventory, and entity links."""

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import select, func
from sqlalchemy import text

from app.api.deps import SessionDep, CurrentUser
from app.models.entity import Entity
from app.models.operations import (
    EntityLink, EntityLinkCreate, EntityLinkPublic,
    BookingConfig, BookingConfigCreate, BookingConfigUpdate, BookingConfigPublic,
    Inventory, InventoryCreate, InventoryUpdate, InventoryPublic,
)

router = APIRouter()


def _has_capability(capability: str):
    """Create a SQL filter for checking if an entity has a specific capability in its JSON array."""
    # Use PostgreSQL's @> (contains) operator for JSONB arrays
    return text(f"capabilities::jsonb @> '\"{capability}\"'")


# =============================================================================
# ENTITY LINKS (Many-to-Many relationships)
# =============================================================================

class EntityLinksPublic(BaseModel):
    """Response for list of entity links."""
    data: list[EntityLinkPublic]
    count: int


@router.get("/entity-links", response_model=EntityLinksPublic)
def get_entity_links(
    session: SessionDep,
    current_user: CurrentUser,
    source_entity_id: Optional[int] = Query(None, description="Filter by source entity"),
    target_entity_id: Optional[int] = Query(None, description="Filter by target entity"),
    relationship_type: Optional[str] = Query(None, description="Filter by relationship type"),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Get entity links, optionally filtered."""
    query = select(EntityLink)

    if source_entity_id:
        query = query.where(EntityLink.source_entity_id == source_entity_id)
    if target_entity_id:
        query = query.where(EntityLink.target_entity_id == target_entity_id)
    if relationship_type:
        query = query.where(EntityLink.relationship_type == relationship_type)

    query = query.order_by(EntityLink.created_at.desc())
    query = query.offset(skip).limit(limit)
    links = session.exec(query).all()

    # Count
    count_query = select(func.count(EntityLink.id))
    if source_entity_id:
        count_query = count_query.where(EntityLink.source_entity_id == source_entity_id)
    if target_entity_id:
        count_query = count_query.where(EntityLink.target_entity_id == target_entity_id)
    if relationship_type:
        count_query = count_query.where(EntityLink.relationship_type == relationship_type)
    total = session.exec(count_query).one()

    return EntityLinksPublic(data=links, count=total)


@router.post("/entity-links", response_model=EntityLinkPublic, status_code=201)
def create_entity_link(*, session: SessionDep, current_user: CurrentUser, link_in: EntityLinkCreate) -> Any:
    """Create a new entity link."""
    # Verify both entities exist
    source = session.get(Entity, link_in.source_entity_id)
    if not source or not source.is_active:
        raise HTTPException(status_code=404, detail="Source entity not found")

    target = session.get(Entity, link_in.target_entity_id)
    if not target or not target.is_active:
        raise HTTPException(status_code=404, detail="Target entity not found")

    # Check for duplicate
    existing = session.exec(
        select(EntityLink).where(
            EntityLink.source_entity_id == link_in.source_entity_id,
            EntityLink.target_entity_id == link_in.target_entity_id,
            EntityLink.relationship_type == link_in.relationship_type,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Link already exists")

    link = EntityLink(**link_in.model_dump())
    session.add(link)
    session.commit()
    session.refresh(link)
    return link


@router.delete("/entity-links/{link_id}", status_code=204)
def delete_entity_link(session: SessionDep, current_user: CurrentUser, link_id: int) -> None:
    """Delete an entity link."""
    link = session.get(EntityLink, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    session.delete(link)
    session.commit()


# =============================================================================
# BOOKING CONFIGS (Settings for bookable entities)
# =============================================================================

class BookingConfigsPublic(BaseModel):
    """Response for list of booking configs."""
    data: list[BookingConfigPublic]
    count: int


@router.get("/booking-configs", response_model=BookingConfigsPublic)
def get_booking_configs(
    session: SessionDep,
    current_user: CurrentUser,
    entity_id: Optional[int] = Query(None, description="Filter by entity ID"),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Get booking configs, optionally filtered by entity."""
    query = select(BookingConfig)

    if entity_id:
        query = query.where(BookingConfig.entity_id == entity_id)

    query = query.order_by(BookingConfig.updated_at.desc())
    query = query.offset(skip).limit(limit)
    configs = session.exec(query).all()

    # Count
    count_query = select(func.count(BookingConfig.id))
    if entity_id:
        count_query = count_query.where(BookingConfig.entity_id == entity_id)
    total = session.exec(count_query).one()

    return BookingConfigsPublic(data=configs, count=total)


@router.get("/booking-configs/{config_id}", response_model=BookingConfigPublic)
def get_booking_config(session: SessionDep, current_user: CurrentUser, config_id: int) -> Any:
    """Get booking config by ID."""
    config = session.get(BookingConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Booking config not found")
    return config


@router.post("/booking-configs", response_model=BookingConfigPublic, status_code=201)
def create_booking_config(*, session: SessionDep, current_user: CurrentUser, config_in: BookingConfigCreate) -> Any:
    """Create a new booking config."""
    # Verify entity exists
    entity = session.get(Entity, config_in.entity_id)
    if not entity or not entity.is_active:
        raise HTTPException(status_code=404, detail="Entity not found")

    # Check for existing config
    existing = session.exec(
        select(BookingConfig).where(BookingConfig.entity_id == config_in.entity_id)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Booking config already exists for this entity")

    config = BookingConfig(**config_in.model_dump())
    session.add(config)
    session.commit()
    session.refresh(config)
    return config


@router.patch("/booking-configs/{config_id}", response_model=BookingConfigPublic)
def update_booking_config(
    *, session: SessionDep, current_user: CurrentUser, config_id: int, config_in: BookingConfigUpdate
) -> Any:
    """Update a booking config."""
    config = session.get(BookingConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Booking config not found")

    update_data = config_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)

    config.updated_at = datetime.utcnow()
    session.add(config)
    session.commit()
    session.refresh(config)
    return config


@router.delete("/booking-configs/{config_id}", status_code=204)
def delete_booking_config(session: SessionDep, current_user: CurrentUser, config_id: int) -> None:
    """Delete a booking config."""
    config = session.get(BookingConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Booking config not found")

    session.delete(config)
    session.commit()


# =============================================================================
# INVENTORY (Stock for stockable entities)
# =============================================================================

class InventoriesPublic(BaseModel):
    """Response for list of inventories."""
    data: list[InventoryPublic]
    count: int


@router.get("/inventory", response_model=InventoriesPublic)
def get_inventories(
    session: SessionDep,
    current_user: CurrentUser,
    entity_id: Optional[int] = Query(None, description="Filter by entity ID"),
    low_stock: Optional[bool] = Query(None, description="Filter by low stock status"),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Get inventories, optionally filtered by entity or low stock status."""
    query = select(Inventory)

    if entity_id:
        query = query.where(Inventory.entity_id == entity_id)

    query = query.order_by(Inventory.updated_at.desc())
    query = query.offset(skip).limit(limit)
    inventories = session.exec(query).all()

    # Filter by low_stock in memory since it's a computed property
    if low_stock is not None:
        inventories = [
            inv for inv in inventories
            if (inv.quantity <= inv.low_stock_threshold) == low_stock
        ]

    # Count (without low_stock filter for simplicity)
    count_query = select(func.count(Inventory.id))
    if entity_id:
        count_query = count_query.where(Inventory.entity_id == entity_id)
    total = session.exec(count_query).one()

    return InventoriesPublic(data=inventories, count=total)


@router.get("/inventory/{inventory_id}", response_model=InventoryPublic)
def get_inventory(session: SessionDep, current_user: CurrentUser, inventory_id: int) -> Any:
    """Get inventory by ID."""
    inventory = session.get(Inventory, inventory_id)
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")
    return inventory


@router.post("/inventory", response_model=InventoryPublic, status_code=201)
def create_inventory(*, session: SessionDep, current_user: CurrentUser, inventory_in: InventoryCreate) -> Any:
    """Create a new inventory record."""
    # Verify entity exists
    entity = session.get(Entity, inventory_in.entity_id)
    if not entity or not entity.is_active:
        raise HTTPException(status_code=404, detail="Entity not found")

    # Check for existing inventory
    existing = session.exec(
        select(Inventory).where(Inventory.entity_id == inventory_in.entity_id)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Inventory already exists for this entity")

    inventory = Inventory(**inventory_in.model_dump())
    session.add(inventory)
    session.commit()
    session.refresh(inventory)
    return inventory


@router.patch("/inventory/{inventory_id}", response_model=InventoryPublic)
def update_inventory(
    *, session: SessionDep, current_user: CurrentUser, inventory_id: int, inventory_in: InventoryUpdate
) -> Any:
    """Update an inventory record."""
    inventory = session.get(Inventory, inventory_id)
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")

    update_data = inventory_in.model_dump(exclude_unset=True)

    # Track quantity changes for last_restocked_at
    if "quantity" in update_data and update_data["quantity"] > inventory.quantity:
        inventory.last_restocked_at = datetime.utcnow()

    for key, value in update_data.items():
        setattr(inventory, key, value)

    inventory.updated_at = datetime.utcnow()
    session.add(inventory)
    session.commit()
    session.refresh(inventory)
    return inventory


@router.delete("/inventory/{inventory_id}", status_code=204)
def delete_inventory(session: SessionDep, current_user: CurrentUser, inventory_id: int) -> None:
    """Delete an inventory record."""
    inventory = session.get(Inventory, inventory_id)
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")

    session.delete(inventory)
    session.commit()


# =============================================================================
# COMBINED VIEWS (For operations pages)
# =============================================================================

class ServiceWithConfig(BaseModel):
    """Service entity with its booking config."""
    entity: dict
    booking_config: Optional[BookingConfigPublic] = None
    providers: list[dict] = []  # Entities that provide this service


class ProfessionalWithSchedule(BaseModel):
    """Professional entity with schedule info."""
    entity: dict
    services: list[dict] = []  # Services this professional provides


class ProductWithInventory(BaseModel):
    """Product entity with its inventory."""
    entity: dict
    inventory: Optional[InventoryPublic] = None


@router.get("/services", response_model=list[ServiceWithConfig])
def get_services_with_configs(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Get all bookable entities with their booking configs and providers."""
    # Get entities with bookable capability
    entities = session.exec(
        select(Entity)
        .where(Entity.is_active == True)
        .where(_has_capability("bookable"))
        .order_by(Entity.updated_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()

    results = []
    for entity in entities:
        # Get booking config
        config = session.exec(
            select(BookingConfig).where(BookingConfig.entity_id == entity.id)
        ).first()

        # Get providers (entities that provide this service via "provides" link)
        provider_links = session.exec(
            select(EntityLink)
            .where(EntityLink.source_entity_id == entity.id)
            .where(EntityLink.relationship_type == "provides")
        ).all()

        providers = []
        for link in provider_links:
            provider = session.get(Entity, link.target_entity_id)
            if provider and provider.is_active:
                providers.append({
                    "id": provider.id,
                    "name": provider.name,
                    "category": provider.category,
                })

        results.append(ServiceWithConfig(
            entity={
                "id": entity.id,
                "name": entity.name,
                "category": entity.category,
                "data": entity.data,
                "capabilities": entity.capabilities,
            },
            booking_config=config,
            providers=providers,
        ))

    return results


@router.get("/professionals", response_model=list[ProfessionalWithSchedule])
def get_professionals_with_schedules(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Get all schedulable entities with their services."""
    # Get entities with schedulable capability
    entities = session.exec(
        select(Entity)
        .where(Entity.is_active == True)
        .where(_has_capability("schedulable"))
        .order_by(Entity.updated_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()

    results = []
    for entity in entities:
        # Get services this professional provides (they are the target)
        service_links = session.exec(
            select(EntityLink)
            .where(EntityLink.target_entity_id == entity.id)
            .where(EntityLink.relationship_type == "provides")
        ).all()

        services = []
        for link in service_links:
            service = session.get(Entity, link.source_entity_id)
            if service and service.is_active:
                services.append({
                    "id": service.id,
                    "name": service.name,
                    "category": service.category,
                    "data": service.data,
                })

        results.append(ProfessionalWithSchedule(
            entity={
                "id": entity.id,
                "name": entity.name,
                "category": entity.category,
                "data": entity.data,
                "capabilities": entity.capabilities,
            },
            services=services,
        ))

    return results


@router.get("/products", response_model=list[ProductWithInventory])
def get_products_with_inventory(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    low_stock_only: bool = False,
) -> Any:
    """Get all stockable entities with their inventory."""
    # Get entities with stockable capability
    entities = session.exec(
        select(Entity)
        .where(Entity.is_active == True)
        .where(_has_capability("stockable"))
        .order_by(Entity.updated_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()

    results = []
    for entity in entities:
        # Get inventory
        inventory = session.exec(
            select(Inventory).where(Inventory.entity_id == entity.id)
        ).first()

        # Skip if filtering by low_stock_only and not low stock
        if low_stock_only and inventory:
            if inventory.quantity > inventory.low_stock_threshold:
                continue

        results.append(ProductWithInventory(
            entity={
                "id": entity.id,
                "name": entity.name,
                "category": entity.category,
                "data": entity.data,
                "capabilities": entity.capabilities,
            },
            inventory=inventory,
        ))

    return results
