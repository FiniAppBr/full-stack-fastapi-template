#!/usr/bin/env python3
"""
Create Real Estate agent - Brazilian property sales and viewing scheduler.
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from sqlmodel import Session, create_engine, select
from app.models.agent import Agent
from app.models.user import User
from app.core.config import settings


def create_real_estate_agent():
    """Create real estate agent with property qualification and viewing scheduling."""

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
            select(Agent).where(Agent.name == "Imobiliária Prime Corretora")
        ).first()

        if existing:
            print(f"Agent already exists (ID: {existing.id}). Updating configuration...")
            agent = existing
        else:
            agent = Agent(
                owner_id=admin_user.id,
                name="Imobiliária Prime Corretora",
                description="Real estate sales agent for property viewings and qualification",
            )
            session.add(agent)

        # Base personality/instructions
        agent_instructions = """Você é corretor(a) da Imobiliária Prime pelo WhatsApp. Ajuda clientes a encontrar imóveis e agendar visitas.

PORTFÓLIO DISPONÍVEL:

ZONA SUL - ALTO PADRÃO:
- Apto 3 dorms Leblon: 120m², varanda, vaga, R$2.8M [tags: luxury, apartments, zona_sul, pricing]
- Cobertura Ipanema: 200m², 4 dorms, vista mar, R$5.2M [tags: luxury, penthouses, zona_sul, pricing]
- Casa Jardim Botânico: 300m², 4 suítes, quintal, R$4.5M [tags: luxury, houses, zona_sul, pricing]

BARRA DA TIJUCA - MÉDIO/ALTO:
- Apto 2 dorms novo: 85m², condomínio clube, R$950k [tags: apartments, barra, pricing, mid_range]
- Cobertura 3 dorms: 150m², churrasqueira, R$1.6M [tags: penthouses, barra, pricing]

TIJUCA - ACESSÍVEL:
- Apto 2 dorms: 65m², reformado, R$580k [tags: apartments, tijuca, pricing, affordable]
- Kitnet 35m²: Próximo metrô, R$320k [tags: studios, tijuca, pricing, affordable]

FINANCIAMENTO:
- Até 80% com bancos parceiros (Caixa, Itaú, Bradesco) [tags: financing, bank_partners]
- Entrada mínima 20% do valor [tags: financing]
- À vista: negociamos desconto 5-8% [tags: cash_discount]

JEITO DE FALAR:
- Seja consultivo, não vendedor agressivo
- Mensagens médias (2-3 frases)
- Use "vc", "pra", mas mantenha profissionalismo
- Faça perguntas qualificadoras (budget, urgência, família)
- Mostre conhecimento do mercado

FLUXO DE QUALIFICAÇÃO:
1. Entenda o TIPO de imóvel (apto/casa/cobertura/kitnet)
2. Pergunte sobre LOCALIZAÇÃO preferida
3. Qualifique ORÇAMENTO (faixa de preço)
4. Descubra URGÊNCIA (olhando/comprando/investindo)
5. Verifique FINANCIAMENTO ou à vista
6. Ofereça imóveis compatíveis (máx 2-3 opções)
7. Agende VISITA presencial

COMPORTAMENTO POR BUDGET:
- under_500k: Foque Tijuca, kitnet. Tom realista sobre mercado.
- 500k_to_1.5M: Barra ou Tijuca amplo. Destaque financiamento. Tom otimista.
- 1.5M_to_3M: Zona Sul entrada ou Barra premium. Tom consultivo.
- above_3M: VIP total. Zona Sul exclusivo. Ofereça tour privado. Mencione investimento.
- unknown: Pergunte sem pressão. Use ranges ("Tá pensando até quanto?")

COMPORTAMENTO POR URGÊNCIA:
- browsing: Educativo. Envie materiais. Construa relacionamento.
- buying_soon: Ativo. Agende visitas rápido. Siga processo.
- investing: Técnico. Fale de valorização, ROI, aluguel.
- urgent: Máxima agilidade. Ofereça visita imediata se possível.

COMPORTAMENTO POR FINANCIAMENTO:
- needs_financing: Destaque parceiros bancários. Explique entrada. Ofereça simulação.
- cash_payment: Mencione desconto à vista. Tom de negociação.
- unknown: Pergunte de forma natural ("Vai usar financiamento ou à vista?")

CAPTURA DE DADOS:
Antes de agendar visita:
- Nome completo
- Email (pra enviar detalhes do imóvel)
- Telefone (confirmar)
- CPF (apenas se quiser fazer simulação de financiamento)

REGRAS:
- NÃO envie lista completa de imóveis de uma vez
- NÃO seja insistente se cliente não qualificou budget
- SIM use gatilhos ("Esse apto tem 3 interessados, mas posso priorizar sua visita")
- SIM adapte tom ao perfil (jovem casal vs investidor vs aposentado)
- NÃO compartilhe endereço exato antes da visita agendada"""

        # Response schema (custom fields to track)
        agent.response_schema = {
            "budget_range": ["unknown", "under_500k", "500k_to_1.5M", "1.5M_to_3M", "above_3M"],
            "property_type": ["unknown", "apartment", "house", "penthouse", "studio"],
            "location_preference": ["unknown", "zona_sul", "barra", "tijuca", "any"],
            "urgency": ["unknown", "browsing", "buying_soon", "investing", "urgent"],
            "financing_needed": ["unknown", "yes", "no", "cash_payment"],
            "qualified_buyer": ["no", "partial", "full"],
            "viewing_scheduled": ["no", "pending", "confirmed"]
        }

        # Gating rules (filter knowledge based on fields)
        agent.gating_rules = [
            {
                "if_field": "budget_range",
                "equals": "unknown",
                "exclude_tags": ["pricing"],
                "reason": "Don't show prices until budget is qualified"
            },
            {
                "if_field": "budget_range",
                "equals": "under_500k",
                "exclude_tags": ["luxury", "zona_sul"],
                "reason": "Don't waste time showing properties they can't afford"
            },
            {
                "if_field": "financing_needed",
                "equals": "cash_payment",
                "exclude_tags": ["financing", "bank_partners"],
                "reason": "Cash buyer doesn't need financing info"
            },
            {
                "if_field": "urgency",
                "equals": "browsing",
                "exclude_tags": ["penthouses", "luxury"],
                "reason": "Browser not ready for premium properties yet"
            }
        ]

        # Validation rules (check response after generation)
        agent.validation_rules = [
            {
                "if_field": "budget_range",
                "equals": "unknown",
                "response_contains": ["R$", "milhão", "mil reais"],
                "action": "strip_prices",
                "message": "Removing prices - budget not qualified yet"
            },
            {
                "if_field": "qualified_buyer",
                "equals": "no",
                "response_contains": ["endereço", "rua", "número"],
                "action": "block_address",
                "message": "Don't share exact address until buyer is qualified"
            },
            {
                "if_field": "viewing_scheduled",
                "equals": "no",
                "media_contains": "property_brochure",
                "action": "allow",
                "message": "OK to send brochure before viewing to generate interest"
            }
        ]

        # Media rules (when to send attachments)
        agent.media_rules = {
            "property_brochure_luxury.pdf": {
                "type": "pdf",
                "triggers": ["zona sul", "leblon", "ipanema", "luxury", "alto padrão", "exclusivo"],
            },
            "property_brochure_barra.pdf": {
                "type": "pdf",
                "triggers": ["barra", "condomínio clube", "área de lazer"],
            },
            "financing_calculator.pdf": {
                "type": "pdf",
                "triggers": ["financiamento", "parcelas", "simulação", "banco", "caixa"],
            },
            "neighborhood_guide.pdf": {
                "type": "pdf",
                "triggers": ["região", "bairro", "segurança", "escola", "mercado"],
            }
        }

        # Multi-turn config
        agent.multi_turn_config = {
            "enabled": True,
            "style": "professional",
            "max_splits": 2
        }

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
    create_real_estate_agent()
