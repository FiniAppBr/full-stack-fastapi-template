"""
Nina - Production Configuration

Sales agent for "Aulas de Violão do Zero ao Fingerstyle"
Optimized for minimal token usage.
"""

from app.agent.schema import (
    Gate, Trait, Mode, Signal, Rule, Condition, Clause, RuntimeState
)
from app.agent.pipeline import AgentConfig


# =============================================================================
# SIGNALS (per-message detection)
# =============================================================================

SIGNALS = [
    Signal(
        id="intent",
        name="Intent",
        type="enum",
        options=["greeting", "question", "objection", "agreement", "ready_to_buy", "not_ready", "purchased", "request_human", "other"],
        detection_hint="User intent: greeting, question about course, objection/doubt, agreement/positive, ready to buy, not ready, already purchased, wants human, other"
    ),
    Signal(
        id="objection_type",
        name="Objection Type",
        type="enum",
        options=["talent", "time", "money", "trust", "method", "equipment", "age", "none"],
        detection_hint="If objection: talent=no gift, time=busy, money=expensive, trust=legit?, method=works?, equipment=no guitar, age=too old/young, none=no objection"
    ),
    Signal(
        id="interest_level",
        name="Interest Level",
        type="enum",
        options=["cold", "warm", "hot"],
        detection_hint="Interest: cold=just curious, warm=interested but hesitant, hot=ready to act"
    ),
    Signal(
        id="engagement",
        name="Engagement",
        type="enum",
        options=["active", "passive", "dropping"],
        detection_hint="Engagement: active=asking questions, passive=short replies, dropping=losing interest"
    ),
]


# =============================================================================
# TRAITS (persistent user characteristics)
# =============================================================================

TRAITS = [
    Trait(
        id="customer_name",
        name="Name",
        type="string",
        detection_hint="Customer's name if mentioned"
    ),
    Trait(
        id="skill_level",
        name="Skill",
        type="enum",
        options=["zero", "beginner", "intermediate"],
        detection_hint="zero=never played, beginner=basic chords, intermediate=plays but wants to improve"
    ),
    Trait(
        id="use_case",
        name="Use Case",
        type="enum",
        options=["igreja", "hobby", "profissional", "familia"],
        detection_hint="Why learn: igreja=church, hobby=fun, profissional=career, familia=family"
    ),
    Trait(
        id="learning_style",
        name="Learning Style",
        type="enum",
        options=["structured", "exploratory"],
        detection_hint="structured=step-by-step, exploratory=discover on own"
    ),
    Trait(
        id="time_availability",
        name="Time",
        type="enum",
        options=["low", "medium", "high"],
        detection_hint="low=10-15min/day, medium=30min/day, high=1hr+/day"
    ),
]


# =============================================================================
# GATES (cumulative checkpoints with conditions)
# =============================================================================

GATES = [
    Gate(
        id="name_captured",
        name="Name Captured",
        enforcement="soft",
        condition=Condition(operator="AND", clauses=[
            Clause(field="trait.customer_name", op="is_not_null")
        ])
    ),
    Gate(
        id="skill_identified",
        name="Skill Identified",
        enforcement="soft",
        condition=Condition(operator="AND", clauses=[
            Clause(field="trait.skill_level", op="is_not_null")
        ])
    ),
    Gate(
        id="need_identified",
        name="Need Identified",
        enforcement="soft",
        condition=Condition(operator="AND", clauses=[
            Clause(field="trait.use_case", op="is_not_null")
        ])
    ),
    Gate(
        id="interest_confirmed",
        name="Interest Confirmed",
        required_for=["pricing", "payment", "link"],
        enforcement="hard",
        condition=Condition(operator="OR", clauses=[
            Clause(field="signal.intent", op="==", value="agreement"),
            Clause(field="signal.intent", op="==", value="ready_to_buy")
        ])
    ),
    Gate(
        id="link_offered",
        name="Link Offered",
        enforcement="soft"
        # No condition - set by tool execution
    ),
    Gate(
        id="link_sent",
        name="Link Sent",
        enforcement="soft"
        # No condition - set by tool execution
    ),
    Gate(
        id="purchased",
        name="Purchased",
        required_for=["onboarding", "welcome"],
        enforcement="hard",
        condition=Condition(operator="AND", clauses=[
            Clause(field="signal.intent", op="==", value="purchased")
        ])
    ),
]


# =============================================================================
# MODES (fluid conversational focus)
# =============================================================================

MODES = [
    Mode(id="conexao", name="Conexão", default_labels=["stage:conexao", "rapport"]),
    Mode(id="descoberta", name="Descoberta", default_labels=["stage:descoberta"]),
    Mode(id="validacao", name="Validação", default_labels=["stage:validacao", "encouragement"]),
    Mode(id="objection_handling", name="Objeções", default_labels=["objection"]),
    Mode(id="apresentacao", name="Apresentação", default_labels=["stage:apresentacao", "method", "proof"]),
    Mode(id="intencao", name="Intenção", default_labels=["stage:intencao"]),
    Mode(id="fechamento", name="Fechamento", default_labels=["stage:fechamento", "pricing", "payment"]),
    Mode(id="nutricao", name="Nutrição", default_labels=["stage:nutricao", "tips"]),
    Mode(id="followup", name="Follow-up", default_labels=["stage:followup"]),
    Mode(id="boasvindas", name="Boas-vindas", default_labels=["stage:boasvindas", "onboarding"]),
]


# =============================================================================
# RULES (priority-ordered)
# =============================================================================

RULES = [
    # Priority 1-5: Critical (always evaluated first)
    Rule(
        id="rule_objection",
        name="Handle objection",
        priority=1,
        conditions=Condition(operator="AND", clauses=[
            Clause(field="signal.intent", op="==", value="objection")
        ]),
        assembly_action=None,  # Assembly handles search
        mode_shift="objection_handling"
    ),
    Rule(
        id="rule_block_pricing",
        name="Block pricing until interest confirmed",
        priority=2,
        conditions=Condition(operator="AND", clauses=[
            Clause(field="gate.interest_confirmed", op="==", value=False)
        ]),
        assembly_action={"type": "block", "labels": ["pricing", "payment", "link"]},
        mode_shift=None
    ),
    Rule(
        id="rule_request_human",
        name="Handle human request",
        priority=3,
        conditions=Condition(operator="AND", clauses=[
            Clause(field="signal.intent", op="==", value="request_human")
        ]),
        assembly_action={"type": "inject", "labels": ["handoff"]},
        mode_shift=None
    ),
    Rule(
        id="rule_purchased",
        name="Handle purchase",
        priority=4,
        conditions=Condition(operator="AND", clauses=[
            Clause(field="signal.intent", op="==", value="purchased")
        ]),
        assembly_action={"type": "inject", "labels": ["stage:boasvindas", "onboarding"]},
        mode_shift="boasvindas"
    ),
    Rule(
        id="rule_ready_to_buy",
        name="Shift to closing when ready",
        priority=5,
        conditions=Condition(operator="AND", clauses=[
            Clause(field="signal.intent", op="==", value="ready_to_buy")
        ]),
        assembly_action=None,
        mode_shift="fechamento"
    ),

    # Priority 10-20: Mode-based content injection
    Rule(
        id="rule_conexao_content",
        name="Conexão content",
        priority=10,
        conditions=Condition(operator="AND", clauses=[
            Clause(field="mode", op="==", value="conexao")
        ]),
        assembly_action={"type": "inject", "labels": ["stage:conexao", "rapport"]},
        mode_shift=None
    ),
    Rule(
        id="rule_descoberta_content",
        name="Descoberta content",
        priority=11,
        conditions=Condition(operator="AND", clauses=[
            Clause(field="mode", op="==", value="descoberta")
        ]),
        assembly_action={"type": "inject", "labels": ["stage:descoberta"]},
        mode_shift=None
    ),
    Rule(
        id="rule_validacao_content",
        name="Validação content",
        priority=12,
        conditions=Condition(operator="AND", clauses=[
            Clause(field="mode", op="==", value="validacao")
        ]),
        assembly_action={"type": "inject", "labels": ["stage:validacao", "encouragement"]},
        mode_shift=None
    ),
    Rule(
        id="rule_objection_search",
        name="Search objection responses",
        priority=13,
        conditions=Condition(operator="AND", clauses=[
            Clause(field="mode", op="==", value="objection_handling")
        ]),
        assembly_action={"type": "search", "labels": ["objection"], "limit": 3, "query": "signal.objection_type"},
        mode_shift=None
    ),
    Rule(
        id="rule_apresentacao_content",
        name="Apresentação content",
        priority=14,
        conditions=Condition(operator="AND", clauses=[
            Clause(field="mode", op="==", value="apresentacao"),
            Clause(field="gate.name_captured", op="==", value=True)
        ]),
        assembly_action={"type": "inject", "labels": ["stage:apresentacao", "method", "proof"]},
        mode_shift=None
    ),
    Rule(
        id="rule_fechamento_content",
        name="Fechamento content",
        priority=15,
        conditions=Condition(operator="AND", clauses=[
            Clause(field="mode", op="==", value="fechamento"),
            Clause(field="gate.interest_confirmed", op="==", value=True)
        ]),
        assembly_action={"type": "inject", "labels": ["pricing", "payment"]},
        mode_shift=None
    ),

    # Priority 20-30: Trait-reactive
    Rule(
        id="rule_igreja_content",
        name="Igreja-specific content",
        priority=20,
        conditions=Condition(operator="AND", clauses=[
            Clause(field="trait.use_case", op="==", value="igreja")
        ]),
        assembly_action={"type": "inject", "labels": ["use_case:igreja"]},
        mode_shift=None
    ),
    Rule(
        id="rule_question_search",
        name="Search for question answers",
        priority=21,
        conditions=Condition(operator="AND", clauses=[
            Clause(field="signal.intent", op="==", value="question")
        ]),
        assembly_action={"type": "search", "labels": ["faq", "method", "course"], "limit": 2, "query": "last_message"},
        mode_shift=None
    ),

    # Priority 50+: Mode transitions (no assembly action)
    Rule(
        id="rule_shift_descoberta_to_validacao",
        name="Descoberta → Validação",
        priority=50,
        conditions=Condition(operator="AND", clauses=[
            Clause(field="gate.skill_identified", op="==", value=True),
            Clause(field="gate.need_identified", op="==", value=True),
            Clause(field="mode", op="==", value="descoberta")
        ]),
        assembly_action=None,
        mode_shift="validacao"
    ),
    Rule(
        id="rule_shift_validacao_to_apresentacao",
        name="Validação → Apresentação",
        priority=51,
        conditions=Condition(operator="AND", clauses=[
            Clause(field="gate.interest_confirmed", op="==", value=True),
            Clause(field="mode", op="==", value="validacao")
        ]),
        assembly_action=None,
        mode_shift="apresentacao"
    ),
    Rule(
        id="rule_return_from_objection",
        name="Return from objection handling",
        priority=52,
        conditions=Condition(operator="AND", clauses=[
            Clause(field="signal.intent", op="==", value="agreement"),
            Clause(field="mode", op="==", value="objection_handling")
        ]),
        assembly_action=None,
        mode_shift="validacao"
    ),
]


# =============================================================================
# VALIDATION RULES (for Generate stage)
# =============================================================================

VALIDATION_RULES = {
    "never_say": [
        "sou uma assistente virtual",
        "sou uma IA",
        "sou um robô",
        "resultado garantido",
        "garantia de resultado",
    ],
    "never_do": [
        "debater religião ou temas sensíveis",
        "assumir que a pessoa não pode pagar",
        "desviar foco para produtos paralelos",
        "dar respostas genéricas ou robóticas",
    ],
}


# =============================================================================
# PERSONALITY (for Generate stage)
# =============================================================================

PERSONALITY = {
    "tone": "friendly",
    "language": "pt",
    "emoji_usage": "minimal",
    "style": "Fala leve, sempre guiando para o próximo passo",
}


# =============================================================================
# MULTI-TURN CONFIG (for Format stage)
# =============================================================================

MULTI_TURN_CONFIG = {
    "enabled": True,
    "max_splits": 2,
    "style": "short",
}


# =============================================================================
# AGENT CONFIG (for Extraction)
# =============================================================================

NINA_CONFIG = AgentConfig(
    signals=SIGNALS,
    traits=TRAITS,
    gates=GATES,
    modes=MODES,
    rules=RULES,
)


def create_nina_initial_state() -> RuntimeState:
    """Create initial empty state for Nina."""
    return RuntimeState(
        gates={g.id: False for g in GATES},
        traits={t.id: None for t in TRAITS},
        mode="conexao",
        signals={},
        turn_count=0
    )
