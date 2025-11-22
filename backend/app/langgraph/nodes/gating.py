"""
Gating node - applies rules to exclude content based on state.
"""


def create_apply_gating_node(gating_rules: list):
    """Create gating node with agent-specific rules."""
    def apply_gating_node(state: dict) -> dict:
        """Apply gating rules based on current state."""
        print("→ Apply Gating Node")

        excluded_tags = []

        if not gating_rules:
            return {"excluded_tags": excluded_tags}

        for rule in gating_rules:
            field_name = rule.get("if_field")
            expected_value = rule.get("equals")
            tags_to_exclude = rule.get("exclude_tags", [])

            if field_name in state and state.get(field_name) == expected_value:
                excluded_tags.extend(tags_to_exclude)
                print(f"  ✓ Gating: {field_name}={expected_value} → excluding {tags_to_exclude}")

        return {"excluded_tags": list(set(excluded_tags))}

    return apply_gating_node
