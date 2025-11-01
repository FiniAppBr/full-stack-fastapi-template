"""
Behavior Engines for Agent Configuration

Implements the three-layer enforcement system:
1. GATING - Filter knowledge before AI sees it
2. GUIDING - Instructions that shape AI behavior
3. VALIDATING - Check and modify AI output
"""

def apply_gating_rules(knowledge_chunks: list[dict], current_fields: dict, gating_rules: list[dict]) -> list[dict]:
    """
    GATING ENGINE: Filter knowledge chunks based on field conditions.

    Args:
        knowledge_chunks: List of knowledge chunks with optional tags
        current_fields: Current values of custom fields
        gating_rules: List of rules like:
            [{"if_field": "budget_range", "equals": "unknown", "exclude_tags": ["pricing"]}]

    Returns:
        Filtered list of knowledge chunks

    Example:
        >>> chunks = [
        ...     {"text": "Sofá R$5,000", "tags": ["pricing", "products"]},
        ...     {"text": "Sofá de couro", "tags": ["products"]}
        ... ]
        >>> fields = {"budget_range": "unknown"}
        >>> rules = [{"if_field": "budget_range", "equals": "unknown", "exclude_tags": ["pricing"]}]
        >>> apply_gating_rules(chunks, fields, rules)
        [{"text": "Sofá de couro", "tags": ["products"]}]
    """
    if not gating_rules:
        return knowledge_chunks

    filtered_chunks = knowledge_chunks.copy()

    for rule in gating_rules:
        field_name = rule.get("if_field")
        expected_value = rule.get("equals")
        exclude_tags = rule.get("exclude_tags", [])

        # Check if rule condition is met
        if field_name in current_fields and current_fields[field_name] == expected_value:
            # Filter out chunks with excluded tags
            filtered_chunks = [
                chunk for chunk in filtered_chunks
                if not any(tag in chunk.get("tags", []) for tag in exclude_tags)
            ]

    return filtered_chunks


def build_dynamic_instructions(base_instructions: str, current_fields: dict, instruction_rules: list[str]) -> str:
    """
    GUIDING ENGINE: Build dynamic instructions based on current field values.

    Args:
        base_instructions: Base personality/instructions
        current_fields: Current values of custom fields
        instruction_rules: List of additional instruction snippets

    Returns:
        Combined instructions string
    """
    instructions = base_instructions

    # Add dynamic instruction snippets
    if instruction_rules:
        instructions += "\n\n" + "\n".join(instruction_rules)

    return instructions


def validate_response(
    response_text: str,
    current_fields: dict,
    validation_rules: list[dict],
    media_array: list[dict]
) -> dict:
    """
    VALIDATING ENGINE: Check response and modify based on validation rules.

    Args:
        response_text: Generated response text
        current_fields: Current values of custom fields
        validation_rules: List of validation rules
        media_array: Media attachments to send

    Returns:
        dict with:
            - modified_response: Possibly modified response text
            - modified_media: Possibly modified media array
            - violations: List of rule violations (for logging)

    Example rule:
        {
            "if_field": "budget_range",
            "equals": "unknown",
            "response_contains": ["R$", "reais"],
            "action": "strip_prices",
            "message": "Prices stripped - budget not qualified"
        }
    """
    modified_response = response_text
    modified_media = media_array.copy()
    violations = []

    if not validation_rules:
        return {
            "modified_response": modified_response,
            "modified_media": modified_media,
            "violations": violations
        }

    for rule in validation_rules:
        field_name = rule.get("if_field")
        expected_value = rule.get("equals")
        contains_patterns = rule.get("response_contains", [])
        action = rule.get("action")
        message = rule.get("message", "")

        # Check if rule condition is met
        if field_name not in current_fields or current_fields[field_name] != expected_value:
            continue

        # Check if response contains forbidden patterns
        response_has_pattern = any(
            pattern.lower() in modified_response.lower()
            for pattern in contains_patterns
        )

        if not response_has_pattern:
            continue

        # Execute action
        if action == "strip_prices":
            # Remove price patterns (R$, USD, etc.)
            import re
            modified_response = re.sub(r'R\$\s*[\d.,]+', '[preço sob consulta]', modified_response)
            modified_response = re.sub(r'USD\s*[\d.,]+', '[price on request]', modified_response)
            violations.append({
                "rule": rule,
                "message": message,
                "action_taken": "stripped_prices"
            })

        elif action == "block_media":
            # Remove all media
            modified_media = []
            violations.append({
                "rule": rule,
                "message": message,
                "action_taken": "blocked_media"
            })

        elif action == "append_message":
            # Append additional text
            append_text = rule.get("text", "")
            if append_text:
                modified_response += f"\n\n{append_text}"
            violations.append({
                "rule": rule,
                "message": message,
                "action_taken": "appended_message"
            })

    return {
        "modified_response": modified_response,
        "modified_media": modified_media,
        "violations": violations
    }


def should_gate_knowledge(field_name: str, field_value: str, gating_rules: list[dict]) -> list[str]:
    """
    Helper to determine which tags to exclude based on current field value.

    Args:
        field_name: Name of the field
        field_value: Current value of the field
        gating_rules: List of gating rules

    Returns:
        List of tags to exclude from knowledge retrieval
    """
    exclude_tags = []

    for rule in gating_rules:
        if rule.get("if_field") == field_name and rule.get("equals") == field_value:
            exclude_tags.extend(rule.get("exclude_tags", []))

    return list(set(exclude_tags))  # Remove duplicates
