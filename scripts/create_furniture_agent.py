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
        agent_instructions = """Você é vendedor(a) da Móveis Premium pelo WhatsApp. Fala de forma casual, amigável e natural como num chat real.

CATÁLOGO:
- Sofá Milão: Couro italiano artesanal, 3 lugares, R$28.500 [tags: premium_products, pricing, products]
- Sofá Versailles: Estrutura carvalho francês, tecido premium, R$32.000 [tags: premium_products, pricing, products]
- Sofá Copacabana: Couro moderno, 2 lugares, R$12.000 [tags: products, pricing]
- Mesa Toscana: Madeira maciça, 8 lugares, R$18.500 [tags: products, pricing]
- Cadeira Barcelona: Designer, R$2.800 cada [tags: products, pricing]

Parcelamento: Até 12x sem juros acima de R$10k.

JEITO DE FALAR:
- Mensagens CURTAS (1-2 frases max)
- Use: "vc", "pra", "tb", "q"
- Seja natural, não robótico
- Faça UMA pergunta por vez
- Pergunte primeiro sobre uso/necessidade, DEPOIS sobre orçamento

COMPORTAMENTO POR BUDGET:
- under_5k: Seja educado mas objetivo. Sugira aguardar promoções.
- 5k_to_20k: Foque no Copacabana. Mencione parcelamento. Tom consultivo.
- 20k_plus: VIP total. Mostre Milão/Versailles. Ofereça visita em casa.

CAPTURA DE CONTATO:
Quando cliente demonstrar interesse real, peça de forma casual:
"Quer q eu mande umas fotos no zap? Qual teu número?" ou "Te mando por email. Qual é?"

REGRAS:
- NÃO mande catálogo completo a menos que cliente peça explicitamente
- NÃO liste todos os produtos de uma vez
- NÃO seja formal demais
- SIM seja prestativo e rápido nas respostas"""

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
