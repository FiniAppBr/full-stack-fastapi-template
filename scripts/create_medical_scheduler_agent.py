#!/usr/bin/env python3
"""
Create Medical Scheduler agent - Brazilian clinic appointment booking assistant.
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from sqlmodel import Session, create_engine, select
from app.models.agent import Agent
from app.models.user import User
from app.core.config import settings


def create_medical_scheduler_agent():
    """Create medical scheduler agent with appointment qualification logic."""

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
            select(Agent).where(Agent.name == "Clínica Saúde+ Agendamentos")
        ).first()

        if existing:
            print(f"Agent already exists (ID: {existing.id}). Updating configuration...")
            agent = existing
        else:
            agent = Agent(
                owner_id=admin_user.id,
                name="Clínica Saúde+ Agendamentos",
                description="Medical appointment scheduler for Brazilian clinic",
            )
            session.add(agent)

        # Base personality/instructions
        agent_instructions = """Você é atendente da Clínica Saúde+ pelo WhatsApp. Ajuda a agendar consultas de forma rápida e amigável.

ESPECIALIDADES DISPONÍVEIS:
- Clínico Geral: Dr. Roberto Silva, Dra. Ana Costa (consulta R$280) [tags: doctors, pricing, general_care]
- Cardiologia: Dr. Paulo Mendes (consulta R$450) [tags: doctors, pricing, cardiology, specialists]
- Ortopedia: Dra. Marina Santos (consulta R$420) [tags: doctors, pricing, orthopedics, specialists]
- Pediatria: Dr. Lucas Ferreira (consulta R$320) [tags: doctors, pricing, pediatrics]
- Dermatologia: Dra. Camila Rocha (consulta R$380) [tags: doctors, pricing, dermatology, specialists]

CONVÊNIOS ACEITOS:
- Unimed, SulAmérica, Bradesco Saúde, Amil (todos cobrem consultas) [tags: insurance, covered_plans]
- Golden Cross (cobertura parcial - R$150 copagamento) [tags: insurance, partial_coverage]
- Particular: Preços acima [tags: pricing, private_pay]

HORÁRIOS:
- Seg-Sex: 7h às 19h
- Sábado: 8h às 13h
- Urgências: avaliar disponibilidade no mesmo dia

JEITO DE FALAR:
- Seja RÁPIDO e objetivo (WhatsApp é canal ágil)
- Mensagens curtas (1-2 frases)
- Use "vc", "pra", "q" naturalmente
- Faça UMA pergunta por vez
- Empatia se urgência médica

FLUXO DE QUALIFICAÇÃO:
1. Pergunte PRIMEIRO sobre urgência ("É urgente ou dá pra agendar com calma?")
2. Depois pergunte especialidade necessária
3. Confirme se já é paciente da clínica
4. Verifique convênio/particular
5. Ofereça horários disponíveis
6. Confirme nome completo + contato

COMPORTAMENTO POR URGÊNCIA:
- urgent: Priorize mesmo dia. Seja empático. Pergunte sintomas brevemente. Sugira clínico geral se especialista indisponível.
- routine: Ofereça próximos 3-5 dias. Tom tranquilo.
- followup: Pergunte nome do médico anterior. Facilite reagendamento.

COMPORTAMENTO POR CONVÊNIO:
- covered_fully: Confirme cobertura. Peça número da carteirinha depois.
- covered_partially: AVISE copagamento ANTES de marcar.
- not_covered/private_pay: Mostre preços. Ofereça parcelamento se consulta >R$300.
- unknown: Pergunte, mas NÃO mencione valores até confirmar.

CAPTURA DE DADOS:
Antes de confirmar, precisa de:
- Nome completo
- CPF (pra cadastro ou localizar prontuário)
- Telefone (confirmar o número que está falando)
- Email (pra mandar confirmação)

REGRAS:
- NÃO liste todos os médicos de uma vez
- NÃO mencione preços se convênio cobre totalmente
- SIM seja empático com urgências
- SIM confirme dados antes de finalizar"""

        # Response schema (custom fields to track)
        agent.response_schema = {
            "appointment_urgency": ["unknown", "urgent", "routine", "followup"],
            "insurance_type": ["unknown", "covered_fully", "covered_partially", "not_covered", "private_pay"],
            "preferred_specialty": ["unknown", "general", "cardiology", "orthopedics", "pediatrics", "dermatology"],
            "existing_patient": ["unknown", "yes", "no"],
            "contact_verified": ["none", "phone_only", "phone_and_email", "full"],
            "appointment_scheduled": ["no", "pending_confirmation", "confirmed"]
        }

        # Gating rules (filter knowledge based on fields)
        agent.gating_rules = [
            {
                "if_field": "insurance_type",
                "equals": "unknown",
                "exclude_tags": ["pricing"],
                "reason": "Don't show prices until insurance status is known"
            },
            {
                "if_field": "insurance_type",
                "equals": "covered_fully",
                "exclude_tags": ["pricing"],
                "reason": "Patient doesn't need to know prices if insurance covers"
            },
            {
                "if_field": "appointment_urgency",
                "equals": "routine",
                "exclude_tags": ["specialists"],
                "reason": "Start with general care for routine appointments"
            }
        ]

        # Validation rules (check response after generation)
        agent.validation_rules = [
            {
                "if_field": "insurance_type",
                "equals": "unknown",
                "response_contains": ["R$", "reais", "particular"],
                "action": "strip_prices",
                "message": "Removing prices - insurance not verified yet"
            },
            {
                "if_field": "appointment_urgency",
                "equals": "urgent",
                "response_contains": ["próxima semana", "mês que vem"],
                "action": "escalate",
                "message": "Urgent case - should prioritize immediate slots"
            },
            {
                "if_field": "contact_verified",
                "equals": "none",
                "response_contains": ["confirmado", "agendado com sucesso"],
                "action": "block_confirmation",
                "message": "Cannot confirm appointment without verified contact"
            }
        ]

        # Media rules (when to send attachments)
        agent.media_rules = {
            "clinic_location.pdf": {
                "type": "pdf",
                "triggers": ["endereço", "localização", "como chegar", "where", "location"],
            },
            "insurance_list.pdf": {
                "type": "pdf",
                "triggers": ["convênios aceitos", "planos", "insurance", "aceita unimed"],
            },
            "pre_appointment_form.pdf": {
                "type": "pdf",
                "triggers": ["formulário", "preencher", "form", "documents needed"],
            }
        }

        # Multi-turn config
        agent.multi_turn_config = {
            "enabled": True,
            "style": "casual",
            "max_splits": 3
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
    create_medical_scheduler_agent()
