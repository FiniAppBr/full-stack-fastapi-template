"""
Scheduling API routes - Calendars, schedules, bookings, and tasks.

Provides CRUD operations for:
- Schedules: Professional availability
- Bookings: Customer appointments
- Tasks: Kanban tasks for follow-ups

Also provides:
- Availability checking
- Booking reference code generation
"""
import string
import random
from datetime import datetime, date, time, timedelta
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select, func, and_, or_

from app.api.deps import SessionDep
from app.models.scheduling import (
    Schedule, ScheduleCreate, ScheduleUpdate, SchedulePublic, SchedulesPublic,
    Booking, BookingCreate, BookingUpdate, BookingPublic, BookingsPublic,
    BookingStatus,
    Task, TaskCreate, TaskUpdate, TaskPublic, TasksPublic,
    TaskStatus, TaskPriority, TaskType,
    TimeSlot, AvailabilityQuery, AvailabilityResponse,
)
from app.models.entity import Entity

router = APIRouter()


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_reference_code(length: int = 6) -> str:
    """Generate a human-readable booking reference code."""
    chars = string.ascii_uppercase + string.digits
    # Exclude confusing characters
    chars = chars.replace('O', '').replace('0', '').replace('I', '').replace('1', '').replace('L', '')
    return ''.join(random.choices(chars, k=length))


def get_available_slots(
    session: SessionDep,
    professional_id: int,
    target_date: date,
    slot_duration_minutes: int = 60,
    existing_bookings: list[Booking] = None
) -> list[TimeSlot]:
    """Calculate available time slots for a professional on a given date."""
    # Get schedule for this day
    day_of_week = target_date.weekday()

    # First check for specific date override
    schedule = session.exec(
        select(Schedule)
        .where(Schedule.professional_id == professional_id)
        .where(Schedule.specific_date == target_date)
        .where(Schedule.is_active == True)
    ).first()

    # If no specific date, get recurring schedule
    if not schedule:
        schedule = session.exec(
            select(Schedule)
            .where(Schedule.professional_id == professional_id)
            .where(Schedule.day_of_week == day_of_week)
            .where(Schedule.specific_date == None)
            .where(Schedule.is_active == True)
        ).first()

    if not schedule or not schedule.is_available:
        return []

    # Get existing bookings for this day if not provided
    if existing_bookings is None:
        existing_bookings = session.exec(
            select(Booking)
            .where(Booking.professional_id == professional_id)
            .where(Booking.booking_date == target_date)
            .where(Booking.status.not_in([BookingStatus.CANCELLED, BookingStatus.NO_SHOW]))
            .where(Booking.is_active == True)
        ).all()

    # Generate slots
    slots = []
    current_time = datetime.combine(target_date, schedule.start_time)
    end_datetime = datetime.combine(target_date, schedule.end_time)
    slot_duration = timedelta(minutes=slot_duration_minutes or schedule.slot_duration_minutes)
    break_duration = timedelta(minutes=schedule.break_between_minutes)

    while current_time + slot_duration <= end_datetime:
        slot_start = current_time.time()
        slot_end = (current_time + slot_duration).time()

        # Check if slot conflicts with existing bookings
        is_available = True
        for booking in existing_bookings:
            # Check for overlap
            if not (slot_end <= booking.start_time or slot_start >= (booking.end_time or booking.start_time)):
                is_available = False
                break

        if is_available:
            slots.append(TimeSlot(
                start=slot_start,
                end=slot_end,
                professional_id=professional_id
            ))

        current_time = current_time + slot_duration + break_duration

    return slots


# =============================================================================
# SCHEDULE ROUTES
# =============================================================================

@router.get("/schedules", response_model=SchedulesPublic)
def list_schedules(
    session: SessionDep,
    professional_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """List schedules with optional filtering."""
    query = select(Schedule).where(Schedule.is_active == True)

    if professional_id:
        query = query.where(Schedule.professional_id == professional_id)

    query = query.order_by(Schedule.professional_id, Schedule.day_of_week, Schedule.specific_date)
    query = query.offset(skip).limit(limit)

    schedules = session.exec(query).all()

    count_query = select(func.count()).select_from(Schedule).where(Schedule.is_active == True)
    if professional_id:
        count_query = count_query.where(Schedule.professional_id == professional_id)
    count = session.exec(count_query).one()

    return SchedulesPublic(data=schedules, count=count)


@router.post("/schedules", response_model=SchedulePublic)
def create_schedule(session: SessionDep, schedule_in: ScheduleCreate) -> Any:
    """Create a new schedule entry."""
    # Validate professional exists
    professional = session.get(Entity, schedule_in.professional_id)
    if not professional or professional.category != "people":
        raise HTTPException(status_code=400, detail="Invalid professional_id - must be a 'people' entity")

    schedule = Schedule.model_validate(schedule_in)
    session.add(schedule)
    session.commit()
    session.refresh(schedule)
    return schedule


@router.get("/schedules/{schedule_id}", response_model=SchedulePublic)
def get_schedule(session: SessionDep, schedule_id: int) -> Any:
    """Get a specific schedule."""
    schedule = session.get(Schedule, schedule_id)
    if not schedule or not schedule.is_active:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router.patch("/schedules/{schedule_id}", response_model=SchedulePublic)
def update_schedule(
    session: SessionDep, schedule_id: int, schedule_in: ScheduleUpdate
) -> Any:
    """Update a schedule."""
    schedule = session.get(Schedule, schedule_id)
    if not schedule or not schedule.is_active:
        raise HTTPException(status_code=404, detail="Schedule not found")

    update_data = schedule_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(schedule, key, value)

    schedule.updated_at = datetime.utcnow()
    session.add(schedule)
    session.commit()
    session.refresh(schedule)
    return schedule


@router.delete("/schedules/{schedule_id}")
def delete_schedule(session: SessionDep, schedule_id: int) -> Any:
    """Soft delete a schedule."""
    schedule = session.get(Schedule, schedule_id)
    if not schedule or not schedule.is_active:
        raise HTTPException(status_code=404, detail="Schedule not found")

    schedule.is_active = False
    schedule.updated_at = datetime.utcnow()
    session.add(schedule)
    session.commit()
    return {"message": "Schedule deleted"}


# =============================================================================
# BOOKING ROUTES
# =============================================================================

@router.get("/bookings", response_model=BookingsPublic)
def list_bookings(
    session: SessionDep,
    professional_id: Optional[int] = None,
    service_id: Optional[int] = None,
    status: Optional[BookingStatus] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """List bookings with optional filtering."""
    query = select(Booking).where(Booking.is_active == True)

    if professional_id:
        query = query.where(Booking.professional_id == professional_id)
    if service_id:
        query = query.where(Booking.service_id == service_id)
    if status:
        query = query.where(Booking.status == status)
    if date_from:
        query = query.where(Booking.booking_date >= date_from)
    if date_to:
        query = query.where(Booking.booking_date <= date_to)

    query = query.order_by(Booking.booking_date.desc(), Booking.start_time.desc())
    query = query.offset(skip).limit(limit)

    bookings = session.exec(query).all()

    count_query = select(func.count()).select_from(Booking).where(Booking.is_active == True)
    if professional_id:
        count_query = count_query.where(Booking.professional_id == professional_id)
    if service_id:
        count_query = count_query.where(Booking.service_id == service_id)
    if status:
        count_query = count_query.where(Booking.status == status)
    if date_from:
        count_query = count_query.where(Booking.booking_date >= date_from)
    if date_to:
        count_query = count_query.where(Booking.booking_date <= date_to)

    count = session.exec(count_query).one()

    return BookingsPublic(data=bookings, count=count)


@router.post("/bookings", response_model=BookingPublic)
def create_booking(session: SessionDep, booking_in: BookingCreate) -> Any:
    """Create a new booking."""
    # Generate reference code
    reference_code = generate_reference_code()
    while session.exec(select(Booking).where(Booking.reference_code == reference_code)).first():
        reference_code = generate_reference_code()

    booking = Booking.model_validate(booking_in)
    booking.reference_code = reference_code

    # If service_id provided, get duration from service entity
    if booking.service_id and not booking.end_time:
        service = session.get(Entity, booking.service_id)
        if service and service.data:
            duration_minutes = service.data.get("duration_minutes", 60)
            start_datetime = datetime.combine(booking.booking_date, booking.start_time)
            end_datetime = start_datetime + timedelta(minutes=duration_minutes)
            booking.end_time = end_datetime.time()

    session.add(booking)
    session.commit()
    session.refresh(booking)
    return booking


@router.get("/bookings/{booking_id}", response_model=BookingPublic)
def get_booking(session: SessionDep, booking_id: int) -> Any:
    """Get a specific booking."""
    booking = session.get(Booking, booking_id)
    if not booking or not booking.is_active:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.get("/bookings/ref/{reference_code}", response_model=BookingPublic)
def get_booking_by_reference(session: SessionDep, reference_code: str) -> Any:
    """Get a booking by reference code."""
    booking = session.exec(
        select(Booking)
        .where(Booking.reference_code == reference_code.upper())
        .where(Booking.is_active == True)
    ).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.patch("/bookings/{booking_id}", response_model=BookingPublic)
def update_booking(
    session: SessionDep, booking_id: int, booking_in: BookingUpdate
) -> Any:
    """Update a booking."""
    booking = session.get(Booking, booking_id)
    if not booking or not booking.is_active:
        raise HTTPException(status_code=404, detail="Booking not found")

    update_data = booking_in.model_dump(exclude_unset=True)

    # Handle status transitions
    if "status" in update_data:
        new_status = update_data["status"]
        if new_status == BookingStatus.CONFIRMED and not booking.confirmed_at:
            booking.confirmed_at = datetime.utcnow()
        elif new_status == BookingStatus.CANCELLED and not booking.cancelled_at:
            booking.cancelled_at = datetime.utcnow()
        elif new_status == BookingStatus.COMPLETED and not booking.completed_at:
            booking.completed_at = datetime.utcnow()

    for key, value in update_data.items():
        setattr(booking, key, value)

    booking.updated_at = datetime.utcnow()
    session.add(booking)
    session.commit()
    session.refresh(booking)
    return booking


@router.delete("/bookings/{booking_id}")
def delete_booking(session: SessionDep, booking_id: int) -> Any:
    """Soft delete a booking."""
    booking = session.get(Booking, booking_id)
    if not booking or not booking.is_active:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.is_active = False
    booking.updated_at = datetime.utcnow()
    session.add(booking)
    session.commit()
    return {"message": "Booking deleted"}


@router.post("/bookings/{booking_id}/confirm", response_model=BookingPublic)
def confirm_booking(session: SessionDep, booking_id: int) -> Any:
    """Confirm a pending booking."""
    booking = session.get(Booking, booking_id)
    if not booking or not booking.is_active:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != BookingStatus.PENDING:
        raise HTTPException(status_code=400, detail="Booking is not pending")

    booking.status = BookingStatus.CONFIRMED
    booking.confirmed_at = datetime.utcnow()
    booking.updated_at = datetime.utcnow()
    session.add(booking)
    session.commit()
    session.refresh(booking)
    return booking


@router.post("/bookings/{booking_id}/cancel", response_model=BookingPublic)
def cancel_booking(session: SessionDep, booking_id: int, reason: Optional[str] = None) -> Any:
    """Cancel a booking."""
    booking = session.get(Booking, booking_id)
    if not booking or not booking.is_active:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status in [BookingStatus.CANCELLED, BookingStatus.COMPLETED]:
        raise HTTPException(status_code=400, detail="Booking cannot be cancelled")

    booking.status = BookingStatus.CANCELLED
    booking.cancelled_at = datetime.utcnow()
    booking.updated_at = datetime.utcnow()

    if reason:
        booking.internal_notes = (booking.internal_notes or "") + f"\nCancellation reason: {reason}"

    session.add(booking)
    session.commit()
    session.refresh(booking)
    return booking


# =============================================================================
# AVAILABILITY ROUTES
# =============================================================================

@router.post("/availability", response_model=list[AvailabilityResponse])
def check_availability(
    session: SessionDep,
    query: AvailabilityQuery
) -> Any:
    """Check availability for booking."""
    results = []

    date_from = query.date_from
    date_to = query.date_to or query.date_from

    # Determine professionals to check
    professional_ids = []
    if query.professional_id:
        professional_ids = [query.professional_id]
    elif query.service_id:
        # Get professionals that offer this service (via linked_entities or manual lookup)
        # For now, get all professionals with schedules
        schedules = session.exec(
            select(Schedule.professional_id)
            .where(Schedule.is_active == True)
            .distinct()
        ).all()
        professional_ids = list(schedules)
    else:
        # Get all professionals with schedules
        schedules = session.exec(
            select(Schedule.professional_id)
            .where(Schedule.is_active == True)
            .distinct()
        ).all()
        professional_ids = list(schedules)

    # Get service duration if specified
    slot_duration = query.duration_minutes
    if not slot_duration and query.service_id:
        service = session.get(Entity, query.service_id)
        if service and service.data:
            slot_duration = service.data.get("duration_minutes", 60)

    # Check each date
    current_date = date_from
    while current_date <= date_to:
        all_slots = []

        for prof_id in professional_ids:
            slots = get_available_slots(session, prof_id, current_date, slot_duration)

            # Add professional name
            professional = session.get(Entity, prof_id)
            for slot in slots:
                slot.professional_name = professional.name if professional else None
                all_slots.append(slot)

        if all_slots:
            # Get service name
            service_name = None
            if query.service_id:
                service = session.get(Entity, query.service_id)
                service_name = service.name if service else None

            results.append(AvailabilityResponse(
                date=current_date,
                slots=all_slots,
                service_name=service_name
            ))

        current_date += timedelta(days=1)

    return results


# =============================================================================
# TASK ROUTES
# =============================================================================

@router.get("/tasks", response_model=TasksPublic)
def list_tasks(
    session: SessionDep,
    status: Optional[TaskStatus] = None,
    priority: Optional[TaskPriority] = None,
    task_type: Optional[TaskType] = None,
    assigned_to: Optional[int] = None,
    due_before: Optional[date] = None,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """List tasks with optional filtering."""
    query = select(Task).where(Task.is_active == True)

    if status:
        query = query.where(Task.status == status)
    if priority:
        query = query.where(Task.priority == priority)
    if task_type:
        query = query.where(Task.task_type == task_type)
    if assigned_to:
        query = query.where(Task.assigned_to == assigned_to)
    if due_before:
        query = query.where(Task.due_date <= due_before)

    query = query.order_by(Task.priority.desc(), Task.due_date, Task.created_at.desc())
    query = query.offset(skip).limit(limit)

    tasks = session.exec(query).all()

    count_query = select(func.count()).select_from(Task).where(Task.is_active == True)
    if status:
        count_query = count_query.where(Task.status == status)
    if priority:
        count_query = count_query.where(Task.priority == priority)
    if task_type:
        count_query = count_query.where(Task.task_type == task_type)
    if assigned_to:
        count_query = count_query.where(Task.assigned_to == assigned_to)
    if due_before:
        count_query = count_query.where(Task.due_date <= due_before)

    count = session.exec(count_query).one()

    return TasksPublic(data=tasks, count=count)


@router.post("/tasks", response_model=TaskPublic)
def create_task(session: SessionDep, task_in: TaskCreate) -> Any:
    """Create a new task."""
    task = Task.model_validate(task_in)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.get("/tasks/{task_id}", response_model=TaskPublic)
def get_task(session: SessionDep, task_id: int) -> Any:
    """Get a specific task."""
    task = session.get(Task, task_id)
    if not task or not task.is_active:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/tasks/{task_id}", response_model=TaskPublic)
def update_task(
    session: SessionDep, task_id: int, task_in: TaskUpdate
) -> Any:
    """Update a task."""
    task = session.get(Task, task_id)
    if not task or not task.is_active:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_in.model_dump(exclude_unset=True)

    # Handle status transitions
    if "status" in update_data:
        new_status = update_data["status"]
        if new_status == TaskStatus.DONE and not task.completed_at:
            task.completed_at = datetime.utcnow()

    for key, value in update_data.items():
        setattr(task, key, value)

    task.updated_at = datetime.utcnow()
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.delete("/tasks/{task_id}")
def delete_task(session: SessionDep, task_id: int) -> Any:
    """Soft delete a task."""
    task = session.get(Task, task_id)
    if not task or not task.is_active:
        raise HTTPException(status_code=404, detail="Task not found")

    task.is_active = False
    task.updated_at = datetime.utcnow()
    session.add(task)
    session.commit()
    return {"message": "Task deleted"}


@router.post("/tasks/{task_id}/complete", response_model=TaskPublic)
def complete_task(session: SessionDep, task_id: int) -> Any:
    """Mark a task as complete."""
    task = session.get(Task, task_id)
    if not task or not task.is_active:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = TaskStatus.DONE
    task.completed_at = datetime.utcnow()
    task.updated_at = datetime.utcnow()
    session.add(task)
    session.commit()
    session.refresh(task)
    return task
