from fastapi import APIRouter

from app.api.routes import agents, analytics, chat, contacts, debug, entities, knowledge, labels, login, neo_agents, operations, pipeline, scheduling, users, utils

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

# Agent Chat (LangGraph)
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])

# Debug tools (chunks, config inspection)
api_router.include_router(debug.router, prefix="/debug", tags=["debug"])

# Labels management
api_router.include_router(labels.router, prefix="/labels", tags=["labels"])

# Scheduling (Calendar, Bookings, Tasks)
api_router.include_router(scheduling.router, prefix="/scheduling", tags=["scheduling"])

# Contacts (CRM - customers/leads)
api_router.include_router(contacts.router, prefix="/contacts", tags=["contacts"])

# Pipeline (Kanban board for contact management)
api_router.include_router(pipeline.router, prefix="/pipeline", tags=["pipeline"])

# Operations (Booking configs, inventory, entity links)
api_router.include_router(operations.router, prefix="/operations", tags=["operations"])

# Analytics (Agent conversation analytics)
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
