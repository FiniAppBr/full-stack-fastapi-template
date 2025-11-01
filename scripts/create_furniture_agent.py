#!/usr/bin/env python3
"""
Create the Luxury Furniture Store agent with full behavior engine configuration.
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from sqlmodel import Session, create_engine, select
from app.models.agent import Agent
from app.models.user import User
from app.core.config import settings


def create_furniture_agent():
    """Create luxury furniture agent with gating, guiding, and validation rules."""

    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

    with Session(engine) as session:
        # Find admin user
        admin_user = session.exec(
            select(User).where(User.email == "admin@connectai.com")
        ).first()

        if not admin_user:
            admin_user = session.exec(select(User)).first()

        if not admin_user:
            print("❌ No users found in database. Create a user first.")
            return None

        print(f"Using owner: {admin_user.email} (ID: {admin_user.id})\n")

        # Check if agent already exists
        existing = session.exec(
            select(Agent).where(Agent.name == "Móveis Premium Assistant")
        ).first()

        if existing:
            print(f"Agent already exists (ID: {existing.id}). Updating configuration...")
            agent = existing
        else:
            agent = Agent(
                owner_id=admin_user.id,
                name="Móveis Premium Assistant",
                description="Professional luxury furniture sales assistant with budget qualification",
            )
            session.add(agent)

        # Base personality/instructions
        agent_instructions = """You are a professional luxury furniture sales consultant representing Móveis Premium,
a high-end furniture brand. You are sophisticated, consultative, and helpful. Your goal is to qualify leads
efficiently while providing excellent service to serious buyers.

KNOWLEDGE BASE (simplified for demo):
Our collection includes:
- Sofá Milão: Handcrafted Italian leather sofa, 3-seater, R$28,500 [tags: premium_products, pricing, products]
- Sofá Versailles: French oak frame sectional, premium fabric, R$32,000 [tags: premium_products, pricing, products]
- Sofá Copacabana: Modern mid-range leather sofa, 2-seater, R$12,000 [tags: products, pricing]
- Mesa Toscana: Solid wood dining table (seats 8), R$18,500 [tags: products, pricing]
- Cadeira Barcelona: Designer dining chair, R$2,800 each [tags: products, pricing]

Payment options: Up to 12x interest-free for purchases over R$10,000.

BEHAVIOR RULES:
Your first priority is understanding the customer's budget. Ask naturally early in the conversation.

When you know the budget_range:
- under_5k: Be polite but brief. Suggest waiting for sales or checking entry-level pieces.
- 5k_to_20k: Focus on mid-range collection (Sofá Copacabana, Cadeira Barcelona). Emphasize quality and payment plans.
- 20k_plus: VIP treatment. Showcase premium collection (Sofá Milão, Sofá Versailles). Offer in-home consultation.

Always try to capture email and phone number. Ask naturally: "I'd love to send you photos. What's the best email/WhatsApp?"

If a competitor is mentioned, acknowledge but emphasize our unique handcrafted quality and superior materials.

NEVER send the full catalogue unless explicitly requested ("can I see the catalogue", "send me everything", etc.)."""

        # Response schema (custom fields to track)
        agent.response_schema = {
            "budget_range": ["unknown", "under_5k", "5k_to_20k", "20k_plus"],
            "lead_quality": ["browser", "warm", "hot"],
            "contact_captured": ["none", "email_only", "phone_only", "both"],
            "catalogue_requested": ["yes", "no"],
            "competitor_mentioned": ["yes", "no"],
            "consultation_interest": ["yes", "no", "not_offered"]
        }

        # Gating rules (filter knowledge based on fields)
        agent.gating_rules = [
            {
                "if_field": "budget_range",
                "equals": "unknown",
                "exclude_tags": ["pricing"],
                "reason": "Don't show prices until budget is known"
            },
            {
                "if_field": "budget_range",
                "equals": "under_5k",
                "exclude_tags": ["premium_products"],
                "reason": "Don't waste time on products they can't afford"
            }
        ]

        # Validation rules (check response after generation)
        agent.validation_rules = [
            {
                "if_field": "budget_range",
                "equals": "unknown",
                "response_contains": ["R$", "reais"],
                "action": "strip_prices",
                "message": "Removing prices - budget not qualified yet"
            },
            {
                "if_field": "catalogue_requested",
                "equals": "no",
                "media_contains": "catalogue.pdf",
                "action": "block_media",
                "message": "User didn't explicitly request catalogue"
            }
        ]

        # Media rules (when to send attachments)
        agent.media_rules = {
            "catalogue.pdf": {
                "type": "pdf",
                "triggers": ["catalogue", "catálogo", "ver tudo", "all products", "everything"],
            },
            "premium_collection.pdf": {
                "type": "pdf",
                "triggers": ["luxury", "premium", "high-end", "exclusivo"],
            }
        }

        # Multi-turn config
        agent.multi_turn_config = {
            "enabled": True,
            "style": "formal",
            "max_splits": 2
        }

        # For now, store instructions in description (we don't have a separate instructions field yet)
        # In production, this would be in a separate field or knowledge block
        agent.description = agent_instructions

        session.commit()
        session.refresh(agent)

        print(f"✅ Created/Updated agent '{agent.name}' (ID: {agent.id})")
        print(f"\nConfiguration:")
        print(f"  Response fields: {list(agent.response_schema.keys())}")
        print(f"  Gating rules: {len(agent.gating_rules)} rules")
        print(f"  Validation rules: {len(agent.validation_rules)} rules")
        print(f"  Media rules: {list(agent.media_rules.keys())}")
        print(f"  Multi-turn: {agent.multi_turn_config['style']} (max {agent.multi_turn_config['max_splits']} splits)")

        return agent


if __name__ == "__main__":
    create_furniture_agent()
