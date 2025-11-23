"""
Rules Schema - Condition/Action logic for context assembly.

Rules are evaluated in priority order during the ASSEMBLE stage.
Each rule has conditions (when to fire) and assembly_action (what to do).
"""

from typing import Optional, Literal, Union
from pydantic import BaseModel, Field


class Clause(BaseModel):
    """
    Single condition clause.
    Examples:
        {field: "gate.interest_confirmed", op: "==", value: True}
        {field: "trait.skill_level", op: "==", value: "zero"}
        {field: "signal.intent", op: "==", value: "objection"}
        {field: "mode", op: "==", value: "discovery"}
    """
    field: str = Field(..., description="Field to check: gate.X, trait.X, signal.X, mode")
    op: Literal["==", "!=", "in", "not_in", "is_null", "is_not_null"] = "=="
    value: Union[str, bool, list[str], None] = None


class Condition(BaseModel):
    """
    Condition for rule evaluation.
    Can be AND/OR of multiple clauses, or "always".
    """
    operator: Literal["AND", "OR", "always"] = "AND"
    clauses: list[Clause] = Field(default_factory=list)

    def evaluate(self, state: dict) -> bool:
        """Evaluate condition against current state."""
        if self.operator == "always":
            return True

        if not self.clauses:
            return True

        results = []
        for clause in self.clauses:
            result = self._evaluate_clause(clause, state)
            results.append(result)

        if self.operator == "AND":
            return all(results)
        else:  # OR
            return any(results)

    def _evaluate_clause(self, clause: Clause, state: dict) -> bool:
        """Evaluate a single clause."""
        # Parse field path (e.g., "gate.interest_confirmed" -> state["gates"]["interest_confirmed"])
        parts = clause.field.split(".")
        if len(parts) == 2:
            category, key = parts
            if category == "gate":
                actual = state.get("gates", {}).get(key, False)
            elif category == "trait":
                actual = state.get("traits", {}).get(key)
            elif category == "signal":
                actual = state.get("signals", {}).get(key)
            else:
                actual = None
        elif clause.field == "mode":
            actual = state.get("mode")
        else:
            actual = state.get(clause.field)

        # Compare
        if clause.op == "==":
            return actual == clause.value
        elif clause.op == "!=":
            return actual != clause.value
        elif clause.op == "in":
            return actual in (clause.value or [])
        elif clause.op == "not_in":
            return actual not in (clause.value or [])
        elif clause.op == "is_null":
            return actual is None
        elif clause.op == "is_not_null":
            return actual is not None

        return False


class AssemblyAction(BaseModel):
    """
    Action to perform during context assembly.

    Types:
    - inject: Add all chunks with matching labels
    - search: Semantic search within labels, add top N
    - block: Mark labels as blocked (exclude from context)
    """
    type: Literal["inject", "search", "block"]
    labels: list[str] = Field(default_factory=list)
    limit: int = Field(3, description="Max chunks for search action")
    query: Optional[str] = Field(None, description="Query source: 'last_message' or 'signal.X'")


class Rule(BaseModel):
    """
    Priority-ordered rule for context assembly.

    Priority tiers:
    - 1-5: Critical (always fire, e.g., objections, blocking)
    - 6-15: Mode-based
    - 16-25: Trait-reactive
    - 26+: Fallback
    - 50+: Mode-shift only (no assembly_action)
    """
    id: str
    name: str
    priority: int = Field(10, description="Lower = higher priority")
    enabled: bool = True
    conditions: Condition
    assembly_action: Optional[AssemblyAction] = None
    mode_shift: Optional[str] = Field(None, description="Mode to shift to when rule fires")

    def evaluate(self, state: dict) -> bool:
        """Check if rule should fire."""
        if not self.enabled:
            return False
        return self.conditions.evaluate(state)
