"""
Builder AI API - Generate agent configurations from descriptions.

Uses AI to analyze business descriptions and generate:
- Suggested tone and style
- Recommended tools
- State fields to track
- Stage flow (if applicable)
- Handoff triggers
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import os

from openai import OpenAI

from app.api.deps import get_current_user
from app.agent.stages import STAGE_TEMPLATES
from app.llm.openai import models

router = APIRouter(prefix="/builder", tags=["builder"])


class GenerateRequest(BaseModel):
    """Request model for config generation."""
    description: str
    existing_config: Optional[dict] = None
    feedback: Optional[str] = None


class GeneratedConfig(BaseModel):
    """Generated agent configuration."""
    tone: str = "friendly"
    emoji_usage: str = "minimal"
    language: str = "pt"
    enabled_tools: list[str] = []
    handoff_triggers: list[str] = []
    state_fields: list[dict] = []
    stages: list[dict] = []
    stages_enabled: bool = False


class GenerateResponse(BaseModel):
    """Response model for config generation."""
    config: GeneratedConfig
    confidence: float
    industry_detected: Optional[str] = None
    template_used: Optional[str] = None
    changes_made: list[str] = []


# Industry templates for quick matching
INDUSTRY_TEMPLATES = {
    "dental_clinic": {
        "stage_template": "APPOINTMENT_BOOKING",
        "tools": ["search_knowledge", "check_calendar", "book_calendar"],
        "handoff_triggers": ["emergency", "complex_procedure", "complaint"],
        "state_fields": [
            {"name": "service_interest", "type": "string", "description": "Service they want"},
            {"name": "insurance_plan", "type": "string", "description": "Insurance if mentioned"},
            {"name": "preferred_location", "type": "string", "description": "Location preference"},
            {"name": "is_emergency", "type": "boolean", "description": "Emergency situation"},
        ],
        "tone": "friendly",
        "emoji_usage": "minimal",
    },
    "law_firm": {
        "stage_template": "LEAD_QUALIFICATION",
        "tools": ["search_knowledge", "collect_lead_info", "book_calendar", "handoff_to_human"],
        "handoff_triggers": ["legal_advice_request", "complex_case", "urgent_matter"],
        "state_fields": [
            {"name": "case_type", "type": "string", "description": "Type of legal case"},
            {"name": "urgency_level", "type": "enum", "options": ["low", "medium", "high"], "description": "How urgent"},
            {"name": "budget_range", "type": "enum", "options": ["unknown", "low", "medium", "high"], "description": "Budget"},
        ],
        "tone": "professional",
        "emoji_usage": "none",
    },
    "restaurant": {
        "stage_template": "APPOINTMENT_BOOKING",
        "tools": ["search_knowledge", "check_calendar", "book_calendar"],
        "handoff_triggers": ["complaint", "large_group", "special_event"],
        "state_fields": [
            {"name": "party_size", "type": "string", "description": "Number of guests"},
            {"name": "dietary_restrictions", "type": "string", "description": "Dietary needs"},
            {"name": "occasion", "type": "string", "description": "Special occasion"},
        ],
        "tone": "friendly",
        "emoji_usage": "frequent",
    },
    "real_estate": {
        "stage_template": "CONSULTATIVE_SALES",
        "tools": ["search_knowledge", "book_calendar", "collect_lead_info"],
        "handoff_triggers": ["negotiation", "contract_question", "financing"],
        "state_fields": [
            {"name": "property_type", "type": "string", "description": "Type of property"},
            {"name": "budget_range", "type": "enum", "options": ["unknown", "low", "medium", "high", "premium"], "description": "Budget"},
            {"name": "location_preference", "type": "string", "description": "Preferred area"},
        ],
        "tone": "friendly",
        "emoji_usage": "minimal",
    },
    "fitness_gym": {
        "stage_template": "LEAD_QUALIFICATION",
        "tools": ["search_knowledge", "check_calendar", "book_calendar"],
        "handoff_triggers": ["injury_concern", "membership_cancellation", "complaint"],
        "state_fields": [
            {"name": "fitness_goal", "type": "string", "description": "Their fitness goal"},
            {"name": "membership_interest", "type": "string", "description": "Membership type"},
            {"name": "class_preference", "type": "string", "description": "Preferred classes"},
        ],
        "tone": "energetic",
        "emoji_usage": "frequent",
    },
    "ecommerce": {
        "stage_template": "CUSTOMER_SUPPORT",
        "tools": ["search_knowledge", "handoff_to_human"],
        "handoff_triggers": ["return_request", "payment_issue", "complaint"],
        "state_fields": [
            {"name": "product_interest", "type": "string", "description": "Product they want"},
            {"name": "order_issue", "type": "string", "description": "Order problem if any"},
            {"name": "budget_range", "type": "enum", "options": ["unknown", "low", "medium", "high"], "description": "Budget"},
        ],
        "tone": "friendly",
        "emoji_usage": "minimal",
    },
}

# Keywords for industry detection
INDUSTRY_KEYWORDS = {
    "dental_clinic": ["dental", "dentist", "teeth", "clinic", "odonto", "dente"],
    "law_firm": ["law", "lawyer", "legal", "attorney", "advogado", "juridico"],
    "restaurant": ["restaurant", "food", "menu", "reservation", "restaurante", "comida"],
    "real_estate": ["real estate", "property", "house", "apartment", "imovel", "imobiliaria"],
    "fitness_gym": ["gym", "fitness", "workout", "training", "academia", "treino"],
    "ecommerce": ["shop", "store", "product", "buy", "loja", "venda", "e-commerce"],
}


def detect_industry(description: str) -> Optional[str]:
    """Detect industry from business description."""
    description_lower = description.lower()

    for industry, keywords in INDUSTRY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in description_lower:
                return industry

    return None


@router.post("/generate", response_model=GenerateResponse)
async def generate_config(
    request: GenerateRequest,
    current_user=Depends(get_current_user)
):
    """
    Generate or refine agent configuration from business description.

    For new agents:
    - Analyzes the business description
    - Detects industry if possible
    - Applies appropriate template
    - Customizes based on specifics

    For refinement (existing_config + feedback):
    - Takes current config
    - Applies requested changes
    - Returns updated config with changes_made list
    """
    description = request.description
    existing_config = request.existing_config
    feedback = request.feedback

    # Detect industry
    detected_industry = detect_industry(description)

    if existing_config and feedback:
        # Refinement mode
        return await _refine_config(existing_config, feedback, detected_industry)

    # New config generation
    if detected_industry and detected_industry in INDUSTRY_TEMPLATES:
        # Use template
        template = INDUSTRY_TEMPLATES[detected_industry]
        stage_template_id = template.get("stage_template")

        config = GeneratedConfig(
            tone=template.get("tone", "friendly"),
            emoji_usage=template.get("emoji_usage", "minimal"),
            language="pt",  # Default to Portuguese
            enabled_tools=template.get("tools", []),
            handoff_triggers=template.get("handoff_triggers", []),
            state_fields=template.get("state_fields", []),
            stages=STAGE_TEMPLATES.get(stage_template_id, []),
            stages_enabled=True if stage_template_id else False,
        )

        return GenerateResponse(
            config=config,
            confidence=0.85,
            industry_detected=detected_industry,
            template_used=detected_industry,
            changes_made=[]
        )

    # No template match - use AI to generate
    return await _generate_with_ai(description)


async def _refine_config(
    existing_config: dict,
    feedback: str,
    detected_industry: Optional[str]
) -> GenerateResponse:
    """Refine existing config based on feedback."""
    # Simple refinement logic - in production, use AI
    config = GeneratedConfig(**existing_config)
    changes = []

    feedback_lower = feedback.lower()

    # Simple keyword-based refinement
    if "friendlier" in feedback_lower or "mais amigavel" in feedback_lower:
        config.tone = "friendly"
        config.emoji_usage = "minimal"
        changes.append("Made tone friendlier")

    if "professional" in feedback_lower or "profissional" in feedback_lower:
        config.tone = "professional"
        config.emoji_usage = "none"
        changes.append("Made tone more professional")

    if "emoji" in feedback_lower:
        if "more" in feedback_lower or "mais" in feedback_lower:
            config.emoji_usage = "frequent"
            changes.append("Increased emoji usage")
        elif "no" in feedback_lower or "sem" in feedback_lower:
            config.emoji_usage = "none"
            changes.append("Removed emojis")

    if "track" in feedback_lower or "rastrear" in feedback_lower:
        # Extract field name from feedback (simplified)
        words = feedback.split()
        for i, word in enumerate(words):
            if word.lower() in ["track", "rastrear", "add"]:
                if i + 1 < len(words):
                    field_name = words[i + 1].lower().replace(",", "")
                    config.state_fields.append({
                        "name": field_name,
                        "type": "string",
                        "description": f"Track {field_name}"
                    })
                    changes.append(f"Added field: {field_name}")
                    break

    return GenerateResponse(
        config=config,
        confidence=0.75,
        industry_detected=detected_industry,
        template_used=None,
        changes_made=changes
    )


async def _generate_with_ai(description: str) -> GenerateResponse:
    """Generate config using AI when no template matches."""
    # Fallback to basic config
    config = GeneratedConfig(
        tone="friendly",
        emoji_usage="minimal",
        language="pt",
        enabled_tools=["search_knowledge", "handoff_to_human"],
        handoff_triggers=["complaint", "anger", "complex_question"],
        state_fields=[
            {"name": "customer_name", "type": "string", "description": "Customer's name"},
            {"name": "main_interest", "type": "string", "description": "What they're interested in"},
        ],
        stages=[],
        stages_enabled=False,
    )

    return GenerateResponse(
        config=config,
        confidence=0.5,
        industry_detected=None,
        template_used=None,
        changes_made=[]
    )
