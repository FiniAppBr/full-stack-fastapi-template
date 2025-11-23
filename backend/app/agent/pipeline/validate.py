"""
Validate Pipeline Stage - Post-response constraint checking.

Input: response + validation rules
Output: validated response (possibly regenerated if failed)
"""

from typing import Optional
from pydantic import BaseModel


class ValidationResult(BaseModel):
    """Result of response validation."""
    passed: bool = True
    issues: list[str] = []
    original_response: str = ""
    final_response: str = ""


def validate(
    response: str,
    validation_rules: dict,
    state: dict = None,
    max_retries: int = 1
) -> ValidationResult:
    """
    Validate response against rules.

    Args:
        response: Generated response text
        validation_rules: Dict with never_say, never_do, must_include rules
        state: Current state for conditional rules
        max_retries: Max regeneration attempts (not implemented yet)

    Returns:
        ValidationResult with pass/fail and issues
    """
    print("-> Validate")

    result = ValidationResult(
        original_response=response,
        final_response=response
    )

    state = state or {}

    # Check "never_say" rules
    never_say = validation_rules.get("never_say", [])
    for forbidden in never_say:
        if forbidden.lower() in response.lower():
            result.issues.append(f"Contains forbidden phrase: '{forbidden}'")

    # Check "never_do" rules (informational - can't really enforce)
    never_do = validation_rules.get("never_do", [])
    # These are guidelines, not enforceable via string matching

    # Check "must_include" conditional rules
    must_include_rules = validation_rules.get("must_include", [])
    for rule in must_include_rules:
        if isinstance(rule, dict):
            field = rule.get("if_field")
            equals = rule.get("equals")
            must_have = rule.get("text")
            if field and state.get(field) == equals:
                if must_have and must_have.lower() not in response.lower():
                    result.issues.append(f"Missing required content: '{must_have}'")

    if result.issues:
        result.passed = False
        print(f"  Validation failed: {result.issues}")
    else:
        result.passed = True
        print("  Validation passed")

    return result
