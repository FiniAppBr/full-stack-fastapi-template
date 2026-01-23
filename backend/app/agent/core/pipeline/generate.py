"""
Generate node - Response generation with structured output.

Single responsibility: Generate the agent's response messages.
"""

import re

from langchain_core.messages import SystemMessage

from app.agent.core.state import GraphState
from app.agent.llm import get_chat_llm, create_response_schema


def _has_booking_intent(message: str) -> bool:
    """
    Check if message indicates user wants to book/confirm.

    Args:
        message: User's message text

    Returns:
        True if booking intent detected
    """
    booking_patterns = [
        r'\b\d{1,2}[h:]\d{0,2}\b',  # Time patterns: 10h, 10:00
        r'\bpode\s+ser\b',  # "pode ser"
        r'\besse\s+(?:horário|horario)\b',  # "esse horário"
        r'\bconfirm[ao]\b',  # confirma/confirmo
        r'\bagend[ao]\b',  # agenda/agendo
        r'\breserv[ao]\b',  # reserva/reservo
        r'\bprimeiro\b',  # "primeiro horário"
        r'\búltimo\b',  # "último horário"
        r'\bquero\b',  # quero
    ]
    text_lower = message.lower()
    return any(re.search(p, text_lower) for p in booking_patterns)


def _check_booking_guard(state: GraphState) -> str | None:
    """
    Check if user wants to book but book_appointment wasn't called.

    Only triggers on turn 2+ when user is responding to availability options.

    Args:
        state: Current graph state

    Returns:
        Warning message if guard triggered, None otherwise
    """
    message = state.get("message", "")
    tool_calls_made = state.get("tool_calls_made", [])
    agent_state = state.get("agent_state")

    # Only check on turn 2+ (turn 1 is asking for availability)
    if not agent_state or agent_state.turn_count < 2:
        return None

    # Check if booking intent detected
    if not _has_booking_intent(message):
        return None

    # Check if book_appointment was called this turn
    book_called = any(tc.get("tool") == "book_appointment" for tc in tool_calls_made)
    if book_called:
        return None

    # Check if this turn had check_availability called (shouldn't trigger if we just showed options)
    check_called = any(tc.get("tool") == "check_availability" for tc in tool_calls_made)
    if check_called:
        return None

    # Guard triggered - user wants to book but we didn't call book_appointment
    return """⚠️ ATENÇÃO: O cliente indicou horário/confirmação, mas book_appointment NÃO foi chamado.
NÃO diga que está confirmado ou agendado.
Diga que precisa de mais informações ou peça desculpas pelo erro e pergunte os dados faltantes.
Se já tem todos os dados (data, horário, serviço, contato), PEÇA para o cliente confirmar novamente."""


def generate_node(state: GraphState) -> dict:
    """
    Generate response using structured output.

    ALWAYS produces a response - this is the guaranteed output node.
    Uses structured output to ensure valid multi-message format.

    Args:
        state: Current graph state with react_messages

    Returns:
        Updated state with response_messages and final_response
    """
    print("-> [Node] Generate")

    config = state["config"]
    messages = list(state["react_messages"])  # Copy to avoid mutation
    retry_count = state.get("retry_count", 0)

    # VALIDATION RETRY: Inject feedback from previous failed validation
    validation_issues = state.get("validation_issues", [])
    if validation_issues and retry_count > 0:
        feedback = f"""⚠️ ERRO NA RESPOSTA ANTERIOR - CORRIJA:
{chr(10).join(f'- {issue}' for issue in validation_issues)}

Gere uma nova resposta que NÃO viole essas regras."""
        messages.append(SystemMessage(content=feedback))
        print(f"  Retry {retry_count}: injected validation feedback")

    # BOOKING GUARD: Check if user wants to book but tool wasn't called
    booking_warning = _check_booking_guard(state)
    if booking_warning:
        print("  ⚠️ Booking guard triggered!")
        messages.append(SystemMessage(content=booking_warning))

    # Create response schema with configured message constraints
    ResponseSchema = create_response_schema(
        min_messages=config.multi_message.preferred_messages,
        max_messages=config.multi_message.max_messages
    )

    # Don't limit max_tokens for generation - it causes truncation errors
    # Verbosity is controlled via prompt instructions, not token limits
    llm = get_chat_llm(
        model=config.generation.model,
        temperature=config.generation.temperature,
        max_tokens=1024,  # High enough to never truncate structured output
    )

    # Use structured output - GUARANTEES we get a valid response
    llm_structured = llm.with_structured_output(ResponseSchema)

    try:
        result = llm_structured.invoke(messages)
        response_messages = result.messages
        print(f"  Generated {len(response_messages)} messages")
        if result.thinking:
            print(f"  Thinking: {result.thinking[:100]}...")

    except Exception as e:
        print(f"  Generation error: {e}")
        # Fallback - should rarely happen with structured output
        response_messages = ["Desculpe, ocorreu um erro. Pode repetir?"]

    # Track tokens
    tokens_used = state.get("tokens_used", 0)
    tokens_in = state.get("tokens_in", 0)
    tokens_out = state.get("tokens_out", 0)

    # Increment retry count for validation loop
    new_retry_count = state.get("retry_count", 0) + 1 if state.get("validation_issues") else 0

    return {
        "response_messages": response_messages,
        "final_response": "\n\n".join(response_messages),
        "tokens_used": tokens_used,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "retry_count": new_retry_count,
        "validation_issues": [],  # Clear for fresh validation
        "validation_passed": None  # Reset for fresh validation
    }
