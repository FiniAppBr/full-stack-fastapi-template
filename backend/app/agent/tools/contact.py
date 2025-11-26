"""
Contact Tools - Save and retrieve contact information.

Provides LangGraph-compatible tools for:
- save_contact_field: Save a specific field value to contact record
- get_contact_info: Get current contact information
- get_missing_fields: Check which required fields are missing

These tools use the ContactField schema system for dynamic field definitions.
"""
from typing import Annotated, Optional

from langchain_core.tools import tool
from sqlmodel import Session, select

from app.core.db import engine
from app.models.contact import (
    Contact, ContactField, AgentFieldConfig, FieldNecessity
)


@tool
def save_contact_field(
    field_key: Annotated[str, "The field key to save (e.g., 'budget', 'bedrooms')"],
    value: Annotated[str, "The value to save"],
    contact_id: Annotated[Optional[int], "Contact ID if known"] = None,
    contact_phone: Annotated[Optional[str], "Contact phone to identify them"] = None,
) -> str:
    """
    Save a collected field value to the contact record.

    Use this tool when:
    - Customer mentions relevant information naturally in conversation
    - You've asked for and received specific information
    - Confirming details before an action (booking, quote, etc.)

    Examples:
    - Customer says "my budget is around 500k" → save_contact_field("budget", "500000")
    - Customer says "I need 3 bedrooms" → save_contact_field("bedrooms", "3")
    - Customer gives phone "11999887766" → save_contact_field("phone", "11999887766")

    Returns confirmation of what was saved.
    """
    with Session(engine) as session:
        contact = None

        # Find contact by ID or phone
        if contact_id:
            contact = session.get(Contact, contact_id)
        elif contact_phone:
            contact = session.exec(
                select(Contact)
                .where(Contact.phone == contact_phone)
                .where(Contact.is_active == True)
            ).first()

        if not contact:
            return f"Não foi possível salvar '{field_key}': contato não encontrado. Preciso do ID ou telefone do contato."

        # Get field definition to validate and format
        field_def = session.exec(
            select(ContactField)
            .where(ContactField.key == field_key)
            .where(ContactField.is_active == True)
        ).first()

        # Initialize data dict if needed
        if contact.data is None:
            contact.data = {}

        # Save the value
        contact.data[field_key] = value

        session.add(contact)
        session.commit()

        # Build response
        if field_def:
            return f"✓ {field_def.label}: {value}"
        else:
            return f"✓ {field_key}: {value}"


@tool
def get_contact_info(
    contact_id: Annotated[Optional[int], "Contact ID if known"] = None,
    contact_phone: Annotated[Optional[str], "Contact phone to identify them"] = None,
) -> str:
    """
    Get current information about a contact.

    Use this tool when:
    - You need to check what information you already have
    - Before asking for information (to avoid re-asking)
    - Summarizing what you know about the customer

    Returns the contact's stored information.
    """
    with Session(engine) as session:
        contact = None

        if contact_id:
            contact = session.get(Contact, contact_id)
        elif contact_phone:
            contact = session.exec(
                select(Contact)
                .where(Contact.phone == contact_phone)
                .where(Contact.is_active == True)
            ).first()

        if not contact:
            return "Contato não encontrado."

        # Get field definitions for labels
        fields = session.exec(
            select(ContactField)
            .where(ContactField.is_active == True)
        ).all()
        field_labels = {f.key: f.label for f in fields}

        # Build info list
        info_lines = [f"**{contact.name}**"]

        if contact.phone:
            info_lines.append(f"• Telefone: {contact.phone}")
        if contact.email:
            info_lines.append(f"• Email: {contact.email}")

        # Add custom fields from data
        if contact.data:
            for key, value in contact.data.items():
                label = field_labels.get(key, key)
                info_lines.append(f"• {label}: {value}")

        if contact.notes:
            info_lines.append(f"• Notas: {contact.notes}")

        return "\n".join(info_lines)


@tool
def get_missing_required_fields(
    agent_id: Annotated[int, "The agent ID to check field requirements"],
    contact_id: Annotated[Optional[int], "Contact ID if known"] = None,
    contact_phone: Annotated[Optional[str], "Contact phone to identify them"] = None,
    for_tool: Annotated[Optional[str], "Tool category to check requirements for (e.g., 'booking')"] = None,
) -> str:
    """
    Check which required/recommended fields are missing for a contact.

    Use this tool when:
    - Before attempting an action that requires certain fields
    - Planning what information to collect next
    - Checking if you have everything needed

    Returns list of missing fields that should be collected.
    """
    with Session(engine) as session:
        contact = None

        if contact_id:
            contact = session.get(Contact, contact_id)
        elif contact_phone:
            contact = session.exec(
                select(Contact)
                .where(Contact.phone == contact_phone)
                .where(Contact.is_active == True)
            ).first()

        if not contact:
            return "Contato não encontrado."

        # Get agent's field configs
        configs = session.exec(
            select(AgentFieldConfig)
            .where(AgentFieldConfig.agent_id == agent_id)
            .where(AgentFieldConfig.is_active == True)
        ).all()

        if not configs:
            return "Nenhum campo configurado para coleta."

        missing_required = []
        missing_recommended = []

        contact_data = contact.data or {}

        for config in configs:
            field = session.get(ContactField, config.field_id)
            if not field or not field.is_active:
                continue

            # Check if field has value
            has_value = field.key in contact_data and contact_data[field.key]

            # Also check core fields
            if field.key == "phone":
                has_value = bool(contact.phone)
            elif field.key == "email":
                has_value = bool(contact.email)
            elif field.key == "name":
                has_value = bool(contact.name)

            if has_value:
                continue

            # Check if required for specific tool
            if for_tool and config.required_for_tools:
                if for_tool in config.required_for_tools:
                    missing_required.append(field.label)
                    continue

            # Check general necessity
            if config.necessity == FieldNecessity.REQUIRED:
                missing_required.append(field.label)
            elif config.necessity == FieldNecessity.RECOMMENDED:
                missing_recommended.append(field.label)

        # Build response
        lines = []
        if missing_required:
            lines.append(f"**Obrigatórios:** {', '.join(missing_required)}")
        if missing_recommended:
            lines.append(f"**Recomendados:** {', '.join(missing_recommended)}")

        if not lines:
            return "✓ Todas as informações necessárias já foram coletadas."

        return "\n".join(lines)


# Export all tools
CONTACT_TOOLS = [
    save_contact_field,
    get_contact_info,
    get_missing_required_fields,
]
