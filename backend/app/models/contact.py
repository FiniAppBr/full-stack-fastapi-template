"""
Contact model - Customer/Lead data collected through conversations.

Contacts are:
- Created when agents interact with new customers
- Updated as agents learn more about the customer
- Used for pipeline management (CRM)
- Linked to conversations and bookings
"""
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON


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
