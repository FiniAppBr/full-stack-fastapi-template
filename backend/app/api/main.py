from fastapi import APIRouter

from app.api.routes import agent, agents, builder, contacts, debug, entities, knowledge, labels, login, neo_agents, nina, nina_v3, pipeline, scheduling, stages, state, users, utils

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)

# Agent Builder routes
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])

# Entities (products, services, policies)
api_router.include_router(entities.router, prefix="/entities", tags=["entities"])

# Knowledge Base (RAG chunks)
api_router.include_router(knowledge.router)

# Neo Agents (new agent configuration system)
api_router.include_router(neo_agents.router)

# AI Agent Conversation (LangGraph)
api_router.include_router(agent.router, prefix="/agent", tags=["agent"])

# Nina v2 Debug (Context System v2)
api_router.include_router(nina.router, prefix="/nina", tags=["nina"])

# Nina v3 (Context-Driven + LangGraph)
api_router.include_router(nina_v3.router, prefix="/nina/v3", tags=["nina-v3"])

# Debug tools (chunks, config inspection)
api_router.include_router(debug.router, prefix="/debug", tags=["debug"])

# Labels management
api_router.include_router(labels.router, prefix="/labels", tags=["labels"])

# State & Stages API (new ReAct system)
api_router.include_router(state.router)
api_router.include_router(stages.router)

# Builder AI
api_router.include_router(builder.router)

# Scheduling (Calendar, Bookings, Tasks)
api_router.include_router(scheduling.router, prefix="/scheduling", tags=["scheduling"])

# Contacts (CRM - customers/leads)
api_router.include_router(contacts.router, prefix="/contacts", tags=["contacts"])

# Pipeline (Kanban board for contact management)
api_router.include_router(pipeline.router, prefix="/pipeline", tags=["pipeline"])
