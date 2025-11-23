"""
Gating - Pre-agent filtering based on stage and rules.

Controls what the agent can discuss:
- Stage blocked topics
- Rule-based exclusions
- Handoff trigger detection
"""
from typing import Optional

from ..stages import ConversationStage, get_stage_by_id


def apply_gating_rules(
    state: dict,
    gating_rules: list[dict],
    stages: list[dict] = None
) -> tuple[list[str], bool, Optional[str]]:
    """
    Apply gating rules to determine excluded topics and handoff needs.

    Args:
        state: Current conversation state
        gating_rules: List of gating rule dicts
        stages: Optional list of stage configs

    Returns:
        Tuple of (excluded_tags, requires_handoff, handoff_reason)
    """
    excluded_tags = []
    requires_handoff = False
    handoff_reason = None

    # Stage-based gating
    current_stage_id = state.get("current_stage")
    if stages and current_stage_id:
        stage = get_stage_by_id(stages, current_stage_id)
        if stage and stage.blocked_topics:
            excluded_tags.extend(stage.blocked_topics)

    # Rule-based gating
    for rule in gating_rules:
        field = rule.get("if_field")
        equals = rule.get("equals")
        not_equals = rule.get("not_equals")
        exclude = rule.get("exclude_tags", [])
        include_only = rule.get("include_only_tags", [])

        if field and field in state:
            field_value = state.get(field)

            # Check equals condition
            if equals is not None and field_value == equals:
                excluded_tags.extend(exclude)

            # Check not_equals condition
            if not_equals is not None and field_value != not_equals:
                excluded_tags.extend(exclude)

    return list(set(excluded_tags)), requires_handoff, handoff_reason


def check_handoff_triggers(
    message: str,
    handoff_triggers: list[str]
) -> tuple[bool, Optional[str]]:
    """
    Check if message contains handoff triggers.

    Args:
        message: User message to check
        handoff_triggers: List of trigger keywords

    Returns:
        Tuple of (requires_handoff, trigger_reason)
    """
    if not message or not handoff_triggers:
        return False, None

    message_lower = message.lower()

    # Direct keyword matching
    for trigger in handoff_triggers:
        if trigger.lower() in message_lower:
            return True, trigger

    # Sentiment-based triggers (simple heuristics)
    anger_indicators = ["absurdo", "ridiculo", "vergonha", "processo", "advogado", "procon"]
    if "anger" in [t.lower() for t in handoff_triggers]:
        for indicator in anger_indicators:
            if indicator in message_lower:
                return True, "anger"

    return False, None
