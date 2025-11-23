"""
Conversation Stages - Optional sales funnel / state machine.

Provides:
1. Stage model definition
2. Transition logic (when to move to next stage)
3. Stage-scoped behavior (RAG tags, blocked topics)

Design: YAGNI - Single file until we have 100+ lines of stage logic.
"""
from typing import Optional
from pydantic import BaseModel


class ConversationStage(BaseModel):
    """
    A stage in the conversation flow.

    Stages allow controlling the conversation funnel:
    - Discovery: Understand customer needs
    - Presentation: Show relevant products/services
    - Objection Handling: Address concerns
    - Closing: Book appointment / capture lead

    Example:
        {
            "id": "discovery",
            "name": "Discovery",
            "goal": "Understand what the customer is looking for",
            "instructions": "Ask open-ended questions about their needs...",
            "allowed_topics": ["products", "services", "needs"],
            "blocked_topics": ["pricing", "competitors"],
            "transition_when": ["needs_identified", "budget_mentioned"],
            "rag_tags": ["products", "services"],
            "next_stage": "presentation"
        }
    """
    id: str
    name: str
    goal: str
    instructions: str = ""
    example_lines: list[str] = []
    allowed_topics: list[str] = []
    blocked_topics: list[str] = []
    transition_when: list[str] = []
    rag_tags: list[str] = []
    next_stage: Optional[str] = None


def get_stage_by_id(stages: list[dict], stage_id: str) -> Optional[ConversationStage]:
    """
    Find a stage by its ID.

    Args:
        stages: List of stage dicts from agent config
        stage_id: Stage ID to find

    Returns:
        ConversationStage or None if not found
    """
    if not stages or not stage_id:
        return None

    for stage_dict in stages:
        if stage_dict.get("id") == stage_id:
            return ConversationStage(**stage_dict)

    return None


def check_stage_transition(
    current_stage: ConversationStage,
    state: dict
) -> Optional[str]:
    """
    Check if we should transition to the next stage.

    Evaluates transition_when conditions against current state.

    Args:
        current_stage: The current ConversationStage
        state: Current conversation state dict

    Returns:
        next_stage ID if transition should occur, None otherwise
    """
    if not current_stage or not current_stage.transition_when:
        return None

    # Check each transition condition
    for condition in current_stage.transition_when:
        # Conditions are field names that should have non-null/non-default values
        # e.g., "needs_identified" checks if state["needs_identified"] is truthy

        # Handle simple field checks
        if condition in state:
            value = state.get(condition)
            # Consider transition if field has a meaningful value
            if value and value not in ["unknown", "none", "not_mentioned", ""]:
                return current_stage.next_stage

        # Handle compound conditions like "budget_range != unknown"
        if " " in condition:
            parts = condition.split()
            if len(parts) == 3:
                field, operator, expected = parts
                actual = state.get(field)
                if operator == "==" and actual == expected:
                    return current_stage.next_stage
                elif operator == "!=" and actual != expected:
                    return current_stage.next_stage

    return None


def get_stage_instructions(stage: Optional[ConversationStage]) -> str:
    """
    Get formatted instructions for the current stage.

    Args:
        stage: Current stage or None

    Returns:
        Instruction string to include in system prompt
    """
    if not stage:
        return ""

    parts = [f"## Current Stage: {stage.name}"]
    parts.append(f"Goal: {stage.goal}")

    if stage.instructions:
        parts.append(f"\n{stage.instructions}")

    if stage.example_lines:
        parts.append("\nExample phrases you can use:")
        for line in stage.example_lines:
            parts.append(f"  - \"{line}\"")

    if stage.blocked_topics:
        parts.append(f"\nDO NOT discuss yet: {', '.join(stage.blocked_topics)}")

    return "\n".join(parts)


def get_stage_rag_tags(stage: Optional[ConversationStage]) -> list[str]:
    """
    Get RAG filter tags for the current stage.

    Stage-scoped RAG reduces irrelevant context:
    - Discovery: ["products", "categories"]
    - Pricing: ["pricing", "promotions"]

    Args:
        stage: Current stage or None

    Returns:
        List of tags to filter knowledge search
    """
    if not stage or not stage.rag_tags:
        return []  # Empty = search all

    return stage.rag_tags


# ============================================================================
# STAGE TEMPLATES - Pre-built flows users can select
# ============================================================================

STAGE_TEMPLATES = {
    "CONSULTATIVE_SALES": [
        {
            "id": "connection",
            "name": "Connection",
            "goal": "Build rapport and identify the customer",
            "instructions": "Greet warmly, ask their name, make them feel welcome.",
            "example_lines": ["Ola! Que bom ter voce aqui!", "Como posso te chamar?"],
            "allowed_topics": ["greeting", "introduction"],
            "blocked_topics": ["pricing", "competitors"],
            "transition_when": ["customer_name != unknown"],
            "rag_tags": [],
            "next_stage": "discovery"
        },
        {
            "id": "discovery",
            "name": "Discovery",
            "goal": "Understand customer needs and pain points",
            "instructions": "Ask open questions. Listen for budget hints, timeline, preferences.",
            "example_lines": ["O que voce esta procurando?", "Conta mais sobre o que precisa!"],
            "allowed_topics": ["needs", "preferences", "timeline"],
            "blocked_topics": ["pricing", "competitors"],
            "transition_when": ["service_interest != unknown", "budget_range != unknown"],
            "rag_tags": ["products", "services", "categories"],
            "next_stage": "presentation"
        },
        {
            "id": "presentation",
            "name": "Presentation",
            "goal": "Present relevant solutions based on discovered needs",
            "instructions": "Match their needs to your offerings. Highlight benefits, not features.",
            "example_lines": ["Baseado no que voce me contou...", "Tenho algo perfeito pra voce!"],
            "allowed_topics": ["products", "services", "benefits", "pricing"],
            "blocked_topics": [],
            "transition_when": ["product_interest != unknown"],
            "rag_tags": ["products", "pricing", "benefits"],
            "next_stage": "objection_handling"
        },
        {
            "id": "objection_handling",
            "name": "Objection Handling",
            "goal": "Address concerns and build confidence",
            "instructions": "Listen to objections, acknowledge, provide evidence/testimonials.",
            "example_lines": ["Entendo sua preocupacao...", "Muitos clientes tinham a mesma duvida..."],
            "allowed_topics": ["objections", "guarantees", "testimonials", "comparisons"],
            "blocked_topics": [],
            "transition_when": ["objections_addressed == true"],
            "rag_tags": ["testimonials", "guarantees", "faq"],
            "next_stage": "closing"
        },
        {
            "id": "closing",
            "name": "Closing",
            "goal": "Secure commitment - appointment, sale, or next step",
            "instructions": "Create urgency, offer to book, ask for the sale.",
            "example_lines": ["Posso agendar pra voce?", "Vamos fechar?"],
            "allowed_topics": ["booking", "payment", "next_steps"],
            "blocked_topics": [],
            "transition_when": ["appointment_booked == true", "sale_completed == true"],
            "rag_tags": ["booking", "payment", "policies"],
            "next_stage": "follow_up"
        },
        {
            "id": "follow_up",
            "name": "Follow Up",
            "goal": "Confirm details and ensure satisfaction",
            "instructions": "Recap what was agreed, provide confirmation, offer support.",
            "example_lines": ["Confirmado!", "Qualquer duvida, estou aqui!"],
            "allowed_topics": ["confirmation", "support"],
            "blocked_topics": [],
            "transition_when": [],
            "rag_tags": ["policies", "support"],
            "next_stage": None
        }
    ],

    "LEAD_QUALIFICATION": [
        {
            "id": "greeting",
            "name": "Greeting",
            "goal": "Welcome and identify the contact",
            "instructions": "Professional greeting, ask how you can help.",
            "transition_when": ["customer_name != unknown"],
            "next_stage": "need_identification"
        },
        {
            "id": "need_identification",
            "name": "Need Identification",
            "goal": "Understand what service they need",
            "instructions": "Ask about their situation, problem, or goal.",
            "transition_when": ["service_needed != unknown"],
            "rag_tags": ["services"],
            "next_stage": "budget_check"
        },
        {
            "id": "budget_check",
            "name": "Budget Check",
            "goal": "Qualify budget fit",
            "instructions": "Gently probe for budget range without being pushy.",
            "transition_when": ["budget_range != unknown"],
            "next_stage": "timeline_check"
        },
        {
            "id": "timeline_check",
            "name": "Timeline Check",
            "goal": "Understand urgency and decision timeline",
            "instructions": "Ask when they need this done, when they plan to decide.",
            "transition_when": ["urgency_level != unknown"],
            "next_stage": "handoff"
        },
        {
            "id": "handoff",
            "name": "Handoff/Schedule",
            "goal": "Connect with human or book consultation",
            "instructions": "Offer to schedule a call or consultation with the team.",
            "transition_when": ["appointment_booked == true"],
            "rag_tags": ["booking"],
            "next_stage": None
        }
    ],

    "CUSTOMER_SUPPORT": [
        {
            "id": "greeting",
            "name": "Greeting",
            "goal": "Welcome and identify the issue type",
            "instructions": "Greet, ask what they need help with.",
            "transition_when": ["issue_type != unknown"],
            "next_stage": "issue_identification"
        },
        {
            "id": "issue_identification",
            "name": "Issue Identification",
            "goal": "Fully understand the problem",
            "instructions": "Ask clarifying questions, get details about the issue.",
            "transition_when": ["issue_details_collected == true"],
            "rag_tags": ["faq", "troubleshooting"],
            "next_stage": "solution_search"
        },
        {
            "id": "solution_search",
            "name": "Solution Search",
            "goal": "Find and present solution",
            "instructions": "Search knowledge base, provide step-by-step solution.",
            "transition_when": ["solution_provided == true"],
            "rag_tags": ["solutions", "how-to"],
            "next_stage": "resolution"
        },
        {
            "id": "resolution",
            "name": "Resolution",
            "goal": "Confirm issue is resolved",
            "instructions": "Ask if the solution worked, offer alternatives if not.",
            "transition_when": ["issue_resolved == true"],
            "next_stage": "satisfaction"
        },
        {
            "id": "satisfaction",
            "name": "Satisfaction Check",
            "goal": "Ensure customer is satisfied",
            "instructions": "Ask if there's anything else, thank them.",
            "transition_when": [],
            "next_stage": None
        }
    ],

    "APPOINTMENT_BOOKING": [
        {
            "id": "greeting",
            "name": "Greeting",
            "goal": "Welcome and identify service interest",
            "instructions": "Greet, ask what service they're interested in.",
            "transition_when": ["service_selected != unknown"],
            "rag_tags": ["services"],
            "next_stage": "service_selection"
        },
        {
            "id": "service_selection",
            "name": "Service Selection",
            "goal": "Confirm the service they want",
            "instructions": "Confirm service choice, explain what it includes.",
            "transition_when": ["service_confirmed == true"],
            "rag_tags": ["services", "pricing"],
            "next_stage": "availability"
        },
        {
            "id": "availability",
            "name": "Availability Check",
            "goal": "Find a suitable time slot",
            "instructions": "Check calendar, offer available times.",
            "transition_when": ["preferred_date != unknown"],
            "next_stage": "booking"
        },
        {
            "id": "booking",
            "name": "Booking",
            "goal": "Complete the booking",
            "instructions": "Confirm details, book the appointment.",
            "transition_when": ["appointment_booked == true"],
            "next_stage": "confirmation"
        },
        {
            "id": "confirmation",
            "name": "Confirmation",
            "goal": "Confirm and provide details",
            "instructions": "Send confirmation, provide address/instructions.",
            "transition_when": [],
            "rag_tags": ["location", "policies"],
            "next_stage": None
        }
    ]
}
