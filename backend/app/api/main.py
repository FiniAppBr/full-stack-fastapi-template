from fastapi import APIRouter

from app.api.routes import agent, agents, builder, login, stages, state, users, utils

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)

# Agent Builder routes
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])

# AI Agent Conversation (LangGraph)
api_router.include_router(agent.router, prefix="/agent", tags=["agent"])

# State & Stages API (new ReAct system)
api_router.include_router(state.router)
api_router.include_router(stages.router)

# Builder AI
api_router.include_router(builder.router)
