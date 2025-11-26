"""
Contact model - Customer/Lead data collected through conversations.

Contacts are:
- Created when agents interact with new customers
- Updated as agents learn more about the customer
- Used for pipeline management (CRM)
- Linked to conversations and bookings

Contact Schema System:
- ContactField: Workspace-level field definitions (what data can be collected)
- AgentFieldConfig: Agent-specific collection rules (which fields, necessity level)
- Contact.data: JSON storage for field values
"""
from datetime import datetime
from typing import Optional
from enum import Enum
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON, Text


# =============================================================================
# ENUMS
# =============================================================================

class FieldType(str, Enum):
    """Types of contact fields."""
    TEXT = "text"           # Free text
    NUMBER = "number"       # Numeric value
    SELECT = "select"       # Single selection from options
    MULTI_SELECT = "multi"  # Multiple selections
    DATE = "date"           # Date value
    BOOLEAN = "boolean"     # Yes/No
    PHONE = "phone"         # Phone number (with formatting)
    EMAIL = "email"         # Email address (with validation)


class FieldNecessity(str, Enum):
    """How important is this field for an agent to collect."""
    REQUIRED = "required"       # Agent must collect before key actions
    RECOMMENDED = "recommended" # Agent should try to collect naturally
    OPTIONAL = "optional"       # Collect if mentioned, don't ask


# =============================================================================
# CONTACT FIELD MODEL (Workspace-level schema definition)
# =============================================================================

class ContactFieldBase(SQLModel):
    """Base contact field definition."""
    key: str = Field(
        index=True,
        description="Unique key for this field (e.g., 'budget', 'bedrooms')"
    )
    label: str = Field(description="Display label (e.g., 'Orçamento', 'Quartos')")
    field_type: FieldType = Field(default=FieldType.TEXT)
    description: Optional[str] = Field(
        default=None,
        description="Help text shown to users and agents"
    )
    options: Optional[list[str]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Options for select/multi_select fields"
    )
    icon: Optional[str] = Field(
        default=None,
        description="Iconify icon name (e.g., 'solar:money-bag-bold')"
    )
    # Display options
    show_in_list: bool = Field(
        default=True,
        description="Show as column in contacts list"
    )
    show_in_card: bool = Field(
        default=True,
        description="Show in contact card/details"
    )


class ContactField(ContactFieldBase, table=True):
    """
    Contact field definition - workspace level.

    Defines what data CAN be collected about contacts.
    Each workspace has its own set of fields.

    Examples:
    - Real estate: budget, bedrooms, location_preference, move_in_date
    - Clinic: symptoms, insurance_provider, preferred_doctor
    - E-commerce: interests, clothing_size, preferred_brands
    """
    __tablename__ = "contact_fields"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Ordering
    display_order: int = Field(default=0, description="Order in UI")

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)


class ContactFieldCreate(ContactFieldBase):
    """Schema for creating a contact field."""
    display_order: Optional[int] = 0


class ContactFieldUpdate(SQLModel):
    """Schema for updating a contact field."""
    key: Optional[str] = None
    label: Optional[str] = None
    field_type: Optional[FieldType] = None
    description: Optional[str] = None
    options: Optional[list[str]] = None
    icon: Optional[str] = None
    show_in_list: Optional[bool] = None
    show_in_card: Optional[bool] = None
    display_order: Optional[int] = None


class ContactFieldPublic(ContactFieldBase):
    """Schema for public contact field response."""
    id: int
    display_order: int
    created_at: datetime
    updated_at: datetime


class ContactFieldsPublic(SQLModel):
    """Schema for list of contact fields."""
    data: list[ContactFieldPublic]
    count: int


# =============================================================================
# AGENT FIELD CONFIG (Agent-specific collection rules)
# =============================================================================

class AgentFieldConfigBase(SQLModel):
    """Links a contact field to an agent with collection rules."""
    agent_id: int = Field(description="NeoAgent ID")
    field_id: int = Field(description="ContactField ID")
    necessity: FieldNecessity = Field(
        default=FieldNecessity.OPTIONAL,
        description="How important is collecting this field"
    )
    collection_hint: Optional[str] = Field(
        default=None,
        sa_column=Column(Text),
        description="Hint for agent on how/when to collect (e.g., 'Ask early in conversation')"
    )
    required_for_tools: Optional[list[str]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Tool categories that require this field (e.g., ['booking', 'quote'])"
    )


class AgentFieldConfig(AgentFieldConfigBase, table=True):
    """
    Agent-specific field collection configuration.

    Determines:
    - Which fields this agent should collect
    - How important each field is
    - Which tools require the field

    Example:
    - Sales agent: budget (required), timeline (recommended)
    - Booking agent: phone (required for booking tool), email (optional)
    """
    __tablename__ = "agent_field_configs"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)


class AgentFieldConfigCreate(AgentFieldConfigBase):
    """Schema for creating an agent field config."""
    pass


class AgentFieldConfigUpdate(SQLModel):
    """Schema for updating an agent field config."""
    necessity: Optional[FieldNecessity] = None
    collection_hint: Optional[str] = None
    required_for_tools: Optional[list[str]] = None


class AgentFieldConfigPublic(AgentFieldConfigBase):
    """Schema for public agent field config response."""
    id: int
    created_at: datetime
    updated_at: datetime
    # Include field details for convenience
    field_key: Optional[str] = None
    field_label: Optional[str] = None
    field_type: Optional[FieldType] = None


class AgentFieldConfigsPublic(SQLModel):
    """Schema for list of agent field configs."""
    data: list[AgentFieldConfigPublic]
    count: int


# =============================================================================
# CONTACT MODEL
# =============================================================================

class ContactBase(SQLModel):
    """Base contact fields."""
    # Core identification
    name: str = Field(description="Contact name")
    phone: Optional[str] = Field(default=None, description="Phone number (primary identifier)")
    email: Optional[str] = Field(default=None, description="Email address")

    # Source tracking
    source: Optional[str] = Field(
        default="manual",
        description="How the contact was created: manual, agent, whatsapp, website, etc."
    )
    source_agent_id: Optional[str] = Field(
        default=None,
        description="Agent ID that created/captured this contact"
    )

    # Flexible data collected by agents
    data: dict = Field(
        default_factory=dict,
        sa_column=Column(JSON),
        description="Flexible JSON data collected about the contact (preferences, notes, interests, etc.)"
    )

    # Pipeline/CRM fields
    pipeline_stage: Optional[str] = Field(
        default=None,
        description="Current stage in the pipeline (e.g., 'lead', 'qualified', 'negotiation', 'won', 'lost')"
    )
    assigned_to: Optional[str] = Field(
        default=None,
        description="User ID assigned to this contact"
    )

    # Tags for filtering
    tags: Optional[list[str]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Tags for categorizing contacts"
    )

    # Notes
    notes: Optional[str] = Field(default=None, description="General notes about the contact")


class Contact(ContactBase, table=True):
    """
    Contact database model.

    Stores customer/lead information collected through:
    - Agent conversations (lead captation)
    - Manual entry
    - Form submissions
    - WhatsApp interactions
    """
    __tablename__ = "contacts"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Last interaction tracking
    last_interaction_at: Optional[datetime] = Field(
        default=None,
        description="Last time this contact interacted with any agent"
    )
    last_agent_id: Optional[str] = Field(
        default=None,
        description="Last agent that interacted with this contact"
    )

    # Conversation tracking
    conversation_count: int = Field(default=0, description="Number of conversations")

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Soft delete
    is_active: bool = Field(default=True)


class ContactCreate(ContactBase):
    """Schema for creating a contact."""
    pass


class ContactUpdate(SQLModel):
    """Schema for updating a contact."""
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    source: Optional[str] = None
    source_agent_id: Optional[str] = None
    data: Optional[dict] = None
    pipeline_stage: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: Optional[list[str]] = None
    notes: Optional[str] = None


class ContactPublic(ContactBase):
    """Schema for public contact response."""
    id: int
    last_interaction_at: Optional[datetime] = None
    last_agent_id: Optional[str] = None
    conversation_count: int = 0
    created_at: datetime
    updated_at: datetime


class ContactsPublic(SQLModel):
    """Schema for list of contacts."""
    data: list[ContactPublic]
    count: int
