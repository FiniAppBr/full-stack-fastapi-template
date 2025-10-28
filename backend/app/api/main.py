from fastapi import APIRouter

from app.api.routes import agents, blocks, items, login, private, users, utils
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)

# Agent Builder routes
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
api_router.include_router(blocks.router, prefix="/blocks", tags=["blocks"])

if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
