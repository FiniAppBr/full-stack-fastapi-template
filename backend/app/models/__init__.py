"""ConnectAI data models."""

from sqlmodel import SQLModel

# Import all models so Alembic can discover them
from app.models.agent import Agent
from app.models.conversation_log import ConversationLog
from app.models.entity import Entity, EntityCreate, EntityUpdate, EntityPublic, EntitiesPublic
from app.models.knowledge import KnowledgeBase
from app.models.neo_agent import NeoAgent, NeoAgentCreate, NeoAgentUpdate, NeoAgentPublic, NeoAgentsPublic
from app.models.label import Label, ChunkLabel
from app.models.agent_log import AgentLog, AgentLogCreate, AgentLogPublic
from app.models.scheduling import (
    Schedule, ScheduleCreate, ScheduleUpdate, SchedulePublic, SchedulesPublic,
    Booking, BookingCreate, BookingUpdate, BookingPublic, BookingsPublic,
    BookingStatus,
    Task, TaskCreate, TaskUpdate, TaskPublic, TasksPublic,
    TaskStatus, TaskPriority, TaskType,
    TimeSlot, AvailabilityQuery, AvailabilityResponse,
)
from app.models.operations import (
    EntityLink, EntityLinkCreate, EntityLinkPublic,
    BookingConfig, BookingConfigCreate, BookingConfigUpdate, BookingConfigPublic,
    Inventory, InventoryCreate, InventoryUpdate, InventoryPublic,
)
from app.models.user import (
    Message,
    NewPassword,
    Token,
    TokenPayload,
    UpdatePassword,
    User,
    UserBase,
    UserCreate,
    UserPublic,
    UsersPublic,
    UserRegister,
    UserUpdate,
    UserUpdateMe,
)

__all__ = [
    # SQLModel base
    "SQLModel",
    # User models
    "User",
    "UserBase",
    "UserCreate",
    "UserPublic",
    "UsersPublic",
    "UserRegister",
    "UserUpdate",
    "UserUpdateMe",
    "UpdatePassword",
    # Auth models
    "Token",
    "TokenPayload",
    "NewPassword",
    "Message",
    # Agent models
    "Agent",
    # Entity models
    "Entity",
    "EntityCreate",
    "EntityUpdate",
    "EntityPublic",
    "EntitiesPublic",
    # Analytics models
    "ConversationLog",
    # Knowledge models
    "KnowledgeBase",
    # Label models
    "Label",
    "ChunkLabel",
    # Neo Agent models
    "NeoAgent",
    "NeoAgentCreate",
    "NeoAgentUpdate",
    "NeoAgentPublic",
    "NeoAgentsPublic",
    # Scheduling models
    "Schedule",
    "ScheduleCreate",
    "ScheduleUpdate",
    "SchedulePublic",
    "SchedulesPublic",
    "Booking",
    "BookingCreate",
    "BookingUpdate",
    "BookingPublic",
    "BookingsPublic",
    "BookingStatus",
    "Task",
    "TaskCreate",
    "TaskUpdate",
    "TaskPublic",
    "TasksPublic",
    "TaskStatus",
    "TaskPriority",
    "TaskType",
    "TimeSlot",
    "AvailabilityQuery",
    "AvailabilityResponse",
    # Operations models
    "EntityLink",
    "EntityLinkCreate",
    "EntityLinkPublic",
    "BookingConfig",
    "BookingConfigCreate",
    "BookingConfigUpdate",
    "BookingConfigPublic",
    "Inventory",
    "InventoryCreate",
    "InventoryUpdate",
    "InventoryPublic",
    # Agent Log models
    "AgentLog",
    "AgentLogCreate",
    "AgentLogPublic",
]
