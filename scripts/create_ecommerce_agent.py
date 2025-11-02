#!/usr/bin/env python3
"""
Create E-commerce Support agent - Brazilian online store customer service.
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from sqlmodel import Session, create_engine, select
from app.models.agent import Agent
from app.models.user import User
from app.core.config import settings


def create_ecommerce_agent():
    """Create e-commerce support agent with order tracking and return handling."""

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
            select(Agent).where(Agent.name == "TechStyle Suporte")
        ).first()

        if existing:
            print(f"Agent already exists (ID: {existing.id}). Updating configuration...")
            agent = existing
        else:
            agent = Agent(
                owner_id=admin_user.id,
                name="TechStyle Suporte",
                description="E-commerce customer support for order tracking and returns",
            )
            session.add(agent)

        # Base personality/instructions
        agent_instructions = """Você é atendente de suporte da TechStyle (loja online de eletrônicos e moda) pelo WhatsApp. Resolve problemas de forma ágil e empática.

POLÍTICAS DA LOJA:

ENTREGAS:
- Frete Grátis: Pedidos acima de R$199 [tags: shipping, free_shipping]
- Prazo Sul/Sudeste: 3-7 dias úteis [tags: shipping, delivery_time]
- Prazo Norte/Nordeste: 7-15 dias úteis [tags: shipping, delivery_time]
- Rastreamento: Disponível 24h após postagem [tags: tracking]

TROCAS E DEVOLUÇÕES:
- Prazo: 7 dias após recebimento (produtos sem uso) [tags: returns, return_policy]
- Produtos com defeito: 30 dias de garantia [tags: returns, warranty]
- Frete reverso: Grátis se defeito/erro da loja [tags: returns, reverse_shipping]
- Frete reverso: Cliente paga se arrependimento [tags: returns, reverse_shipping]
- Reembolso: Até 7 dias úteis após recebermos produto [tags: refund, refund_policy]

CLIENTES VIP:
(Compras >R$2000 nos últimos 6 meses)
- Frete grátis sempre [tags: vip, vip_perks]
- Troca expressa (enviamos novo antes de receber o antigo) [tags: vip, vip_perks]
- Cupom 10% OFF trimestral [tags: vip, vip_perks]
- Atendimento prioritário [tags: vip]

PRODUTOS POPULARES:
- iPhone 15 Pro: R$7.499 [tags: products, electronics, pricing]
- AirPods Pro: R$2.099 [tags: products, electronics, pricing]
- Tênis Nike Air Max: R$899 [tags: products, fashion, pricing]
- Notebook Dell Inspiron: R$3.999 [tags: products, electronics, pricing]

JEITO DE FALAR:
- Seja empático SEMPRE (cliente pode estar frustrado)
- Mensagens curtas e objetivas
- Use "vc", "pra", "já já", "tá"
- Ofereça soluções, não desculpas
- Se não puder resolver, seja transparente

FLUXO DE ATENDIMENTO:
1. Identifique o TIPO de problema (rastreio/troca/defeito/dúvida)
2. Peça número do PEDIDO (formato: #TECH12345)
3. Verifique STATUS do pedido (em separação/enviado/entregue/cancelado)
4. Identifique se é cliente VIP
5. Resolva ou encaminhe conforme política
6. Confirme satisfação no final

COMPORTAMENTO POR TIPO DE PROBLEMA:
- tracking_inquiry: Forneça código rastreio. Explique prazo. Seja tranquilizador.
- return_request: Verifique prazo. Se OK, envie etiqueta. Se expirado, seja empático mas firme.
- defective_product: SEMPRE ofereça troca imediata. Seja apologético. VIP = envio antes de receber.
- general_question: Responda com base no catálogo. Sugira produtos relacionados.
- complaint: Ouça. Empatia máxima. Ofereça cupom 15% OFF se erro nosso.

COMPORTAMENTO POR STATUS DO PEDIDO:
- preparing: "Tá sendo separado! Deve sair pra entrega em 1-2 dias."
- shipped: Forneça rastreio. Estime chegada.
- delivered: Se cliente diz que não recebeu, escale pra investigação.
- cancelled: Explique motivo. Confirme reembolso.

COMPORTAMENTO POR TIER:
- vip: Tom VIP. Mencione benefícios. Priorize soluções rápidas. Ofereça troca expressa.
- regular: Tom cordial. Siga política padrão. Seja justo.

RESOLUÇÃO AUTOMÁTICA (Não precisa escalar):
- Fornecer código rastreio
- Enviar etiqueta de devolução (dentro do prazo)
- Responder perguntas sobre produtos/prazos/políticas
- Oferecer cupom compensatório até 15% OFF

PRECISA ESCALAR (Transferir pra supervisor):
- Reembolso >R$500
- Produto não chegou (após prazo)
- Defeito em produto caro (>R$1000)
- Cliente muito insatisfeito/agressivo
- Fraude suspeita

CAPTURA DE DADOS:
Se precisar escalar:
- CPF do cliente
- Número do pedido
- Descrição detalhada do problema
- Email (pra protocolo)

REGRAS:
- NÃO prometa reembolso imediato se >R$500 (precisa aprovação)
- NÃO ofereça frete grátis se não for VIP (exceto se erro nosso)
- SIM seja generoso com cupons pequenos (5-15%) pra compensar transtornos
- SIM mencione benefícios VIP se cliente qualifica"""

        # Response schema (custom fields to track)
        agent.response_schema = {
            "issue_type": ["unknown", "tracking_inquiry", "return_request", "defective_product", "general_question", "complaint"],
            "order_status": ["unknown", "preparing", "shipped", "delivered", "cancelled"],
            "customer_tier": ["unknown", "regular", "vip"],
            "refund_requested": ["no", "yes_under_500", "yes_over_500"],
            "tracking_provided": ["no", "yes"],
            "issue_resolved": ["no", "resolved", "escalated"]
        }

        # Gating rules (filter knowledge based on fields)
        agent.gating_rules = [
            {
                "if_field": "customer_tier",
                "equals": "regular",
                "exclude_tags": ["vip", "vip_perks"],
                "reason": "Don't mention VIP perks to regular customers (might frustrate)"
            },
            {
                "if_field": "order_status",
                "equals": "cancelled",
                "exclude_tags": ["tracking", "delivery_time"],
                "reason": "Cancelled orders don't have tracking"
            },
            {
                "if_field": "issue_type",
                "equals": "general_question",
                "exclude_tags": ["returns", "refund", "warranty"],
                "reason": "Focus on products, not policies, for general questions"
            }
        ]

        # Validation rules (check response after generation)
        agent.validation_rules = [
            {
                "if_field": "refund_requested",
                "equals": "yes_over_500",
                "response_contains": ["reembolso aprovado", "dinheiro de volta já", "vai cair"],
                "action": "escalate",
                "message": "Cannot promise refund >R$500 without manager approval"
            },
            {
                "if_field": "customer_tier",
                "equals": "regular",
                "response_contains": ["frete grátis", "free shipping", "sem custo de envio"],
                "action": "block_promise",
                "message": "Regular customers don't get free shipping unless order >R$199"
            },
            {
                "if_field": "order_status",
                "equals": "delivered",
                "response_contains": ["não chegou ainda", "aguardando entrega"],
                "action": "escalate",
                "message": "System shows delivered but customer says no - needs investigation"
            }
        ]

        # Media rules (when to send attachments)
        agent.media_rules = {
            "return_label.pdf": {
                "type": "pdf",
                "triggers": ["troca", "devolução", "return", "etiqueta", "label"],
            },
            "tracking_guide.pdf": {
                "type": "pdf",
                "triggers": ["rastreio", "rastrear", "tracking", "onde está"],
            },
            "size_guide.pdf": {
                "type": "pdf",
                "triggers": ["tamanho", "numeração", "size", "medidas"],
            },
            "product_manual.pdf": {
                "type": "pdf",
                "triggers": ["manual", "instruções", "como usar", "instructions"],
            }
        }

        # Multi-turn config
        agent.multi_turn_config = {
            "enabled": True,
            "style": "casual",
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
    create_ecommerce_agent()
