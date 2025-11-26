"""
Calendar Tools - Appointment scheduling for AI agents.

Provides LangGraph-compatible tools for:
- check_availability: Check available time slots
- book_appointment: Create a booking
- cancel_appointment: Cancel an existing booking
- reschedule_appointment: Change booking date/time

These tools use the internal ConnectAI scheduling system.
For external calendars (Google, Calendly), see integrations/.
"""
from datetime import datetime, date, timedelta
from typing import Optional, Annotated

from langchain_core.tools import tool
from sqlmodel import Session, select

from app.core.db import engine
from app.models.scheduling import (
    Schedule, Booking, BookingCreate, BookingStatus,
    TimeSlot, AvailabilityQuery
)
from app.models.entity import Entity


def _get_available_slots(
    session: Session,
    professional_id: int,
    target_date: date,
    slot_duration_minutes: int = 60
) -> list[dict]:
    """Calculate available time slots for a professional on a given date."""
    day_of_week = target_date.weekday()

    # Check for specific date override first
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

    # Get existing bookings for this day
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
            booking_end = booking.end_time or booking.start_time
            if not (slot_end <= booking.start_time or slot_start >= booking_end):
                is_available = False
                break

        if is_available:
            slots.append({
                "start": slot_start.strftime("%H:%M"),
                "end": slot_end.strftime("%H:%M")
            })

        current_time = current_time + slot_duration + break_duration

    return slots


def _generate_reference_code() -> str:
    """Generate a human-readable booking reference code."""
    import string
    import random
    chars = string.ascii_uppercase + string.digits
    chars = chars.replace('O', '').replace('0', '').replace('I', '').replace('1', '').replace('L', '')
    return ''.join(random.choices(chars, k=6))


@tool
def check_availability(
    service_name: Annotated[str, "Name of the service to book (optional)"] = "",
    professional_name: Annotated[str, "Name of the professional (optional)"] = "",
    preferred_date: Annotated[str, "Preferred date in YYYY-MM-DD format (optional, defaults to next 3 days)"] = "",
    days_to_check: Annotated[int, "Number of days to check availability (default 3)"] = 3
) -> str:
    """
    Check calendar availability for appointments.

    Use this tool when:
    - Customer asks about availability ("quando posso agendar?", "horários disponíveis?")
    - Before attempting to book an appointment
    - Customer asks "when can I come in?"

    Returns available time slots for the specified date range.
    """
    with Session(engine) as session:
        # Determine date range
        if preferred_date:
            try:
                start_date = datetime.strptime(preferred_date, "%Y-%m-%d").date()
            except ValueError:
                return "Data inválida. Use o formato YYYY-MM-DD (ex: 2025-01-15)"
        else:
            start_date = date.today() + timedelta(days=1)  # Start from tomorrow

        end_date = start_date + timedelta(days=days_to_check - 1)

        # Find professionals
        professional_ids = []
        if professional_name:
            professionals = session.exec(
                select(Entity)
                .where(Entity.category == "people")
                .where(Entity.name.ilike(f"%{professional_name}%"))
                .where(Entity.is_active == True)
            ).all()
            professional_ids = [p.id for p in professionals]
        else:
            # Get all professionals with schedules
            schedules = session.exec(
                select(Schedule.professional_id).distinct()
                .where(Schedule.is_active == True)
            ).all()
            professional_ids = list(schedules)

        if not professional_ids:
            return "Não encontrei profissionais disponíveis para agendamento."

        # Get service duration if specified
        slot_duration = 60  # default
        if service_name:
            service = session.exec(
                select(Entity)
                .where(Entity.category == "products")
                .where(Entity.name.ilike(f"%{service_name}%"))
                .where(Entity.is_active == True)
            ).first()
            if service and service.data:
                slot_duration = service.data.get("duration_minutes", 60)

        # Check availability for each date
        availability = []
        current_date = start_date
        while current_date <= end_date:
            day_slots = []
            for prof_id in professional_ids:
                slots = _get_available_slots(session, prof_id, current_date, slot_duration)
                if slots:
                    # Get professional name
                    prof = session.get(Entity, prof_id)
                    prof_name = prof.name if prof else f"Profissional {prof_id}"
                    day_slots.append({
                        "professional": prof_name,
                        "professional_id": prof_id,
                        "slots": slots
                    })

            if day_slots:
                # Format date in Portuguese
                weekdays = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
                day_name = weekdays[current_date.weekday()]
                availability.append({
                    "date": current_date.strftime("%Y-%m-%d"),
                    "display": f"{day_name}, {current_date.strftime('%d/%m')}",
                    "professionals": day_slots
                })

            current_date += timedelta(days=1)

        if not availability:
            return "Não há horários disponíveis no período solicitado. Gostaria de verificar outras datas?"

        # Format response
        lines = ["**Horários disponíveis:**\n"]
        for day in availability:
            lines.append(f"📅 **{day['display']}**")
            for prof in day['professionals']:
                slot_times = ", ".join([s['start'] for s in prof['slots']])
                lines.append(f"  • {prof['professional']}: {slot_times}")
            lines.append("")

        lines.append("Qual horário prefere?")
        return "\n".join(lines)


@tool
def book_appointment(
    customer_name: Annotated[str, "Customer's full name"],
    booking_date: Annotated[str, "Date for the appointment in YYYY-MM-DD format"],
    booking_time: Annotated[str, "Time for the appointment in HH:MM format"],
    professional_id: Annotated[int, "ID of the professional (from check_availability)"] = 0,
    professional_name: Annotated[str, "Name of the professional (if ID not known)"] = "",
    service_name: Annotated[str, "Name of the service being booked"] = "",
    customer_phone: Annotated[str, "Customer's phone number"] = "",
    customer_email: Annotated[str, "Customer's email"] = "",
    notes: Annotated[str, "Any additional notes or requests"] = ""
) -> str:
    """
    Book an appointment on the calendar.

    Use this tool when:
    - Customer confirms they want to book
    - You have the necessary information (name, date, time, phone)

    Returns confirmation with booking reference code.
    """
    # Validate required fields
    if not customer_name.strip():
        return "Erro: Preciso do nome do cliente para fazer o agendamento."
    if not customer_phone.strip():
        return "Erro: Preciso do telefone do cliente para confirmar o agendamento."

    with Session(engine) as session:
        # Parse date and time
        try:
            parsed_date = datetime.strptime(booking_date, "%Y-%m-%d").date()
            parsed_time = datetime.strptime(booking_time, "%H:%M").time()
        except ValueError:
            return "Data ou horário inválido. Use YYYY-MM-DD para data e HH:MM para horário."

        # Find professional
        prof_id = professional_id
        if not prof_id and professional_name:
            prof = session.exec(
                select(Entity)
                .where(Entity.category == "people")
                .where(Entity.name.ilike(f"%{professional_name}%"))
                .where(Entity.is_active == True)
            ).first()
            if prof:
                prof_id = prof.id

        # Find service
        service_id = None
        duration_minutes = 60
        if service_name:
            service = session.exec(
                select(Entity)
                .where(Entity.category == "products")
                .where(Entity.name.ilike(f"%{service_name}%"))
                .where(Entity.is_active == True)
            ).first()
            if service:
                service_id = service.id
                duration_minutes = service.data.get("duration_minutes", 60) if service.data else 60

        # Calculate end time
        start_datetime = datetime.combine(parsed_date, parsed_time)
        end_datetime = start_datetime + timedelta(minutes=duration_minutes)

        # Generate reference code
        reference_code = _generate_reference_code()
        while session.exec(select(Booking).where(Booking.reference_code == reference_code)).first():
            reference_code = _generate_reference_code()

        # Create booking
        booking = Booking(
            service_id=service_id,
            professional_id=prof_id if prof_id else None,
            customer_name=customer_name,
            customer_phone=customer_phone or None,
            customer_email=customer_email or None,
            booking_date=parsed_date,
            start_time=parsed_time,
            end_time=end_datetime.time(),
            status=BookingStatus.PENDING,
            notes=notes or None,
            reference_code=reference_code,
            source="agent"
        )

        session.add(booking)
        session.commit()
        session.refresh(booking)

        # Format confirmation
        weekdays = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
        day_name = weekdays[parsed_date.weekday()]

        # Get professional name for display
        prof_display = ""
        if prof_id:
            prof = session.get(Entity, prof_id)
            if prof:
                prof_display = f"\n• Profissional: {prof.name}"

        service_display = ""
        if service_name:
            service_display = f"\n• Serviço: {service_name}"

        return f"""✅ **Agendamento confirmado!**

📋 **Código:** {reference_code}

📅 **Data:** {day_name}, {parsed_date.strftime('%d/%m/%Y')}
⏰ **Horário:** {parsed_time.strftime('%H:%M')}{prof_display}{service_display}
👤 **Nome:** {customer_name}

Guarde o código **{reference_code}** para referência.
Deseja receber confirmação por WhatsApp ou email?"""


@tool
def cancel_appointment(
    reference_code: Annotated[str, "Booking reference code (e.g., ABC123)"] = "",
    customer_name: Annotated[str, "Customer name (if reference code not known)"] = "",
    booking_date: Annotated[str, "Booking date YYYY-MM-DD (if reference code not known)"] = "",
    cancellation_reason: Annotated[str, "Reason for cancellation"] = ""
) -> str:
    """
    Cancel an existing booking.

    Use this tool when:
    - Customer wants to cancel their appointment
    - Customer needs to reschedule (cancel first, then rebook)

    Returns confirmation of cancellation.
    """
    with Session(engine) as session:
        booking = None

        # Find by reference code first
        if reference_code:
            booking = session.exec(
                select(Booking)
                .where(Booking.reference_code == reference_code.upper())
                .where(Booking.is_active == True)
            ).first()

        # If not found, try by name and date
        if not booking and customer_name:
            query = select(Booking).where(
                Booking.customer_name.ilike(f"%{customer_name}%")
            ).where(Booking.is_active == True)

            if booking_date:
                try:
                    parsed_date = datetime.strptime(booking_date, "%Y-%m-%d").date()
                    query = query.where(Booking.booking_date == parsed_date)
                except ValueError:
                    pass

            # Get most recent non-cancelled booking
            query = query.where(Booking.status.not_in([BookingStatus.CANCELLED, BookingStatus.COMPLETED]))
            query = query.order_by(Booking.booking_date.desc())
            booking = session.exec(query).first()

        if not booking:
            return "Não encontrei o agendamento. Por favor, confirme o código de referência ou nome e data."

        if booking.status in [BookingStatus.CANCELLED, BookingStatus.COMPLETED]:
            return f"Este agendamento já está {booking.status.value}. Não é possível cancelar."

        # Cancel the booking
        booking.status = BookingStatus.CANCELLED
        booking.cancelled_at = datetime.utcnow()
        booking.updated_at = datetime.utcnow()

        if cancellation_reason:
            booking.internal_notes = (booking.internal_notes or "") + f"\nMotivo: {cancellation_reason}"

        session.add(booking)
        session.commit()

        weekdays = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
        day_name = weekdays[booking.booking_date.weekday()]

        return f"""✅ **Agendamento cancelado**

📋 Código: {booking.reference_code}
📅 Era para: {day_name}, {booking.booking_date.strftime('%d/%m/%Y')} às {booking.start_time.strftime('%H:%M')}

Deseja agendar um novo horário?"""


@tool
def reschedule_appointment(
    reference_code: Annotated[str, "Booking reference code to reschedule"],
    new_date: Annotated[str, "New date in YYYY-MM-DD format"],
    new_time: Annotated[str, "New time in HH:MM format"]
) -> str:
    """
    Reschedule an existing booking to a new date/time.

    Use this tool when:
    - Customer wants to change their appointment time
    - Original time no longer works

    Returns confirmation with updated booking details.
    """
    with Session(engine) as session:
        # Find the booking
        booking = session.exec(
            select(Booking)
            .where(Booking.reference_code == reference_code.upper())
            .where(Booking.is_active == True)
        ).first()

        if not booking:
            return f"Não encontrei agendamento com código {reference_code}. Verifique o código e tente novamente."

        if booking.status in [BookingStatus.CANCELLED, BookingStatus.COMPLETED]:
            return f"Este agendamento está {booking.status.value} e não pode ser reagendado."

        # Parse new date and time
        try:
            parsed_date = datetime.strptime(new_date, "%Y-%m-%d").date()
            parsed_time = datetime.strptime(new_time, "%H:%M").time()
        except ValueError:
            return "Data ou horário inválido. Use YYYY-MM-DD para data e HH:MM para horário."

        # Store old values for message
        old_date = booking.booking_date
        old_time = booking.start_time

        # Calculate new end time (keep same duration)
        if booking.end_time:
            old_start = datetime.combine(old_date, booking.start_time)
            old_end = datetime.combine(old_date, booking.end_time)
            duration = old_end - old_start
            new_end = datetime.combine(parsed_date, parsed_time) + duration
            booking.end_time = new_end.time()

        # Update booking
        booking.booking_date = parsed_date
        booking.start_time = parsed_time
        booking.updated_at = datetime.utcnow()

        # Add note about reschedule
        old_display = f"{old_date.strftime('%d/%m')} às {old_time.strftime('%H:%M')}"
        booking.internal_notes = (booking.internal_notes or "") + f"\nReagendado de {old_display}"

        session.add(booking)
        session.commit()

        weekdays = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
        new_day_name = weekdays[parsed_date.weekday()]

        return f"""✅ **Agendamento reagendado!**

📋 Código: {booking.reference_code}
📅 **Novo horário:** {new_day_name}, {parsed_date.strftime('%d/%m/%Y')} às {parsed_time.strftime('%H:%M')}

Posso ajudar com mais alguma coisa?"""


# Export all tools
CALENDAR_TOOLS = [
    check_availability,
    book_appointment,
    cancel_appointment,
    reschedule_appointment,
]
