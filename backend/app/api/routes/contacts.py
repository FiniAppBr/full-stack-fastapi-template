"""Contact API routes - CRUD for customers/leads."""

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select, func

from app.api.deps import SessionDep
from app.models.contact import (
    Contact, ContactCreate, ContactUpdate, ContactPublic, ContactsPublic
)

router = APIRouter()


@router.get("/stats")
def get_contact_stats(session: SessionDep) -> Any:
    """Get contact stats for dashboard."""
    # Total contacts
    total = session.exec(
        select(func.count(Contact.id)).where(Contact.is_active == True)
    ).one()

    # By source
    sources = {}
    for source in ["manual", "agent", "whatsapp", "website", "form"]:
        count = session.exec(
            select(func.count(Contact.id))
            .where(Contact.is_active == True)
            .where(Contact.source == source)
        ).one()
        sources[source] = count

    # By pipeline stage - count all stages dynamically
    stages = {}
    # First get all distinct stages from contacts
    all_stages = session.exec(
        select(Contact.pipeline_stage)
        .where(Contact.is_active == True)
        .where(Contact.pipeline_stage != None)
        .distinct()
    ).all()

    for stage in all_stages:
        if stage:
            count = session.exec(
                select(func.count(Contact.id))
                .where(Contact.is_active == True)
                .where(Contact.pipeline_stage == stage)
            ).one()
            stages[stage] = count

    # Contacts without stage (unassigned)
    unassigned = session.exec(
        select(func.count(Contact.id))
        .where(Contact.is_active == True)
        .where(Contact.pipeline_stage == None)
    ).one()
    stages["unassigned"] = unassigned

    return {
        "total": total,
        "by_source": sources,
        "by_stage": stages
    }


@router.get("", response_model=ContactsPublic)
def get_contacts(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search by name, phone, or email"),
    source: Optional[str] = Query(None, description="Filter by source"),
    pipeline_stage: Optional[str] = Query(None, description="Filter by pipeline stage"),
    assigned_to: Optional[str] = Query(None, description="Filter by assigned user"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
) -> Any:
    """Get all contacts with optional filtering."""
    query = select(Contact).where(Contact.is_active == True)

    if search:
        search_filter = (
            Contact.name.ilike(f"%{search}%") |
            Contact.phone.ilike(f"%{search}%") |
            Contact.email.ilike(f"%{search}%")
        )
        query = query.where(search_filter)

    if source:
        query = query.where(Contact.source == source)

    if pipeline_stage:
        if pipeline_stage == "unassigned":
            query = query.where(Contact.pipeline_stage == None)
        else:
            query = query.where(Contact.pipeline_stage == pipeline_stage)

    if assigned_to:
        query = query.where(Contact.assigned_to == assigned_to)

    # Note: tag filtering requires checking JSON array
    # This is a simplified version - for production, consider using PostgreSQL JSON operators

    # Order by most recent interaction first, then by creation date
    query = query.order_by(
        Contact.last_interaction_at.desc().nullslast(),
        Contact.created_at.desc()
    )
    query = query.offset(skip).limit(limit)
    contacts = session.exec(query).all()

    # Get total count
    count_query = select(func.count(Contact.id)).where(Contact.is_active == True)
    if search:
        count_query = count_query.where(
            Contact.name.ilike(f"%{search}%") |
            Contact.phone.ilike(f"%{search}%") |
            Contact.email.ilike(f"%{search}%")
        )
    if source:
        count_query = count_query.where(Contact.source == source)
    if pipeline_stage:
        if pipeline_stage == "unassigned":
            count_query = count_query.where(Contact.pipeline_stage == None)
        else:
            count_query = count_query.where(Contact.pipeline_stage == pipeline_stage)
    if assigned_to:
        count_query = count_query.where(Contact.assigned_to == assigned_to)

    total = session.exec(count_query).one()

    return ContactsPublic(data=contacts, count=total)


@router.post("", response_model=ContactPublic, status_code=201)
def create_contact(*, session: SessionDep, contact_in: ContactCreate) -> Any:
    """Create a new contact."""
    # Check for duplicate phone (if provided)
    if contact_in.phone:
        existing = session.exec(
            select(Contact)
            .where(Contact.is_active == True)
            .where(Contact.phone == contact_in.phone)
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Contact with phone {contact_in.phone} already exists (ID: {existing.id})"
            )

    contact = Contact(
        name=contact_in.name,
        phone=contact_in.phone,
        email=contact_in.email,
        source=contact_in.source,
        source_agent_id=contact_in.source_agent_id,
        data=contact_in.data,
        pipeline_stage=contact_in.pipeline_stage,
        assigned_to=contact_in.assigned_to,
        tags=contact_in.tags,
        notes=contact_in.notes,
    )
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@router.get("/{contact_id}", response_model=ContactPublic)
def get_contact(session: SessionDep, contact_id: int) -> Any:
    """Get contact by ID."""
    contact = session.get(Contact, contact_id)
    if not contact or not contact.is_active:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.get("/phone/{phone}", response_model=ContactPublic)
def get_contact_by_phone(session: SessionDep, phone: str) -> Any:
    """Get contact by phone number."""
    contact = session.exec(
        select(Contact)
        .where(Contact.is_active == True)
        .where(Contact.phone == phone)
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.patch("/{contact_id}", response_model=ContactPublic)
def update_contact(
    *, session: SessionDep, contact_id: int, contact_in: ContactUpdate
) -> Any:
    """Update a contact."""
    contact = session.get(Contact, contact_id)
    if not contact or not contact.is_active:
        raise HTTPException(status_code=404, detail="Contact not found")

    update_data = contact_in.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(contact, key, value)

    contact.updated_at = datetime.utcnow()
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=204)
def delete_contact(session: SessionDep, contact_id: int) -> None:
    """Soft delete a contact."""
    contact = session.get(Contact, contact_id)
    if not contact or not contact.is_active:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact.is_active = False
    contact.updated_at = datetime.utcnow()
    session.add(contact)
    session.commit()


# =============================================================================
# AGENT INTERACTION TRACKING
# =============================================================================

@router.post("/{contact_id}/interaction")
def record_interaction(
    session: SessionDep,
    contact_id: int,
    agent_id: Optional[str] = Query(None, description="Agent that interacted")
) -> Any:
    """Record an interaction with a contact (for tracking activity)."""
    contact = session.get(Contact, contact_id)
    if not contact or not contact.is_active:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact.last_interaction_at = datetime.utcnow()
    contact.conversation_count += 1
    if agent_id:
        contact.last_agent_id = agent_id

    contact.updated_at = datetime.utcnow()
    session.add(contact)
    session.commit()
    session.refresh(contact)

    return {"status": "ok", "conversation_count": contact.conversation_count}


@router.patch("/{contact_id}/stage")
def update_contact_stage(
    session: SessionDep,
    contact_id: int,
    stage: str = Query(..., description="New pipeline stage")
) -> Any:
    """Update contact's pipeline stage (for agent-driven pipeline management)."""
    contact = session.get(Contact, contact_id)
    if not contact or not contact.is_active:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact.pipeline_stage = stage
    contact.updated_at = datetime.utcnow()
    session.add(contact)
    session.commit()
    session.refresh(contact)

    return {"status": "ok", "new_stage": stage}


# =============================================================================
# FIND OR CREATE (for agents)
# =============================================================================

@router.post("/find-or-create", response_model=ContactPublic)
def find_or_create_contact(
    session: SessionDep,
    contact_in: ContactCreate
) -> Any:
    """
    Find existing contact by phone or create new one.

    This is the preferred method for agents to get/create contacts:
    - If phone exists, returns existing contact
    - If phone doesn't exist, creates new contact

    Useful for lead captation agents that need to track conversations.
    """
    # Try to find by phone first
    if contact_in.phone:
        existing = session.exec(
            select(Contact)
            .where(Contact.is_active == True)
            .where(Contact.phone == contact_in.phone)
        ).first()
        if existing:
            # Update interaction tracking
            existing.last_interaction_at = datetime.utcnow()
            existing.conversation_count += 1
            if contact_in.source_agent_id:
                existing.last_agent_id = contact_in.source_agent_id

            # Merge new data (don't overwrite existing)
            if contact_in.data:
                merged_data = {**existing.data, **contact_in.data}
                existing.data = merged_data

            existing.updated_at = datetime.utcnow()
            session.add(existing)
            session.commit()
            session.refresh(existing)
            return existing

    # Create new contact
    contact = Contact(
        name=contact_in.name,
        phone=contact_in.phone,
        email=contact_in.email,
        source=contact_in.source or "agent",
        source_agent_id=contact_in.source_agent_id,
        data=contact_in.data,
        pipeline_stage="new",  # Default to first stage
        tags=contact_in.tags,
        notes=contact_in.notes,
        last_interaction_at=datetime.utcnow(),
        conversation_count=1,
    )
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact
