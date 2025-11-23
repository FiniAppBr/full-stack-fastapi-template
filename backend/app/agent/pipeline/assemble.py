"""
Assemble Pipeline Stage - Build context from rules, RAG, and trait filtering.

Input: state + rules + chunks
Output: Assembled context (list of ChunkMatches)

Steps:
1. Evaluate rules in priority order
2. For each firing rule: inject/search/block by labels
3. Filter chunks by trait_filter (match current traits)
4. Filter by gate requirements (hard/soft enforcement)
5. Dedupe chunks
6. Trim to token budget (prioritize by rule priority)
"""

from typing import Optional

from app.agent.schema import (
    RuntimeState,
    Rule,
    Chunk,
    ChunkMatch,
    Gate,
)


class AssembleResult:
    """Result of context assembly."""
    def __init__(self):
        self.chunks: list[ChunkMatch] = []
        self.blocked_labels: set[str] = set()
        self.rules_fired: list[str] = []
        self.token_count: int = 0


def assemble(
    state: RuntimeState,
    rules: list[Rule],
    chunks: list[Chunk],
    gates: list[Gate],
    token_budget: int = 2000
) -> AssembleResult:
    """
    Assemble context based on current state and rules.

    Args:
        state: Current runtime state
        rules: Priority-ordered rules
        chunks: Available content chunks
        gates: Gate definitions for enforcement
        token_budget: Maximum tokens for assembled context

    Returns:
        AssembleResult with selected chunks
    """
    print("-> Assemble")

    result = AssembleResult()

    # Build evaluation state for rules
    eval_state = {
        "gates": state.gates,
        "traits": state.traits,
        "signals": state.signals,
        "mode": state.mode
    }

    # Sort rules by priority
    sorted_rules = sorted([r for r in rules if r.enabled], key=lambda r: r.priority)

    # Track selected chunk IDs to avoid duplicates
    selected_ids: set[int] = set()

    for rule in sorted_rules:
        if not rule.evaluate(eval_state):
            continue

        result.rules_fired.append(rule.id)
        action = rule.assembly_action

        if not action:
            continue

        if action.type == "block":
            result.blocked_labels.update(action.labels)
            print(f"  Rule '{rule.id}' blocks: {action.labels}")

        elif action.type == "inject":
            # Find chunks with matching labels, not blocked, matching traits
            for chunk in chunks:
                if chunk.id in selected_ids:
                    continue
                if not chunk.has_any_label(action.labels):
                    continue
                if chunk.has_any_label(list(result.blocked_labels)):
                    continue
                if not chunk.matches_traits(state.traits):
                    continue

                selected_ids.add(chunk.id)
                result.chunks.append(ChunkMatch(
                    chunk=chunk,
                    score=1.0,
                    source_rule=rule.id
                ))

            print(f"  Rule '{rule.id}' injected labels: {action.labels}")

        elif action.type == "search":
            # TODO: Implement semantic search
            # For now, fall back to inject behavior
            print(f"  Rule '{rule.id}' search (TODO: implement RAG): {action.labels}")

    # Apply gate enforcement
    result.chunks = _apply_gate_enforcement(result.chunks, state.gates, gates)

    # Calculate token count
    result.token_count = sum(cm.chunk.token_count for cm in result.chunks)

    # Trim to budget if needed
    if result.token_count > token_budget:
        result.chunks = _trim_to_budget(result.chunks, token_budget)
        result.token_count = sum(cm.chunk.token_count for cm in result.chunks)

    print(f"  Assembled {len(result.chunks)} chunks, {result.token_count} tokens")

    return result


def _apply_gate_enforcement(
    chunks: list[ChunkMatch],
    current_gates: dict[str, bool],
    gate_defs: list[Gate]
) -> list[ChunkMatch]:
    """
    Filter chunks based on gate requirements.

    Hard enforcement: Remove chunks that require unmet gates
    Soft enforcement: Keep but flag (TODO: add hint to prompt)
    """
    # Build gate -> required_for labels mapping
    hard_blocked_labels: set[str] = set()
    for gate in gate_defs:
        if gate.enforcement == "hard" and not current_gates.get(gate.id, False):
            hard_blocked_labels.update(gate.required_for)

    if not hard_blocked_labels:
        return chunks

    # Filter out hard-blocked chunks
    filtered = []
    for cm in chunks:
        if not cm.chunk.has_any_label(list(hard_blocked_labels)):
            filtered.append(cm)

    return filtered


def _trim_to_budget(chunks: list[ChunkMatch], budget: int) -> list[ChunkMatch]:
    """
    Trim chunks to fit token budget.
    Removes lowest-priority chunks first.
    """
    # Sort by score (higher first) as proxy for priority
    sorted_chunks = sorted(chunks, key=lambda cm: cm.score, reverse=True)

    result = []
    total = 0

    for cm in sorted_chunks:
        if total + cm.chunk.token_count <= budget:
            result.append(cm)
            total += cm.chunk.token_count

    return result
