"""ConnectAI data models."""

from sqlmodel import SQLModel

# Import all models so Alembic can discover them
from app.models.agent import Agent
from app.models.block import Block
from app.models.user import (
    Item,
    ItemBase,
    ItemCreate,
    ItemPublic,
    ItemsPublic,
    ItemUpdate,
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
    # Item models (existing demo)
    "Item",
    "ItemBase",
    "ItemCreate",
    "ItemPublic",
    "ItemsPublic",
    "ItemUpdate",
    # Auth models
    "Token",
    "TokenPayload",
    "NewPassword",
    "Message",
    # Agent models
    "Agent",
    # Block model
    "Block",
]
