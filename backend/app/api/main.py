from fastapi import APIRouter

from app.api.routes import agent, agents, builder, debug, labels, login, nina, stages, state, users, utils

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)

# Agent Builder routes
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])

# AI Agent Conversation (LangGraph)
api_router.include_router(agent.router, prefix="/agent", tags=["agent"])

# Nina v2 Debug (Context System v2)
api_router.include_router(nina.router, prefix="/nina", tags=["nina"])

# Debug tools (chunks, config inspection)
api_router.include_router(debug.router, prefix="/debug", tags=["debug"])

# Labels management
api_router.include_router(labels.router, prefix="/labels", tags=["labels"])

# State & Stages API (new ReAct system)
api_router.include_router(state.router)
api_router.include_router(stages.router)

# Builder AI
api_router.include_router(builder.router)
