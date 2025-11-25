"""
Nina v3 - Sales Agent for "Aulas de Violão do Zero ao Fingerstyle"

DEPRECATED: This file is kept for reference and fallback only.
The source of truth for Nina's configuration is now the database (NeoAgent table).
Use scripts/seed_nina.py to re-seed the database if needed.
To update Nina's config, use the Neo Agents UI or API.

This is DATA ONLY. All pipeline logic lives in the base v3 system.

ARCHITECTURE:
- BASE (reusable): app/agent/v3/base_examples.py
  - Universal sales conversation patterns
  - Generic objection handling
  - Core guardrails

- NINA (specific): app/agent/v3/nina_examples.py
  - Nina's personality and tone
  - Guitar course context
  - Product-specific patterns

This separation allows creating new agents by combining:
  BASE_EXAMPLES + NEW_AGENT_EXAMPLES + NEW_AGENT_PERSONALITY
"""

from app.agent.v3.schema import (
    Trait,
    IntentType,
    ObjectionType,
    Objective,
    Event,
    ConversationExample,
    ExampleMessage,
    Guardrails,
    EscalationTrigger,
    AgentState,
)
from app.agent.v3.config import (
    BaseAgentConfig,
    ExtractionConfig,
    GenerationConfig,
    AssemblyConfig,
    MultiMessageConfig,
    TypingConfig,
)
from app.agent.v3.base_examples import BASE_EXAMPLES, BASE_GUARDRAILS
from app.agent.v3.nina_examples import NINA_EXAMPLES, NINA_PERSONALITY, NINA_GUARDRAILS


# =============================================================================
# PRODUCT DATA (Single Source of Truth)
# =============================================================================

PRODUCT = {
    # Core
    "name": "Aulas de Violão do Zero ao Fingerstyle",
    "teacher": "Rafael Alves",
    "teacher_credentials": "1,5 milhão de seguidores, 17 anos de experiência",

    # Pricing
    "price_full": "R$ 297",
    "price_installments": "12x de R$ 29,82",
    "payment_methods": ["PIX", "Cartão", "Boleto"],

    # Access
    "access_type": "vitalício",
    "guarantee_days": 7,
    "platform": "Hotmart",

    # Content
    "total_lessons": 280,
    "total_modules": 51,
    "total_students": "50.000+",
    "video_quality": "4K com animações",

    # Bonuses
    "bonuses": [
        "Ouvido Absoluto (treinar ouvido)",
        "Campo Harmônico Descomplicado",
        "Mestres do Dedilhado",
        "Batidos de Mestre",
        "Grupo de Estudos com suporte",
        "37.819 cifras para download",
    ],

    # Differentiators
    "differentiators": [
        "Funciona offline (baixar aulas)",
        "Assiste na TV, celular, tablet",
        "Suporte direto com o professor",
        "Do zero ao fingerstyle avançado",
    ],

    # Link
    "checkout_url": "https://pay.hotmart.com/...",  # TODO: Real URL
}


# =============================================================================
# TRAITS (What to extract about the user)
# =============================================================================

TRAITS = [
    Trait(
        id="customer_name",
        type="string",
        extract_hint="Nome próprio SE mencionado explicitamente"
    ),
    Trait(
        id="skill_level",
        type="enum",
        options=["zero", "beginner", "intermediate"],
        extract_hint="zero=nunca tocou/primeira vez, beginner=sabe básico/arranha, intermediate=já toca músicas"
    ),
    Trait(
        id="use_case",
        type="enum",
        options=["igreja", "hobby", "profissional", "familia"],
        extract_hint="Objetivo SE mencionado explicitamente: igreja/louvor, hobby/diversão, profissional/carreira, família"
    ),
]


# =============================================================================
# INTENTS (What the user is doing)
# =============================================================================

INTENTS = [
    IntentType(
        id="greeting",
        description="Apenas saudação (oi, olá) sem conteúdo adicional",
        rag_boost_labels=["opener", "conexao"]
    ),
    IntentType(
        id="question",
        description="Pergunta sobre curso, método, preço, como funciona",
        rag_boost_labels=["faq", "metodo", "curso"]
    ),
    IntentType(
        id="objection",
        description="Resistência, dúvida, objeção (caro, sem tempo, será que funciona)",
        rag_boost_labels=["objecao"]
    ),
    IntentType(
        id="agreement",
        description="Concordância, interesse confirmado (quero saber mais, parece bom)",
        rag_boost_labels=["validacao", "metodo"]
    ),
    IntentType(
        id="ready_to_buy",
        description="Quer comprar agora (quero comprar, como faço pra adquirir)",
        rag_boost_labels=["fechamento", "preco", "pagamento"]
    ),
    IntentType(
        id="purchased",
        description="Já comprou (comprei, acabei de comprar)",
        rag_boost_labels=["boasvindas", "onboarding"]
    ),
    IntentType(
        id="wants_human",
        description="Quer falar com pessoa/atendente humano",
        rag_boost_labels=["transferencia"]
    ),
]


# =============================================================================
# OBJECTION TYPES
# =============================================================================

OBJECTION_TYPES = [
    ObjectionType(
        id="money",
        description="Preço/caro/não tenho dinheiro",
        keywords=["caro", "preço", "dinheiro", "investimento", "pagar"]
    ),
    ObjectionType(
        id="time",
        description="Sem tempo/correria/ocupado",
        keywords=["tempo", "ocupado", "correria", "trabalho"]
    ),
    ObjectionType(
        id="trust",
        description="Será que funciona/desconfiança",
        keywords=["funciona", "será", "confiança", "verdade"]
    ),
    ObjectionType(
        id="method",
        description="Online não funciona/prefiro presencial",
        keywords=["online", "presencial", "distância"]
    ),
    ObjectionType(
        id="equipment",
        description="Não tem violão/equipamento",
        keywords=["violão", "instrumento", "equipamento"]
    ),
    ObjectionType(
        id="talent",
        description="Não tem dom/talento/jeito",
        keywords=["dom", "talento", "jeito", "nascer"]
    ),
]


# =============================================================================
# OBJECTIVES (What to achieve)
# =============================================================================

OBJECTIVES = [
    # Discovery
    Objective(
        target="trait.customer_name",
        hint="Pergunte o nome naturalmente na conversa",
        priority=10
    ),
    Objective(
        target="trait.skill_level",
        hint="Entenda o nível: nunca tocou, sabe básico, ou já toca",
        priority=20
    ),
    Objective(
        target="trait.use_case",
        hint="Entenda o objetivo: igreja, hobby, profissional, família",
        priority=30
    ),

    # Qualification
    Objective(
        target="event.interest_shown",
        hint="Confirme interesse perguntando se quer conhecer o método",
        priority=40
    ),

    # Closing
    Objective(
        target="event.price_revealed",
        hint="Quando demonstrar interesse, revele o preço",
        priority=50
    ),
    Objective(
        target="event.link_sent",
        hint="Quando pronto para comprar, envie o link",
        priority=60
    ),
]


# =============================================================================
# EVENTS (Trackable milestones)
# =============================================================================

EVENTS = [
    Event(
        id="interest_shown",
        description="Interesse confirmado",
        detect_on_extraction=True,
        trigger_intents=["agreement", "ready_to_buy"]
    ),
    Event(
        id="price_revealed",
        description="Preço revelado",
        detect_regex=r"R\$|297|29,82|29\.82"
    ),
    Event(
        id="link_sent",
        description="Link enviado",
        # No regex - link_sent should only be true when we actually send a URL
    ),
]


# =============================================================================
# FEW-SHOT EXAMPLES (Base + Nina-specific)
# =============================================================================

# Combine base sales patterns with Nina-specific examples
EXAMPLES = BASE_EXAMPLES + NINA_EXAMPLES


# =============================================================================
# GUARDRAILS (Dynamically merged from Base + Nina)
# =============================================================================

# Merge base guardrails with Nina-specific rules
GUARDRAILS = Guardrails.from_dicts(BASE_GUARDRAILS, NINA_GUARDRAILS)


# =============================================================================
# ESCALATION TRIGGERS
# =============================================================================

ESCALATION_TRIGGERS = [
    EscalationTrigger(
        condition="intent == 'wants_human'",
        action="handoff",
        response=["Claro! Vou te transferir para um atendente."]
    ),
    EscalationTrigger(
        condition="same_objection_count >= 3",
        action="offer_handoff",
        response=["Parece que você ainda tem dúvidas sobre isso.", "Quer falar com alguém da equipe?"]
    ),
]


# =============================================================================
# NINA CONFIG
# =============================================================================

NINA_CONFIG = BaseAgentConfig(
    # Identity
    agent_id="nina",
    agent_name="Nina",
    agent_description="""Você é a assistente de vendas do curso "Aulas de Violão do Zero ao Fingerstyle" do professor Rafael Alves.

O curso ensina qualquer pessoa a tocar violão desde o zero absoluto até o fingerstyle avançado.
- 280 videoaulas em 51 módulos
- Mais de 50.000 alunos
- Professor Rafael Alves: 1,5 milhão de seguidores, 17 anos de experiência
- Acesso vitalício, suporte no grupo de estudos, garantia de 7 dias

Seu papel é ajudar pessoas interessadas em aprender violão, entender suas necessidades,
e guiá-las naturalmente para a compra quando fizer sentido para elas.""",
    language="pt",

    # Product data
    product=PRODUCT,

    # Schema definitions
    traits=TRAITS,
    intents=INTENTS,
    objection_types=OBJECTION_TYPES,
    objectives=OBJECTIVES,
    events=EVENTS,
    examples=EXAMPLES,
    guardrails=GUARDRAILS,
    escalation_triggers=ESCALATION_TRIGGERS,

    # Stage configs
    extraction=ExtractionConfig(
        model="google/gemini-2.5-flash-lite",
        temperature=0.1,
        history_turns=3
    ),
    generation=GenerationConfig(
        model="google/gemini-2.5-flash-lite",
        temperature=0.7,
        max_tokens=500,
        history_turns=5
    ),
    assembly=AssemblyConfig(
        token_budget=1500,
        base_search_limit=3,
        boost_search_limit=0,  # No label boosting
        similarity_threshold=0.35,
        max_examples=2
    ),
    multi_message=MultiMessageConfig(
        enabled=True,
        max_messages=4,
        preferred_messages=2,
        typing=TypingConfig(
            enabled=True,
            base_ms=800,
            per_char_ms=30,
            max_delay_ms=3000,
            between_messages_ms=500
        )
    ),

    # Custom product summary
    product_summary=f"""Curso: {PRODUCT['name']}
Professor: {PRODUCT['teacher']} ({PRODUCT['teacher_credentials']})
Preço: {PRODUCT['price_full']} à vista ou {PRODUCT['price_installments']}
Acesso: {PRODUCT['access_type']}
Garantia: {PRODUCT['guarantee_days']} dias
Conteúdo: {PRODUCT['total_lessons']} aulas em {PRODUCT['total_modules']} módulos
Alunos: {PRODUCT['total_students']}
Bônus: {', '.join(PRODUCT['bonuses'][:3])}...
Diferenciais: {', '.join(PRODUCT['differentiators'][:2])}"""
)


def create_nina_state(thread_id: str) -> AgentState:
    """Create initial state for a Nina conversation."""
    return NINA_CONFIG.create_initial_state(thread_id)
