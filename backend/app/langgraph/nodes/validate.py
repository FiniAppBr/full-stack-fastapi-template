"""
Validation node - validates response against rules.
"""
from app.agents.utils.behavior_engines import validate_response


def create_validate_node(validation_rules: list):
    """Create validation node with agent-specific rules."""
    def validate_node(state: dict) -> dict:
        """Validate response against validation rules."""
        print("→ Validation Node")

        response = state.get("response", "")

        if not validation_rules:
            print("  ✓ No validation rules")
            return {"validation_passed": True}

        result = validate_response(
            response_text=response,
            current_fields=state,
            validation_rules=validation_rules,
            media_array=[]
        )

        modified_response = result.get("modified_response", response)
        violations = result.get("violations", [])

        if violations:
            print(f"  ⚠ Validation modified response: {len(violations)} rules triggered")
            return {
                "response": modified_response,
                "validation_passed": True,
                "validation_message": f"{len(violations)} rules applied"
            }

        print("  ✓ Validation passed")
        return {"validation_passed": True}

    return validate_node
