"""
Validate node - Post-generation validation and hallucination checking.

Single responsibility: Validate responses against guardrails and check for hallucinations.
"""

from typing import Optional

from langchain_core.messages import HumanMessage

from app.agent.core.state import GraphState
from app.agent.llm import get_chat_llm


def _check_hallucination(response: str, chunks: list) -> Optional[str]:
    """
    Use LLM to check if response contains hallucinated facts.

    Args:
        response: Agent's response text
        chunks: RAG chunks used for context

    Returns:
        Description of hallucination if found, None if clean
    """
    if not chunks or not response:
        return None

    # Build context from chunks
    chunk_texts = []
    for chunk in chunks:
        if hasattr(chunk, 'content'):
            chunk_texts.append(chunk.content)
        elif isinstance(chunk, dict):
            chunk_texts.append(chunk.get('content', ''))

    if not chunk_texts:
        return None

    context = "\n".join(chunk_texts)

    validation_prompt = f"""Verifique se a RESPOSTA contém informações que NÃO estão no CONTEXTO fornecido.

CONTEXTO (fonte de verdade):
{context[:2000]}

RESPOSTA DO AGENTE:
{response}

Se a resposta contém FATOS ESPECÍFICOS (preços, quantidades, datas, nomes) que NÃO estão no contexto, responda com uma descrição curta do problema.
Se a resposta está correta ou apenas faz perguntas/comentários gerais, responda "OK".

Resposta (apenas "OK" ou descrição do problema):"""

    try:
        llm = get_chat_llm(
            model="google/gemini-2.5-flash-lite",
            temperature=0.1,
            max_tokens=100
        )
        result = llm.invoke([HumanMessage(content=validation_prompt)])
        answer = result.content.strip()

        if answer.upper() == "OK" or len(answer) < 5:
            return None
        return answer
    except Exception as e:
        print(f"  Hallucination check error: {e}")
        return None


def validate_node(state: GraphState) -> dict:
    """
    Validate response against guardrails and check for hallucinations.

    Checks:
    1. never_say violations (rule-based)
    2. Response length (rule-based)
    3. Greeting after turn 1 (rule-based)
    4. Hallucination (LLM-based)

    Args:
        state: Current graph state with response_messages

    Returns:
        Updated state with validation_passed, validation_issues, retry_count
    """
    print("-> [Node] Validate")

    config = state["config"]
    response_messages = state.get("response_messages", [])
    retry_count = state.get("retry_count", 0)

    if not response_messages:
        return {
            "validation_passed": True,
            "validation_issues": [],
            "retry_count": retry_count
        }

    combined_response = " ".join(response_messages).lower()
    issues = []

    # 1. Rule-based checks: never_say
    for rule in config.guardrails.never_say:
        if rule.text.lower() in combined_response:
            issues.append(f"NEVER_SAY: '{rule.text}'")
            print(f"  Violation: never_say '{rule.text}'")

    # 2. Rule-based checks: response length
    total_chars = sum(len(m) for m in response_messages)
    max_chars = config.multi_message.max_response_length * config.multi_message.max_messages
    if total_chars > max_chars * 1.5:  # 50% tolerance
        issues.append(f"Response too long: {total_chars} chars (max ~{max_chars})")
        print(f"  Violation: response too long ({total_chars} chars)")

    # 3. Turn-based: no greeting after turn 1
    turn_count = state["agent_state"].turn_count
    if turn_count > 1:
        greeting_patterns = ["olá", "ola", "oi!", "oi,", "oi ", "bom dia", "boa tarde", "boa noite"]
        for pattern in greeting_patterns:
            if combined_response.startswith(pattern) or f"\n{pattern}" in combined_response:
                issues.append(f"Greeting after turn {turn_count}")
                print(f"  Violation: greeting after turn {turn_count}")
                break

    # 4. LLM-based: hallucination check
    assembled = state.get("assembled")
    if assembled and hasattr(assembled, 'chunks') and assembled.chunks:
        full_response = " ".join(response_messages)
        hallucination = _check_hallucination(full_response, assembled.chunks)
        if hallucination:
            issues.append(f"Hallucination: {hallucination}")
            print(f"  Violation: hallucination - {hallucination}")

    validation_passed = len(issues) == 0

    if validation_passed:
        print("  Validation passed")
    else:
        print(f"  Validation failed: {len(issues)} issues")

    return {
        "validation_passed": validation_passed,
        "validation_issues": issues,
        "retry_count": retry_count
    }
