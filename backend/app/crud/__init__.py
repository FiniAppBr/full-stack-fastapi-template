"""CRUD operations module."""

from app.crud.agent import (
    create_agent,
    delete_agent,
    get_agent,
    get_agents_by_owner,
    update_agent,
)
from app.crud.user import (
    authenticate,
    create_user,
    get_user_by_email,
    update_user,
)

__all__ = [
    # User CRUD
    "authenticate",
    "create_user",
    "get_user_by_email",
    "update_user",
    # Agent CRUD
    "create_agent",
    "get_agent",
    "get_agents_by_owner",
    "update_agent",
    "delete_agent",
]
