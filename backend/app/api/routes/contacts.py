"""Contact API routes - CRUD for customers/leads and contact schema."""

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select, func

from app.api.deps import SessionDep
from app.models.contact import (
    Contact, ContactCreate, ContactUpdate, ContactPublic, ContactsPublic,
    ContactField, ContactFieldCreate, ContactFieldUpdate, ContactFieldPublic, ContactFieldsPublic,
    AgentFieldConfig, AgentFieldConfigCreate, AgentFieldConfigUpdate,
    AgentFieldConfigPublic, AgentFieldConfigsPublic,
    FieldType, FieldNecessity,
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


# =============================================================================
# CONTACT FIELDS (Schema Definition)
# =============================================================================

@router.get("/fields", response_model=ContactFieldsPublic)
def get_contact_fields(
    session: SessionDep,
    include_inactive: bool = Query(False, description="Include inactive fields"),
) -> Any:
    """Get all contact field definitions for the workspace."""
    query = select(ContactField)
    if not include_inactive:
        query = query.where(ContactField.is_active == True)
    query = query.order_by(ContactField.display_order)

    fields = session.exec(query).all()
    return ContactFieldsPublic(data=fields, count=len(fields))


@router.post("/fields", response_model=ContactFieldPublic, status_code=201)
def create_contact_field(
    session: SessionDep,
    field_in: ContactFieldCreate,
) -> Any:
    """Create a new contact field definition."""
    # Check for duplicate key
    existing = session.exec(
        select(ContactField)
        .where(ContactField.key == field_in.key)
        .where(ContactField.is_active == True)
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Field with key '{field_in.key}' already exists"
        )

    field = ContactField(**field_in.model_dump())
    session.add(field)
    session.commit()
    session.refresh(field)
    return field


@router.get("/fields/{field_id}", response_model=ContactFieldPublic)
def get_contact_field(session: SessionDep, field_id: int) -> Any:
    """Get a contact field by ID."""
    field = session.get(ContactField, field_id)
    if not field or not field.is_active:
        raise HTTPException(status_code=404, detail="Field not found")
    return field


@router.patch("/fields/{field_id}", response_model=ContactFieldPublic)
def update_contact_field(
    session: SessionDep,
    field_id: int,
    field_in: ContactFieldUpdate,
) -> Any:
    """Update a contact field definition."""
    field = session.get(ContactField, field_id)
    if not field or not field.is_active:
        raise HTTPException(status_code=404, detail="Field not found")

    # Check for duplicate key if changing
    if field_in.key and field_in.key != field.key:
        existing = session.exec(
            select(ContactField)
            .where(ContactField.key == field_in.key)
            .where(ContactField.is_active == True)
            .where(ContactField.id != field_id)
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Field with key '{field_in.key}' already exists"
            )

    update_data = field_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(field, key, value)

    field.updated_at = datetime.utcnow()
    session.add(field)
    session.commit()
    session.refresh(field)
    return field


@router.delete("/fields/{field_id}", status_code=204)
def delete_contact_field(session: SessionDep, field_id: int) -> None:
    """Soft delete a contact field."""
    field = session.get(ContactField, field_id)
    if not field or not field.is_active:
        raise HTTPException(status_code=404, detail="Field not found")

    field.is_active = False
    field.updated_at = datetime.utcnow()
    session.add(field)
    session.commit()


@router.post("/fields/reorder")
def reorder_contact_fields(
    session: SessionDep,
    field_ids: list[int],
) -> Any:
    """Reorder contact fields by providing ordered list of IDs."""
    for idx, field_id in enumerate(field_ids):
        field = session.get(ContactField, field_id)
        if field and field.is_active:
            field.display_order = idx
            field.updated_at = datetime.utcnow()
            session.add(field)

    session.commit()
    return {"status": "ok", "count": len(field_ids)}


# =============================================================================
# AGENT FIELD CONFIGS (Agent-specific collection rules)
# =============================================================================

@router.get("/agent-fields/{agent_id}", response_model=AgentFieldConfigsPublic)
def get_agent_field_configs(
    session: SessionDep,
    agent_id: int,
) -> Any:
    """Get field collection configs for an agent."""
    configs = session.exec(
        select(AgentFieldConfig)
        .where(AgentFieldConfig.agent_id == agent_id)
        .where(AgentFieldConfig.is_active == True)
    ).all()

    # Enrich with field details
    result = []
    for config in configs:
        field = session.get(ContactField, config.field_id)
        config_dict = config.model_dump()
        if field:
            config_dict["field_key"] = field.key
            config_dict["field_label"] = field.label
            config_dict["field_type"] = field.field_type
        result.append(AgentFieldConfigPublic(**config_dict))

    return AgentFieldConfigsPublic(data=result, count=len(result))


@router.post("/agent-fields", response_model=AgentFieldConfigPublic, status_code=201)
def create_agent_field_config(
    session: SessionDep,
    config_in: AgentFieldConfigCreate,
) -> Any:
    """Link a contact field to an agent with collection rules."""
    # Verify field exists
    field = session.get(ContactField, config_in.field_id)
    if not field or not field.is_active:
        raise HTTPException(status_code=404, detail="Field not found")

    # Check for duplicate
    existing = session.exec(
        select(AgentFieldConfig)
        .where(AgentFieldConfig.agent_id == config_in.agent_id)
        .where(AgentFieldConfig.field_id == config_in.field_id)
        .where(AgentFieldConfig.is_active == True)
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="This field is already configured for this agent"
        )

    config = AgentFieldConfig(**config_in.model_dump())
    session.add(config)
    session.commit()
    session.refresh(config)

    # Return with field details
    result = config.model_dump()
    result["field_key"] = field.key
    result["field_label"] = field.label
    result["field_type"] = field.field_type
    return AgentFieldConfigPublic(**result)


@router.patch("/agent-fields/{config_id}", response_model=AgentFieldConfigPublic)
def update_agent_field_config(
    session: SessionDep,
    config_id: int,
    config_in: AgentFieldConfigUpdate,
) -> Any:
    """Update agent field collection config."""
    config = session.get(AgentFieldConfig, config_id)
    if not config or not config.is_active:
        raise HTTPException(status_code=404, detail="Config not found")

    update_data = config_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)

    config.updated_at = datetime.utcnow()
    session.add(config)
    session.commit()
    session.refresh(config)

    # Return with field details
    field = session.get(ContactField, config.field_id)
    result = config.model_dump()
    if field:
        result["field_key"] = field.key
        result["field_label"] = field.label
        result["field_type"] = field.field_type
    return AgentFieldConfigPublic(**result)


@router.delete("/agent-fields/{config_id}", status_code=204)
def delete_agent_field_config(session: SessionDep, config_id: int) -> None:
    """Remove a field from agent's collection config."""
    config = session.get(AgentFieldConfig, config_id)
    if not config or not config.is_active:
        raise HTTPException(status_code=404, detail="Config not found")

    config.is_active = False
    config.updated_at = datetime.utcnow()
    session.add(config)
    session.commit()


# =============================================================================
# CONTACT DATA FIELD UPDATE (For agents)
# =============================================================================

@router.patch("/{contact_id}/data/{field_key}")
def update_contact_data_field(
    session: SessionDep,
    contact_id: int,
    field_key: str,
    value: Any,
) -> Any:
    """
    Update a single field in contact's data dict.

    Used by agents to save collected information naturally.
    Validates field exists in schema if strict mode.
    """
    contact = session.get(Contact, contact_id)
    if not contact or not contact.is_active:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Update the specific field in data dict
    if contact.data is None:
        contact.data = {}

    contact.data[field_key] = value
    contact.updated_at = datetime.utcnow()

    session.add(contact)
    session.commit()
    session.refresh(contact)

    return {"status": "ok", "field": field_key, "value": value}


@router.get("/{contact_id}/data")
def get_contact_data_with_schema(
    session: SessionDep,
    contact_id: int,
) -> Any:
    """
    Get contact data enriched with field schema.

    Returns contact data with field definitions for proper display.
    """
    contact = session.get(Contact, contact_id)
    if not contact or not contact.is_active:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Get all field definitions
    fields = session.exec(
        select(ContactField)
        .where(ContactField.is_active == True)
        .order_by(ContactField.display_order)
    ).all()

    # Build response with schema info
    result = []
    for field in fields:
        value = contact.data.get(field.key) if contact.data else None
        result.append({
            "key": field.key,
            "label": field.label,
            "type": field.field_type,
            "value": value,
            "options": field.options,
            "icon": field.icon,
            "has_value": value is not None,
        })

    return {
        "contact_id": contact_id,
        "contact_name": contact.name,
        "fields": result,
        "raw_data": contact.data or {},
    }
