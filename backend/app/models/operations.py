"""
Operations models - Operational extensions for entities.

These tables extend entities with operational capabilities:
- EntityLink: relationships between entities (service → professional)
- BookingConfig: settings for bookable entities
- Inventory: stock levels for stockable entities

Capabilities:
- bookable: can be booked (services, consultations)
- schedulable: has time-based availability (professionals, rooms)
- stockable: has inventory (physical products)
"""
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON, UniqueConstraint


# =============================================================================
# ENTITY LINK (Many-to-Many relationships)
# =============================================================================

class EntityLinkBase(SQLModel):
    """Base entity link fields."""
    source_entity_id: int = Field(
        foreign_key="entities.id",
        description="Source entity (e.g., service)"
    )
    target_entity_id: int = Field(
        foreign_key="entities.id",
        description="Target entity (e.g., professional)"
    )
    relationship_type: str = Field(
        default="provides",
        description="Type: 'provides' (professional provides service), 'requires', 'includes'"
    )


class EntityLink(EntityLinkBase, table=True):
    """
    Entity relationship table.

    Examples:
    - Service "Consulta" --provides--> Professional "João" (João provides Consulta)
    - Product "Kit Violão" --includes--> Product "Violão", Product "Capa"
    """
    __tablename__ = "entity_links"
    __table_args__ = (
        UniqueConstraint('source_entity_id', 'target_entity_id', 'relationship_type', name='uq_entity_link'),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EntityLinkCreate(EntityLinkBase):
    """Schema for creating an entity link."""
    pass


class EntityLinkPublic(EntityLinkBase):
    """Schema for public entity link response."""
    id: int
    created_at: datetime


# =============================================================================
# BOOKING CONFIG (Settings for bookable entities)
# =============================================================================

class BookingConfigBase(SQLModel):
    """Base booking config fields."""
    entity_id: int = Field(
        foreign_key="entities.id",
        description="Entity this config belongs to (must have 'bookable' capability)"
    )
    duration_minutes: int = Field(default=60, description="Default appointment duration")
    buffer_minutes: int = Field(default=0, description="Buffer time between appointments")
    max_per_day: Optional[int] = Field(default=None, description="Max bookings per day (null=unlimited)")
    requires_confirmation: bool = Field(default=False, description="Requires manual confirmation")
    allowed_days: Optional[list[int]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Allowed days of week [0-6], null=all days"
    )
    advance_booking_days: int = Field(default=30, description="How far ahead can book")
    min_notice_hours: int = Field(default=1, description="Minimum hours notice for booking")


class BookingConfig(BookingConfigBase, table=True):
    """
    Booking configuration for bookable entities.

    One-to-one with Entity. Created when entity gets 'bookable' capability.
    """
    __tablename__ = "booking_configs"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class BookingConfigCreate(BookingConfigBase):
    """Schema for creating booking config."""
    pass


class BookingConfigUpdate(SQLModel):
    """Schema for updating booking config."""
    duration_minutes: Optional[int] = None
    buffer_minutes: Optional[int] = None
    max_per_day: Optional[int] = None
    requires_confirmation: Optional[bool] = None
    allowed_days: Optional[list[int]] = None
    advance_booking_days: Optional[int] = None
    min_notice_hours: Optional[int] = None


class BookingConfigPublic(BookingConfigBase):
    """Schema for public booking config response."""
    id: int
    created_at: datetime
    updated_at: datetime


# =============================================================================
# INVENTORY (Stock for stockable entities)
# =============================================================================

class InventoryBase(SQLModel):
    """Base inventory fields."""
    entity_id: int = Field(
        foreign_key="entities.id",
        description="Entity this inventory belongs to (must have 'stockable' capability)"
    )
    quantity: int = Field(default=0, description="Current stock quantity")
    reserved_quantity: int = Field(default=0, description="Quantity reserved (pending orders)")
    low_stock_threshold: int = Field(default=5, description="Alert when stock falls below")
    sku: Optional[str] = Field(default=None, description="Stock keeping unit code")


class Inventory(InventoryBase, table=True):
    """
    Inventory for stockable entities.

    One-to-one with Entity. Created when entity gets 'stockable' capability.
    """
    __tablename__ = "inventory"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Tracking
    last_restocked_at: Optional[datetime] = Field(default=None)
    last_sold_at: Optional[datetime] = Field(default=None)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class InventoryCreate(InventoryBase):
    """Schema for creating inventory."""
    pass


class InventoryUpdate(SQLModel):
    """Schema for updating inventory."""
    quantity: Optional[int] = None
    reserved_quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    sku: Optional[str] = None


class InventoryPublic(InventoryBase):
    """Schema for public inventory response."""
    id: int
    last_restocked_at: Optional[datetime] = None
    last_sold_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    @property
    def available_quantity(self) -> int:
        """Stock available for sale (total - reserved)."""
        return self.quantity - self.reserved_quantity

    @property
    def is_low_stock(self) -> bool:
        """Whether stock is below threshold."""
        return self.quantity <= self.low_stock_threshold
