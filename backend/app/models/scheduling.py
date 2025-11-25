"""
Scheduling models - Calendar, schedules, and bookings.

This module provides:
- Schedule: Working hours and availability for professionals/resources
- Booking: Appointments and reservations
- Task: Kanban tasks for follow-ups and internal work

Key concepts:
- Professionals are Entities (category=people, template=professional)
- Services are Entities (category=products, template=service)
- Bookings link customers to services and optionally professionals
"""
from datetime import datetime, date, time
from typing import Optional
from sqlmodel import Field, SQLModel, Column, Relationship
from sqlalchemy import JSON, Text
from enum import Enum


# =============================================================================
# ENUMS
# =============================================================================

class BookingStatus(str, Enum):
    """Booking lifecycle status."""
    PENDING = "pending"          # Awaiting confirmation
    CONFIRMED = "confirmed"      # Confirmed by business
    IN_PROGRESS = "in_progress"  # Currently happening
    COMPLETED = "completed"      # Successfully completed
    CANCELLED = "cancelled"      # Cancelled by customer or business
    NO_SHOW = "no_show"          # Customer didn't show up


class TaskStatus(str, Enum):
    """Kanban task status."""
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    DONE = "done"


class TaskPriority(str, Enum):
    """Task priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskType(str, Enum):
    """Types of tasks."""
    FOLLOW_UP = "follow_up"      # Follow up with lead/customer
    LEAD = "lead"                # New lead to contact
    SUPPORT = "support"          # Support request
    INTERNAL = "internal"        # Internal task
    OTHER = "other"


# =============================================================================
# SCHEDULE MODEL
# =============================================================================

class ScheduleBase(SQLModel):
    """Base schedule fields."""
    professional_id: int = Field(
        description="Entity ID of the professional (must be category=people)"
    )
    day_of_week: Optional[int] = Field(
        default=None,
        description="Day of week (0=Monday, 6=Sunday). Null for specific date."
    )
    specific_date: Optional[date] = Field(
        default=None,
        description="Specific date override. Takes precedence over day_of_week."
    )
    start_time: time = Field(description="Start of availability window")
    end_time: time = Field(description="End of availability window")
    is_available: bool = Field(
        default=True,
        description="True for available, False for blocked/unavailable"
    )
    slot_duration_minutes: int = Field(
        default=60,
        description="Default appointment slot duration in minutes"
    )
    break_between_minutes: int = Field(
        default=0,
        description="Break time between appointments in minutes"
    )


class Schedule(ScheduleBase, table=True):
    """
    Schedule database model.

    Defines when a professional is available for bookings.
    Can be recurring (day_of_week) or specific date overrides.

    Examples:
    - Regular: day_of_week=0 (Monday), start=09:00, end=18:00
    - Holiday off: specific_date=2025-12-25, is_available=False
    - Special hours: specific_date=2025-12-24, start=09:00, end=12:00
    """
    __tablename__ = "schedules"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Metadata
    notes: Optional[str] = Field(default=None, description="Optional notes about this schedule")

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)


class ScheduleCreate(ScheduleBase):
    """Schema for creating a schedule."""
    notes: Optional[str] = None


class ScheduleUpdate(SQLModel):
    """Schema for updating a schedule."""
    day_of_week: Optional[int] = None
    specific_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_available: Optional[bool] = None
    slot_duration_minutes: Optional[int] = None
    break_between_minutes: Optional[int] = None
    notes: Optional[str] = None


class SchedulePublic(ScheduleBase):
    """Schema for public schedule response."""
    id: int
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class SchedulesPublic(SQLModel):
    """Schema for list of schedules."""
    data: list[SchedulePublic]
    count: int


# =============================================================================
# BOOKING MODEL
# =============================================================================

class BookingBase(SQLModel):
    """Base booking fields."""
    # What is being booked
    service_id: Optional[int] = Field(
        default=None,
        description="Entity ID of the service being booked"
    )
    professional_id: Optional[int] = Field(
        default=None,
        description="Entity ID of the professional (if specific)"
    )

    # Who is booking
    customer_name: str = Field(description="Customer name")
    customer_phone: Optional[str] = Field(default=None, description="Customer phone")
    customer_email: Optional[str] = Field(default=None, description="Customer email")

    # When
    booking_date: date = Field(description="Date of the booking")
    start_time: time = Field(description="Start time of the booking")
    end_time: Optional[time] = Field(default=None, description="End time (calculated from service duration if not provided)")

    # Status
    status: BookingStatus = Field(default=BookingStatus.PENDING)

    # Additional info
    notes: Optional[str] = Field(default=None, description="Customer notes or requests")
    internal_notes: Optional[str] = Field(default=None, description="Internal notes (not visible to customer)")


class Booking(BookingBase, table=True):
    """
    Booking database model.

    Represents an appointment/reservation for a service.

    Examples:
    - Service booking: service_id=5 (Haircut), professional_id=3 (John), date=2025-01-15, time=10:00
    - General appointment: service_id=null, professional_id=3, date=..., notes="Consultation"
    """
    __tablename__ = "bookings"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Reference code for customer communication
    reference_code: Optional[str] = Field(
        default=None,
        index=True,
        description="Human-readable booking reference (e.g., 'ABC123')"
    )

    # Tracking
    source: Optional[str] = Field(
        default=None,
        description="How booking was made: 'agent', 'website', 'phone', 'walk-in'"
    )
    agent_id: Optional[int] = Field(
        default=None,
        description="Agent that created the booking (if via AI)"
    )
    conversation_id: Optional[str] = Field(
        default=None,
        description="Conversation thread where booking was made"
    )

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    confirmed_at: Optional[datetime] = Field(default=None)
    cancelled_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)

    # Soft delete
    is_active: bool = Field(default=True)

    # Flexible extra data
    extra_data: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
        description="Additional booking data"
    )


class BookingCreate(BookingBase):
    """Schema for creating a booking."""
    source: Optional[str] = None
    agent_id: Optional[int] = None
    conversation_id: Optional[str] = None
    extra_data: Optional[dict] = None


class BookingUpdate(SQLModel):
    """Schema for updating a booking."""
    service_id: Optional[int] = None
    professional_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    booking_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    status: Optional[BookingStatus] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    extra_data: Optional[dict] = None


class BookingPublic(BookingBase):
    """Schema for public booking response."""
    id: int
    reference_code: Optional[str] = None
    source: Optional[str] = None
    agent_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    confirmed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    extra_data: Optional[dict] = None


class BookingsPublic(SQLModel):
    """Schema for list of bookings."""
    data: list[BookingPublic]
    count: int


# =============================================================================
# TASK MODEL (KANBAN)
# =============================================================================

class TaskBase(SQLModel):
    """Base task fields."""
    title: str = Field(description="Task title")
    description: Optional[str] = Field(default=None, sa_column=Column(Text))

    # Classification
    task_type: TaskType = Field(default=TaskType.FOLLOW_UP)
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)
    status: TaskStatus = Field(default=TaskStatus.TODO)

    # Assignment
    assigned_to: Optional[int] = Field(
        default=None,
        description="User ID of assignee"
    )

    # Timing
    due_date: Optional[date] = Field(default=None)

    # Related records
    customer_name: Optional[str] = Field(default=None)
    customer_phone: Optional[str] = Field(default=None)
    customer_email: Optional[str] = Field(default=None)
    booking_id: Optional[int] = Field(default=None, description="Related booking if any")


class Task(TaskBase, table=True):
    """
    Task database model for kanban board.

    Used for:
    - Lead follow-ups
    - Support requests
    - Internal tasks
    - Automated reminders from agents
    """
    __tablename__ = "tasks"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Tracking
    source: Optional[str] = Field(
        default=None,
        description="How task was created: 'agent', 'manual', 'automation'"
    )
    agent_id: Optional[int] = Field(
        default=None,
        description="Agent that created the task"
    )
    conversation_id: Optional[str] = Field(
        default=None,
        description="Related conversation thread"
    )

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(default=None)

    # Soft delete
    is_active: bool = Field(default=True)

    # Flexible extra data
    extra_data: dict = Field(
        default_factory=dict,
        sa_column=Column(JSON),
        description="Additional task data"
    )


class TaskCreate(TaskBase):
    """Schema for creating a task."""
    source: Optional[str] = None
    agent_id: Optional[int] = None
    conversation_id: Optional[str] = None
    extra_data: Optional[dict] = None


class TaskUpdate(SQLModel):
    """Schema for updating a task."""
    title: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[TaskType] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    assigned_to: Optional[int] = None
    due_date: Optional[date] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    booking_id: Optional[int] = None
    extra_data: Optional[dict] = None


class TaskPublic(TaskBase):
    """Schema for public task response."""
    id: int
    source: Optional[str] = None
    agent_id: Optional[int] = None
    conversation_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    extra_data: dict = {}


class TasksPublic(SQLModel):
    """Schema for list of tasks."""
    data: list[TaskPublic]
    count: int


# =============================================================================
# AVAILABILITY QUERY HELPERS
# =============================================================================

class TimeSlot(SQLModel):
    """A single available time slot."""
    start: time
    end: time
    professional_id: Optional[int] = None
    professional_name: Optional[str] = None


class AvailabilityQuery(SQLModel):
    """Query parameters for checking availability."""
    service_id: Optional[int] = None
    professional_id: Optional[int] = None
    date_from: date
    date_to: Optional[date] = None  # Defaults to date_from
    duration_minutes: Optional[int] = None  # Overrides service duration


class AvailabilityResponse(SQLModel):
    """Response with available time slots."""
    date: date
    slots: list[TimeSlot]
    service_name: Optional[str] = None
