"""
Validation - Post-agent response checks.

Ensures responses follow rules:
- Never say certain things
- Always include certain elements
- Respect stage constraints
"""
from typing import Optional


def validate_response(
    response: str,
    state: dict,
    validation_rules: list[dict]
) -> tuple[bool, Optional[str], Optional[str]]:
    """
    Validate agent response against rules.

    Args:
        response: Agent's response text
        state: Current conversation state
        validation_rules: List of validation rule dicts

    Returns:
        Tuple of (is_valid, issues_description, suggested_fix)
    """
    if not response:
        return True, None, None

    issues = []

    for rule in validation_rules:
        # "never_say" - forbidden content
        if "never_say" in rule:
            forbidden = rule["never_say"]
            if isinstance(forbidden, str):
                forbidden = [forbidden]
            for word in forbidden:
                if word.lower() in response.lower():
                    issues.append(f"Contains forbidden: '{word}'")

        # "never_mention_price" when condition not met
        if rule.get("type") == "price_protection":
            required_field = rule.get("unless_field")
            required_value = rule.get("unless_equals")
            if required_field and state.get(required_field) != required_value:
                # Check if response mentions prices
                import re
                price_pattern = r'R\$\s*[\d.,]+|[\d.,]+\s*reais'
                if re.search(price_pattern, response, re.IGNORECASE):
                    issues.append("Mentions price before collecting contact")

        # "must_include" when condition met
        if "if_field" in rule and "must_include" in rule:
            field = rule["if_field"]
            equals = rule.get("equals")
            must_include = rule["must_include"]

            if state.get(field) == equals:
                if must_include.lower() not in response.lower():
                    issues.append(f"Missing required: '{must_include}'")

        # "max_length" check
        if "max_length" in rule:
            max_len = rule["max_length"]
            if len(response) > max_len:
                issues.append(f"Response too long ({len(response)} > {max_len})")

        # Language check
        if rule.get("type") == "language_match":
            required_lang = rule.get("language")
            # Simple heuristic: check for common Portuguese vs English words
            if required_lang == "pt":
                en_indicators = ["the ", "and ", "is ", "are ", "this ", "that "]
                en_count = sum(1 for w in en_indicators if w in response.lower())
                if en_count > 2:
                    issues.append("Response appears to be in English, expected Portuguese")

    if issues:
        return False, "; ".join(issues), None

    return True, None, None


def strip_prices(response: str) -> str:
    """
    Remove price mentions from response.

    Used when validation fails due to price disclosure.
    """
    import re

    # Remove R$ amounts
    response = re.sub(r'R\$\s*[\d.,]+', '[consulte valores]', response)

    # Remove "X reais"
    response = re.sub(r'[\d.,]+\s*reais', '[consulte valores]', response, flags=re.IGNORECASE)

    return response
