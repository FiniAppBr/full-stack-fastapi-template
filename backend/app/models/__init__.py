"""ConnectAI data models."""

from sqlmodel import SQLModel

# Import all models so Alembic can discover them
from app.models.agent import Agent
from app.models.conversation_log import ConversationLog
from app.models.entity import Entity, EntityCreate, EntityUpdate, EntityPublic, EntitiesPublic
from app.models.knowledge import KnowledgeBase
from app.models.label import Label, ChunkLabel
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
]
