"""
v3 LangGraph Integration - Clean Architecture.

Flow: preprocess → assemble → agent ⟷ tools → extract_data → generate → post_process

Key principles:
- Preprocessing normalizes dates/entities BEFORE LLM sees them
- Tools are for OPTIONAL actions (search, escalate)
- Nodes are for GUARANTEED steps (extract, generate, post_process)
- Response generation is ALWAYS a dedicated node, not a tool
- Data extraction uses structured output, not tool calls
- Tool results are cached to avoid redundant calls
"""

import os
import json
import math
import random
from typing import TypedDict, Annotated, Optional, Sequence

from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage, SystemMessage
from langchain_core.runnables import RunnableLambda
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from app.agent.checkpointer import get_checkpointer
from app.agent.core.schema import AgentState, MessageWithTiming, AssembleResult
from app.agent.core.config import BaseAgentConfig
from app.agent.tools.registry import get_enabled_tools, get_available_tools_summary
from app.agent.core.pipeline.assemble import assemble
from app.agent.core.prompts import build_generation_prompt
from app.agent.tools import get_tools_for_agent
from app.agent.core.preprocessing import preprocess_message, parse_relative_date, parse_time


OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


def get_chat_llm(model: str, temperature: float = 0.7, max_tokens: int = 500) -> ChatOpenAI:
    """Get ChatOpenAI configured for OpenRouter."""
    return ChatOpenAI(
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        openai_api_key=os.getenv("OPENROUTER_API_KEY"),
        openai_api_base=OPENROUTER_BASE_URL,
        default_headers={
            "HTTP-Referer": "https://connectai.com",
            "X-Title": "ConnectAI Agent",
        }
    )


# =============================================================================
# STRUCTURED OUTPUT SCHEMAS
# =============================================================================

def create_response_schema(min_messages: int, max_messages: int):
    """Create response schema with dynamic constraints."""
    class AgentResponse(BaseModel):
        """Structured response from the agent."""
        thinking: str = Field(description="Brief internal reasoning (not shown to user)")
        messages: list[str] = Field(
            description=f"MUST have {min_messages} to {max_messages} messages. Each message is a separate WhatsApp bubble. Split your response naturally - do NOT put everything in one message. Aim for {min_messages}-{(min_messages + max_messages) // 2} messages minimum.",
            min_length=min_messages,
            max_length=max_messages
        )
    return AgentResponse


def create_extraction_schema(fields: list[dict]):
    """Create dynamic extraction schema based on configured fields."""
    # Build field definitions dynamically
    field_descriptions = []
    for f in fields:
        field_id = f.get("id", f.get("field_id", "unknown"))
        hint = f.get("collection_hint", f.get("description", ""))
        necessity = f.get("necessity", "optional")
        field_descriptions.append(f"- {field_id}: {hint} ({necessity})")

    fields_text = "\n".join(field_descriptions) if field_descriptions else "No specific fields configured"

    class ExtractedData(BaseModel):
        """Data extracted from the conversation."""
        extracted: dict = Field(
            default_factory=dict,
            description=f"Key-value pairs of extracted data. Fields to look for:\n{fields_text}"
        )
    return ExtractedData


# =============================================================================
# GRAPH STATE
# =============================================================================

def react_messages_reducer(current: Sequence[BaseMessage], update: Sequence[BaseMessage]) -> Sequence[BaseMessage]:
    """Custom reducer: if update starts with SystemMessage, replace entirely. Otherwise append."""
    if update and len(update) > 0 and isinstance(update[0], SystemMessage):
        return list(update)
    return list(current) + list(update)


class GraphState(TypedDict):
    """State that flows through the LangGraph pipeline."""
    # Input
    message: str
    config: BaseAgentConfig

    # Agent state (persisted across conversations)
    agent_state: AgentState

    # Pipeline intermediates
    assembled: Optional[AssembleResult]

    # Preprocessing results (normalized dates, extracted entities)
    preprocessed: Optional[dict]

    # ReAct messages (for tool loop)
    react_messages: Annotated[Sequence[BaseMessage], react_messages_reducer]

    # Response (from generate node)
    response_messages: Optional[list[str]]

    # Tool tracking
    react_iterations: int
    tool_calls_made: list[dict]

    # Tool result cache (avoids redundant calls)
    cached_tool_results: Optional[dict]

    # Validation (for retry loop)
    validation_passed: Optional[bool]
    validation_issues: Optional[list[str]]
    retry_count: int

    # Output
    final_response: Optional[str]
    messages: list[MessageWithTiming]
    escalation: Optional[dict]
    tokens_used: int
    tokens_in: int
    tokens_out: int
    system_prompt: Optional[str]


# =============================================================================
# NODE: PREPROCESS (Date/Entity Normalization)
# =============================================================================

def preprocess_node(state: GraphState) -> dict:
    """
    Normalize dates and times BEFORE LLM processing.

    This catches patterns like:
    - "sábado" → "2025-12-06"
    - "amanhã às 10h" → date + time

    All other data extraction (names, pet info, etc.) is handled by the LLM.
    """
    print("-> [Node] Preprocess")

    message = state["message"]
    agent_state = state["agent_state"]

    # Run preprocessing (only date/time normalization)
    preprocessed = preprocess_message(message)

    if preprocessed:
        print(f"  Extracted: {preprocessed}")

        # Inject normalized date into collected_data for tools to use
        if "normalized_date" in preprocessed:
            agent_state.update_collected_data("_normalized_date", preprocessed["normalized_date"])
            print(f"  Date normalized: {preprocessed['normalized_date']}")

        if "normalized_time" in preprocessed:
            agent_state.update_collected_data("_normalized_time", preprocessed["normalized_time"])
            print(f"  Time normalized: {preprocessed['normalized_time']}")
    else:
        print("  No preprocessing matches")

    return {
        "preprocessed": preprocessed,
        "agent_state": agent_state
    }


# =============================================================================
# NODE: ASSEMBLE
# =============================================================================

def assemble_node(state: GraphState) -> dict:
    """Build RAG context from message + history."""
    print("-> [Node] Assemble")

    config = state["config"]
    agent_state = state["agent_state"]
    message = state["message"]

    # Add user message to history
    agent_state.add_to_history("user", message)
    agent_state.turn_count += 1

    # Assemble RAG context
    assembled = assemble(config, agent_state, message)

    # Build system prompt
    system_prompt = build_generation_prompt(
        config=config,
        state=agent_state,
        chunks=assembled.chunks,
    )

    # Add collected data context if any
    if agent_state.collected_data:
        # Filter out internal keys (start with _)
        visible_data = {k: v for k, v in agent_state.collected_data.items() if not k.startswith("_")}
        if visible_data:
            system_prompt += f"\n\n## DADOS JÁ COLETADOS\nVocê já sabe sobre o cliente:\n"
            for key, value in visible_data.items():
                system_prompt += f"- {key}: {value}\n"
            system_prompt += "\nNÃO pergunte novamente informações que você já tem."

        # Add normalized date context for tools (from preprocessing)
        normalized_date = agent_state.collected_data.get("_normalized_date")
        normalized_time = agent_state.collected_data.get("_normalized_time")
        if normalized_date or normalized_time:
            system_prompt += "\n\n## CONTEXTO DE DATA/HORA"
            if normalized_date:
                system_prompt += f"\nData mencionada pelo cliente: {normalized_date} (formato YYYY-MM-DD)"
            if normalized_time:
                system_prompt += f"\nHorário mencionado: {normalized_time}"
            system_prompt += "\nUse estes valores ao chamar ferramentas de agendamento."

    # Add tool instructions if tools enabled
    if config.enabled_tool_categories:
        tools_summary = get_available_tools_summary(config.enabled_tool_categories)
        system_prompt += f"\n\n## Ferramentas Disponíveis\n{tools_summary}"

        # Add explicit tool usage instructions (compressed)
        tool_instructions = """
## USO DE FERRAMENTAS (OBRIGATÓRIO)
• Horários/datas → check_availability ANTES de responder
• Agendar/reservar → book_appointment ANTES de confirmar
• Cancelar → cancel_appointment
• Remarcar → reschedule_appointment
• Criar tarefa → create_task
⚠️ PROIBIDO dizer "agendado/confirmado" SEM chamar book_appointment primeiro."""
        system_prompt += tool_instructions

        # BOOKING FORCE: If previous turn showed availability and user provided time,
        # add explicit instruction to call book_appointment
        full_history = agent_state.history
        if agent_state.turn_count >= 2 and len(full_history) >= 2:
            # Check if previous assistant message contained availability info
            prev_messages = [m for m in full_history if m["role"] == "assistant"]
            if prev_messages:
                last_assistant = prev_messages[-1]["content"].lower()
                availability_keywords = [
                    "disponível", "disponivel", "horário", "horario", "10:00", "11:00",
                    "segunda", "terça", "quarta", "quinta", "sexta", "sábado", "sabado",
                    "temos horários", "temos horario", "horários disponíveis"
                ]
                availability_shown = any(kw in last_assistant for kw in availability_keywords)
                if availability_shown:
                    # Check if current message has time confirmation
                    msg_lower = message.lower()
                    time_keywords = [
                        "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h",
                        "10:00", "11:00", "12:00", "pode ser", "esse", "primeiro", "último"
                    ]
                    has_time = any(kw in msg_lower for kw in time_keywords)
                    if has_time:
                        system_prompt += """

## 🚨 AÇÃO OBRIGATÓRIA NESTE TURNO
O cliente escolheu um horário. VOCÊ DEVE chamar book_appointment AGORA.
Parâmetros necessários:
- booking_date: use a data normalizada acima
- booking_time: o horário que o cliente escolheu
- service_name: o serviço solicitado
- customer_name: nome do cliente (se fornecido)
- customer_phone: telefone do cliente (se fornecido)
- professional_name: o profissional disponível

⛔ NÃO responda sem chamar book_appointment primeiro."""

        if assembled.tool_context:
            system_prompt += f"\n\n## Instruções de Ferramentas\n{assembled.tool_context}"

    print(f"  System prompt: {len(system_prompt)} chars (~{len(system_prompt)//4} tokens)")

    # Build react_messages with conversation history
    react_messages = [SystemMessage(content=system_prompt)]

    # Add conversation history (excluding current message which was just added)
    # Use history_turns from config to limit context
    history_turns = config.generation.history_turns
    # Get history excluding the last entry (current user message)
    history = agent_state.history[:-1] if agent_state.history else []
    # Take last N*2 messages (N turns = N user + N assistant messages)
    recent_history = history[-(history_turns * 2):] if history else []

    for msg in recent_history:
        if msg["role"] == "user":
            react_messages.append(HumanMessage(content=msg["content"]))
        else:
            react_messages.append(AIMessage(content=msg["content"]))

    # Add current user message
    react_messages.append(HumanMessage(content=message))

    print(f"  History: {len(recent_history)} messages from {len(history)} total")

    return {
        "assembled": assembled,
        "react_messages": react_messages,
        "agent_state": agent_state,
        "system_prompt": system_prompt
    }


# =============================================================================
# NODE: AGENT (Tool Loop)
# =============================================================================

MAX_REACT_ITERATIONS = 3


def agent_node(state: GraphState) -> dict:
    """ReAct agent - handles tool calls only. Response is generated separately."""
    print("-> [Node] Agent")

    config = state["config"]
    messages = state["react_messages"]
    iterations = state.get("react_iterations", 0)

    # Get available tools (NO SendResponse - that's handled by generate node)
    enabled_tool_names = get_enabled_tools(config.enabled_tool_categories)
    tools = get_tools_for_agent(enabled_tool_names)

    # If no tools or max iterations, skip to generate
    if not tools or iterations >= MAX_REACT_ITERATIONS:
        if iterations >= MAX_REACT_ITERATIONS:
            print(f"  Max iterations ({MAX_REACT_ITERATIONS}) reached")
        else:
            print("  No tools enabled, skipping to generate")
        return {"react_iterations": iterations}

    print(f"  Bound tools: {[t.name for t in tools]}")

    llm = get_chat_llm(
        model=config.generation.model,
        temperature=config.generation.temperature,
        max_tokens=config.generation.max_tokens,
    )
    llm_with_tools = llm.bind_tools(tools)

    response = llm_with_tools.invoke(messages)

    # Track tokens
    metadata = response.response_metadata if hasattr(response, "response_metadata") else {}
    usage = metadata.get("usage", metadata.get("token_usage", {}))
    input_tokens = usage.get("prompt_tokens", usage.get("input_tokens", 0))
    output_tokens = usage.get("completion_tokens", usage.get("output_tokens", 0))
    print(f"  Tokens: {input_tokens} in + {output_tokens} out")

    tokens_used = state.get("tokens_used", 0) + input_tokens + output_tokens
    tokens_in = state.get("tokens_in", 0) + input_tokens
    tokens_out = state.get("tokens_out", 0) + output_tokens

    has_tool_calls = hasattr(response, 'tool_calls') and response.tool_calls
    if has_tool_calls:
        print(f"  Tool calls: {[tc['name'] for tc in response.tool_calls]}")

    return {
        "react_messages": [response],
        "tokens_used": tokens_used,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "react_iterations": iterations + 1
    }


# =============================================================================
# NODE: TOOLS
# =============================================================================

def tools_node(state: GraphState) -> dict:
    """
    Execute tools called by the agent.

    Features:
    - Caches check_availability results to avoid redundant calls
    - Enhanced error handling with recovery hints
    - Injects normalized date from preprocessing if tool needs it
    """
    print("-> [Node] Tools")

    config = state["config"]
    agent_state = state["agent_state"]
    messages = state["react_messages"]
    last_message = messages[-1]

    if not hasattr(last_message, 'tool_calls') or not last_message.tool_calls:
        return {}

    enabled_tool_names = get_enabled_tools(config.enabled_tool_categories)
    tools = get_tools_for_agent(enabled_tool_names)
    tool_map = {tool.name: tool for tool in tools}

    tool_messages = []
    tool_calls_made = state.get("tool_calls_made", [])
    cached_results = state.get("cached_tool_results", {}) or {}

    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"].copy()  # Copy to avoid mutation

        # Inject normalized date if available and tool expects it
        if tool_name in ["check_availability", "book_appointment"]:
            if "preferred_date" in tool_args or "booking_date" in tool_args:
                # If date is relative/informal, try to use preprocessed date
                date_key = "preferred_date" if "preferred_date" in tool_args else "booking_date"
                date_value = tool_args.get(date_key, "")
                # Check if it's not already in YYYY-MM-DD format
                if date_value and not (len(date_value) == 10 and date_value[4] == "-"):
                    normalized = agent_state.collected_data.get("_normalized_date")
                    if normalized:
                        print(f"  Injecting normalized date: {date_value} → {normalized}")
                        tool_args[date_key] = normalized

        # Check cache for check_availability (avoid redundant calls)
        cache_key = f"{tool_name}:{json.dumps(tool_args, sort_keys=True)}"
        if tool_name == "check_availability" and cache_key in cached_results:
            print(f"  Cache hit: {tool_name}")
            cached_result = cached_results[cache_key]
            tool_messages.append(
                ToolMessage(content=cached_result, tool_call_id=tool_call["id"])
            )
            tool_calls_made.append({
                "tool": tool_name,
                "args": tool_args,
                "result": "(cached) " + cached_result[:200],
                "success": True,
                "cached": True
            })
            continue

        print(f"  Executing: {tool_name}({tool_args})")

        tool = tool_map.get(tool_name)
        if tool:
            try:
                result = tool.invoke(tool_args)
                result_str = str(result)
                tool_messages.append(
                    ToolMessage(content=result_str, tool_call_id=tool_call["id"])
                )
                tool_calls_made.append({
                    "tool": tool_name,
                    "args": tool_args,
                    "result": result_str[:500],
                    "success": True
                })
                # Cache check_availability results
                if tool_name == "check_availability":
                    cached_results[cache_key] = result_str
                    print(f"  Cached result for: {cache_key[:50]}...")

            except Exception as e:
                error_msg = f"Error: {str(e)}\nTente novamente com parâmetros corrigidos."
                tool_messages.append(
                    ToolMessage(content=error_msg, tool_call_id=tool_call["id"])
                )
                tool_calls_made.append({
                    "tool": tool_name,
                    "args": tool_args,
                    "result": error_msg,
                    "success": False
                })
        else:
            tool_messages.append(
                ToolMessage(content=f"Tool {tool_name} not found", tool_call_id=tool_call["id"])
            )

    return {
        "react_messages": tool_messages,
        "tool_calls_made": tool_calls_made,
        "cached_tool_results": cached_results
    }


# =============================================================================
# NODE: EXTRACT DATA (Optional - only if data collection configured)
# =============================================================================

def extract_data_node(state: GraphState) -> dict:
    """Extract structured data from conversation using dedicated LLM call."""
    print("-> [Node] Extract Data")

    config = state["config"]
    agent_state = state["agent_state"]

    # Default fields always collected
    default_fields = [
        {"id": "name", "description": "Nome do usuário/cliente"}
    ]

    # Get additional data collection fields from objectives
    custom_fields = [
        {"id": obj.id.replace("collect_field_", ""), "description": obj.description}
        for obj in config.objectives
        if obj.id.startswith("collect_field_")
    ]

    # Merge default + custom (avoid duplicates)
    custom_ids = {f["id"] for f in custom_fields}
    collection_fields = [f for f in default_fields if f["id"] not in custom_ids] + custom_fields

    # Build extraction prompt from recent conversation
    recent_history = agent_state.get_recent_history(3)
    conversation_text = "\n".join([
        f"{'User' if m['role'] == 'user' else 'Agent'}: {m['content']}"
        for m in recent_history
    ])

    extraction_prompt = f"""Extract ONLY explicitly stated data from this conversation.

Conversation:
{conversation_text}

Fields to look for:
{json.dumps(collection_fields, ensure_ascii=False, indent=2)}

STRICT RULES:
- "name": ONLY extract if user explicitly says their name (e.g., "meu nome é João", "sou a Maria", "me chamo Pedro")
- Do NOT extract descriptions, statements, or context as names
- Do NOT guess or infer - only extract what is explicitly stated
- If unsure, do NOT include the field

Return empty dict if no clear data was provided."""

    try:
        # Use fast model for extraction
        llm = get_chat_llm(
            model="google/gemini-2.5-flash-lite",
            temperature=0.1,
            max_tokens=200
        )

        ExtractionSchema = create_extraction_schema(collection_fields)
        llm_structured = llm.with_structured_output(ExtractionSchema)

        result = llm_structured.invoke([HumanMessage(content=extraction_prompt)])

        if result.extracted:
            print(f"  Extracted: {result.extracted}")
            for key, value in result.extracted.items():
                agent_state.update_collected_data(key, value)
            return {"agent_state": agent_state}
        else:
            print("  No data extracted")

    except Exception as e:
        print(f"  Extraction error (skipping): {e}")

    return {}


# =============================================================================
# NODE: GENERATE (Guaranteed response)
# =============================================================================

def _has_booking_intent(message: str) -> bool:
    """Check if message indicates user wants to book/confirm."""
    import re
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
    Returns warning message if guard triggered, None otherwise.

    Only triggers on turn 2+ when user is responding to availability options.
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
    """Generate response using structured output. ALWAYS produces a response."""
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
        print(f"  ⚠️ Booking guard triggered!")
        # Inject warning as system message at the end
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


# =============================================================================
# NODE: VALIDATE (Post-generation validation)
# =============================================================================

def _check_hallucination(response: str, chunks: list) -> Optional[str]:
    """
    Use LLM to check if response contains hallucinated facts.
    Returns description of hallucination if found, None if clean.
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
    Returns validation_passed (bool) and validation_issues (list).
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


def should_retry_generation(state: GraphState) -> str:
    """Decide whether to retry generation or proceed to post-process."""
    if state.get("validation_passed", True):
        return "post_process"

    retry_count = state.get("retry_count", 0)
    max_retries = 2

    if retry_count >= max_retries:
        print(f"  Max retries ({max_retries}) reached, proceeding anyway")
        return "post_process"

    print(f"  Retrying generation (attempt {retry_count + 1}/{max_retries})")
    return "generate"


# =============================================================================
# NODE: POST-PROCESS
# =============================================================================

def post_process_node(state: GraphState) -> dict:
    """Calculate timing and sync data to Contact."""
    print("-> [Node] Post-process")

    config = state["config"]
    agent_state = state["agent_state"]
    response_messages = state.get("response_messages", [])
    final_response = state.get("final_response", "")

    if not response_messages:
        response_messages = ["Desculpe, ocorreu um erro. Pode repetir?"]
        final_response = response_messages[0]

    # Calculate typing times - realistic human mobile typing speed
    # Real mobile typing: ~30-40 WPM = 2.5-3.3 chars/sec = ~300-400ms per char
    # But chatbot context can be slightly faster (~100ms/char = 10 chars/sec)
    # Formula: base thinking time + linear per-character time + variance
    messages_with_timing = []
    for i, msg in enumerate(response_messages):
        if config.multi_message.typing.enabled:
            char_count = len(msg)
            # Base delay: 1.7s (reading message + thinking what to say)
            # Per char: 138ms (~7 chars/sec - realistic for mobile typing)
            # +15% from previous values
            base = 1725
            per_char = 138
            variance = random.randint(-300, 400)
            typing_ms = int(base + (char_count * per_char) + variance)
            typing_ms = max(typing_ms, 1500)  # Floor at 1.5s
        else:
            typing_ms = 0
        pause_ms = config.multi_message.typing.between_messages_ms if i < len(response_messages) - 1 else 0

        messages_with_timing.append(
            MessageWithTiming(content=msg, typing_delay_ms=typing_ms, pause_after_ms=pause_ms)
        )

    # Update history
    for msg in response_messages:
        agent_state.add_to_history("assistant", msg)

    # Track soft gate states based on agent's response
    combined_response = " ".join(response_messages).lower()

    # If agent asked about budget/orçamento, mark the gate as triggered
    budget_keywords = ["orçamento", "orcamento", "budget", "quanto.*investir", "quanto.*gastar"]
    import re
    for kw in budget_keywords:
        if re.search(kw, combined_response):
            agent_state.update_collected_data("_gate_price_budget_asked", True)
            print("  Gate tracked: price.budget asked")
            break

    # Sync to Contact if linked
    if agent_state.contact_id and agent_state.collected_data:
        try:
            _sync_contact_data(agent_state.contact_id, agent_state.collected_data)
            print(f"  Synced to contact {agent_state.contact_id}: {list(agent_state.collected_data.keys())}")
        except Exception as e:
            print(f"  Sync error: {e}")

    return {
        "final_response": final_response,
        "messages": messages_with_timing,
        "agent_state": agent_state
    }


def _sync_contact_data(contact_id: int, collected_data: dict):
    """Sync collected data to Contact.data in database."""
    from sqlmodel import Session
    from app.core.db import engine
    from app.models.contact import Contact

    with Session(engine) as session:
        contact = session.get(Contact, contact_id)
        if contact:
            if contact.data is None:
                contact.data = {}
            contact.data.update(collected_data)
            session.add(contact)
            session.commit()


# =============================================================================
# ROUTING
# =============================================================================

def should_continue_after_agent(state: GraphState) -> str:
    """Route: if agent called tools → tools, else → extract_data."""
    messages = state.get("react_messages", [])

    if not messages:
        return "extract_data"

    last_message = messages[-1]

    # If agent called tools, execute them
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "tools"

    # No tool calls → proceed to extraction
    return "extract_data"


def should_continue_after_tools(state: GraphState) -> str:
    """Route: loop back to agent for more tool calls, or proceed."""
    iterations = state.get("react_iterations", 0)

    if iterations >= MAX_REACT_ITERATIONS:
        return "extract_data"

    # Go back to agent to potentially call more tools or finish
    return "agent"


# =============================================================================
# GRAPH BUILDER
# =============================================================================

def build_graph() -> StateGraph:
    """
    Build the v3 pipeline graph.

    Flow: preprocess → assemble → agent ⟷ tools → extract_data → generate → validate → post_process
                                                                      ↑           ↓
                                                                      └─── [fail] ┘ (max 2 retries)

    - preprocess: Normalizes dates, extracts entities (BEFORE LLM sees message)
    - assemble: Builds RAG context
    - agent: Handles tool calls (search, escalate, etc.)
    - tools: Executes tools with caching
    - extract_data: Extracts structured data from conversation (if configured)
    - generate: ALWAYS produces a response (guaranteed)
    - validate: Checks guardrails and hallucinations, retries if needed
    - post_process: Calculate timing and format output
    """
    graph = StateGraph(GraphState)

    # Add nodes
    graph.add_node("preprocess", preprocess_node)
    graph.add_node("assemble", assemble_node)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tools_node)
    graph.add_node("extract_data", extract_data_node)
    graph.add_node("generate", generate_node)
    graph.add_node("validate", validate_node)  # NEW: Post-generation validation
    graph.add_node("post_process", post_process_node)

    # Set entry point
    graph.set_entry_point("preprocess")

    # Preprocess → Assemble
    graph.add_edge("preprocess", "assemble")

    # Assemble → Agent
    graph.add_edge("assemble", "agent")

    # Agent → Tools or Extract
    graph.add_conditional_edges(
        "agent",
        should_continue_after_agent,
        {
            "tools": "tools",
            "extract_data": "extract_data"
        }
    )

    # Tools → Agent (loop) or Extract
    graph.add_conditional_edges(
        "tools",
        should_continue_after_tools,
        {
            "agent": "agent",
            "extract_data": "extract_data"
        }
    )

    # Extract → Generate (always)
    graph.add_edge("extract_data", "generate")

    # Generate → Validate (always)
    graph.add_edge("generate", "validate")

    # Validate → Post-process or Generate (retry)
    graph.add_conditional_edges(
        "validate",
        should_retry_generation,
        {
            "post_process": "post_process",
            "generate": "generate"  # Retry loop
        }
    )

    # Post-process → END
    graph.add_edge("post_process", END)

    return graph


# =============================================================================
# COMPILED GRAPH
# =============================================================================

_compiled_graph = None


def get_compiled_graph():
    """Get or create compiled graph with checkpointer."""
    global _compiled_graph
    if _compiled_graph is None:
        graph = build_graph()
        checkpointer = get_checkpointer()
        _compiled_graph = graph.compile(checkpointer=checkpointer)
    return _compiled_graph


def reset_compiled_graph():
    """Reset the compiled graph (call after config changes)."""
    global _compiled_graph
    _compiled_graph = None


# =============================================================================
# RUN FUNCTION
# =============================================================================

def run_turn_with_graph(
    config: BaseAgentConfig,
    thread_id: str,
    message: str,
    initial_state: Optional[AgentState] = None,
    contact_id: Optional[int] = None
) -> dict:
    """
    Run a turn using the LangGraph pipeline.

    Args:
        config: Agent configuration
        thread_id: Conversation thread ID
        message: User's message
        initial_state: Optional initial state
        contact_id: Optional contact ID for data sync (None for preview)

    Returns:
        Dict with messages, state, tokens_used
    """
    graph = get_compiled_graph()
    config_dict = {"configurable": {"thread_id": thread_id}}

    # Load existing state from checkpoint
    agent_state = None
    try:
        checkpoint_state = graph.get_state(config_dict)
        if checkpoint_state and checkpoint_state.values:
            agent_state = checkpoint_state.values.get("agent_state")
            if agent_state:
                print(f"  Loaded state: turn {agent_state.turn_count}")
    except Exception as e:
        print(f"  No checkpoint: {e}")

    # Use initial state if no checkpoint
    if agent_state is None:
        agent_state = initial_state or config.create_initial_state(thread_id)
        print("  Created new state")

    # Set contact_id for data sync
    if contact_id is not None:
        agent_state.contact_id = contact_id

    input_state: GraphState = {
        "message": message,
        "config": config,
        "agent_state": agent_state,
        "assembled": None,
        "preprocessed": None,  # NEW: Preprocessing results
        "react_messages": [],
        "response_messages": None,
        "react_iterations": 0,
        "tool_calls_made": [],
        "cached_tool_results": {},  # NEW: Tool result cache
        "final_response": None,
        "messages": [],
        "escalation": None,
        "tokens_used": 0,
        "tokens_in": 0,
        "tokens_out": 0,
        "system_prompt": None
    }

    # Run graph
    result = graph.invoke(input_state, config=config_dict)

    return {
        "messages": [
            {
                "content": m.content,
                "typing_delay_ms": m.typing_delay_ms,
                "pause_after_ms": m.pause_after_ms
            }
            for m in result["messages"]
        ],
        "state": {
            "turn_count": result["agent_state"].turn_count,
            "history_length": len(result["agent_state"].history),
            "collected_data": result["agent_state"].collected_data
        },
        "tokens_used": result["tokens_used"],
        "tokens_in": result.get("tokens_in", 0),
        "tokens_out": result.get("tokens_out", 0),
        "_debug": {
            "assembled_chunks": len(result.get("assembled").chunks) if result.get("assembled") else 0,
            "tool_calls": result.get("tool_calls_made", []),
            "system_prompt": result.get("system_prompt", "")
        }
    }


def get_conversation_state(thread_id: str) -> Optional[dict]:
    """Get the current state for a conversation thread."""
    graph = get_compiled_graph()
    config = {"configurable": {"thread_id": thread_id}}

    try:
        state = graph.get_state(config)
        if state and state.values:
            agent_state = state.values.get("agent_state")
            if agent_state:
                return {
                    "turn_count": agent_state.turn_count,
                    "history_length": len(agent_state.history),
                    "collected_data": getattr(agent_state, 'collected_data', {})
                }
    except Exception as e:
        print(f"Error getting state: {e}")

    return None
