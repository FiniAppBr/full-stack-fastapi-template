"""
v3 LangGraph Integration - Simplified ReAct Architecture.

Flow: assemble → agent ⟷ tools → validate → post_process

No extraction LLM call. Search query built from message + history.
Validation node checks response quality (single retry if failed).
Escalation handled via tool call in ReAct loop.
"""

import os
import json
import operator
from typing import TypedDict, Annotated, Optional, Sequence

from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

from app.agent.checkpointer import get_checkpointer
from app.agent.v3.schema import AgentState, MessageWithTiming, AssembleResult
from app.agent.v3.config import BaseAgentConfig
from app.agent.tools.registry import get_enabled_tools, get_available_tools_summary
from app.agent.v3.pipeline.assemble import assemble
from app.agent.v3.prompts import build_generation_prompt
from app.agent.tools import get_tools_for_agent


def create_send_response_tool(min_messages: int, max_messages: int):
    """Create SendResponse tool with dynamic constraints."""
    class SendResponse(BaseModel):
        """Envia a resposta final ao usuário. Use quando tiver a resposta pronta."""
        messages: list[str] = Field(
            description=f"Lista de mensagens para enviar ({min_messages} a {max_messages} mensagens curtas)",
            min_length=min_messages,
            max_length=max_messages
        )
    return SendResponse


class CollectData(BaseModel):
    """
    Salva informações coletadas do usuário durante a conversa.
    Use sempre que o usuário fornecer dados relevantes (nome, orçamento, interesse, etc.).
    Pode ser chamado junto com SendResponse na mesma resposta.
    """
    field: str = Field(description="Nome do campo (ex: 'budget', 'name', 'interest', 'email', 'phone')")
    value: str = Field(description="Valor coletado do usuário")


# Constant for identifying the response tool
SEND_RESPONSE_TOOL_NAME = "SendResponse"
COLLECT_DATA_TOOL_NAME = "CollectData"


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
# GRAPH STATE
# =============================================================================

def react_messages_reducer(current: Sequence[BaseMessage], update: Sequence[BaseMessage]) -> Sequence[BaseMessage]:
    """Custom reducer: if update starts with SystemMessage, replace entirely. Otherwise append."""
    if update and len(update) > 0 and isinstance(update[0], SystemMessage):
        # Fresh turn - replace all messages
        return list(update)
    # Tool loop - append
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

    # ReAct messages (for tool loop) - custom reducer to reset on new turn
    react_messages: Annotated[Sequence[BaseMessage], react_messages_reducer]

    # Response messages (from SendResponse tool or fallback)
    response_messages: Optional[list[str]]

    # Validation tracking
    validation_attempts: int

    # ReAct loop iteration count
    react_iterations: int

    # Output
    final_response: Optional[str]
    messages: list[MessageWithTiming]
    escalation: Optional[dict]
    tokens_used: int
    tokens_in: int
    tokens_out: int
    tool_calls_made: list[dict]
    system_prompt: Optional[str]


# =============================================================================
# GRAPH NODES
# =============================================================================

def assemble_node(state: GraphState) -> dict:
    """Build RAG context from message + history.

    NOTE: This node resets react_messages to start fresh each turn.
    The operator.add reducer would otherwise accumulate from checkpoint.
    """
    print("-> [Node] Assemble")

    config = state["config"]
    agent_state = state["agent_state"]
    message = state["message"]

    # Clear any accumulated react_messages from previous turns
    # We'll set fresh messages below

    # Add user message to history BEFORE building search query
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

    # Add tool instructions if tools enabled
    if config.enabled_tool_categories:
        tools_summary = get_available_tools_summary(config.enabled_tool_categories)
        system_prompt += f"\n\n## Ferramentas Disponíveis\n{tools_summary}"

        # Add entity-specific tool instructions from capabilities
        if assembled.tool_context:
            system_prompt += f"\n\n## Instruções de Ferramentas (por entidade)\n{assembled.tool_context}"

    # Initialize ReAct messages
    print(f"  System prompt: {len(system_prompt)} chars (~{len(system_prompt)//4} tokens)")
    react_messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=message)
    ]

    return {
        "assembled": assembled,
        "react_messages": react_messages,
        "agent_state": agent_state,
        "system_prompt": system_prompt
    }


MAX_REACT_ITERATIONS = 3  # Max tool calls before forcing response


def agent_node(state: GraphState) -> dict:
    """ReAct agent - calls LLM with tools bound, including SendResponse."""
    print("-> [Node] Agent")

    config = state["config"]
    messages = state["react_messages"]
    iterations = state.get("react_iterations", 0)

    # Create SendResponse tool with config constraints
    SendResponse = create_send_response_tool(
        min_messages=config.multi_message.preferred_messages,
        max_messages=config.multi_message.max_messages
    )

    # Create LLM
    llm = get_chat_llm(
        model=config.generation.model,
        temperature=config.generation.temperature,
        max_tokens=config.generation.max_tokens,
    )

    # Check if data collection is enabled (has objectives from data_collection fields)
    collect_data_enabled = any(obj.id.startswith("collect_field_") for obj in config.objectives)

    # On max iterations, ONLY bind SendResponse to force a response
    if iterations >= MAX_REACT_ITERATIONS:
        print(f"  Max iterations ({MAX_REACT_ITERATIONS}) reached - forcing SendResponse")
        all_tools = [SendResponse]
        if collect_data_enabled:
            all_tools.append(CollectData)
    else:
        # Get action tools
        enabled_tool_names = get_enabled_tools(config.enabled_tool_categories)
        tools = get_tools_for_agent(enabled_tool_names)
        all_tools = tools + [SendResponse]
        if collect_data_enabled:
            all_tools.append(CollectData)

    print(f"  Bound tools: {[t.name if hasattr(t, 'name') else t.__name__ for t in all_tools]}")
    llm_with_tools = llm.bind_tools(all_tools, tool_choice="required")

    # Call LLM
    response = llm_with_tools.invoke(messages)
    print(f"  Tool calls: {len(response.tool_calls) if response.tool_calls else 0}")
    if response.tool_calls:
        print(f"  Tools: {[tc['name'] for tc in response.tool_calls]}")

    # Extract real token usage from response metadata
    metadata = response.response_metadata if hasattr(response, "response_metadata") else {}
    print(f"  Metadata keys: {list(metadata.keys())}")
    usage = metadata.get("usage", metadata.get("token_usage", {}))
    input_tokens = usage.get("prompt_tokens", usage.get("input_tokens", 0))
    output_tokens = usage.get("completion_tokens", usage.get("output_tokens", 0))
    turn_tokens = input_tokens + output_tokens
    print(f"  Tokens: {input_tokens} in + {output_tokens} out = {turn_tokens}")

    tokens_used = state.get("tokens_used", 0) + turn_tokens
    tokens_in = state.get("tokens_in", 0) + input_tokens
    tokens_out = state.get("tokens_out", 0) + output_tokens

    return {
        "react_messages": [response],
        "tokens_used": tokens_used,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "react_iterations": iterations + 1
    }


def tool_node(state: GraphState) -> dict:
    """Execute tools called by the agent."""
    print("-> [Node] Tools")

    config = state["config"]
    messages = state["react_messages"]
    last_message = messages[-1]

    if not hasattr(last_message, 'tool_calls') or not last_message.tool_calls:
        return {}

    # Get tools
    enabled_tool_names = get_enabled_tools(config.enabled_tool_categories)
    tools = get_tools_for_agent(enabled_tool_names)
    tool_map = {tool.name: tool for tool in tools}

    # Execute tools
    tool_messages = []
    tool_calls_made = state.get("tool_calls_made", [])

    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        print(f"  Executing: {tool_name}({tool_args})")

        tool = tool_map.get(tool_name)
        if tool:
            try:
                result = tool.invoke(tool_args)
                tool_messages.append(
                    ToolMessage(content=str(result), tool_call_id=tool_call["id"])
                )
                tool_calls_made.append({
                    "tool": tool_name,
                    "args": tool_args,
                    "result": str(result)[:500],
                    "success": True
                })
            except Exception as e:
                error_msg = f"Error: {str(e)}"
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
        "tool_calls_made": tool_calls_made
    }


def validate_node(state: GraphState) -> dict:
    """
    Validate response before sending to user.

    Checks:
    1. Does the response answer the question?
    2. Does it use the RAG context provided?

    If validation fails, injects correction message for ONE retry only.
    """
    print("-> [Node] Validate")

    messages = state["react_messages"]
    assembled = state.get("assembled")
    user_message = state["message"]
    attempts = state.get("validation_attempts", 0)

    # Only validate once (no infinite loops)
    if attempts >= 1:
        print("  Skipping validation (already retried)")
        return {"validation_attempts": attempts}

    # Get the response to validate
    response = ""
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and msg.content and not getattr(msg, 'tool_calls', None):
            response = msg.content
            break

    if not response:
        return {"validation_attempts": attempts}

    # Skip validation if no RAG context (nothing to validate against)
    if not assembled or not assembled.chunks:
        print("  Skipping validation (no RAG context)")
        return {"validation_attempts": attempts}

    # Build validation prompt
    config = state["config"]
    chunk_titles = [c.title for c in assembled.chunks if c.title]

    validation_prompt = f"""Valide esta resposta de atendimento:

Agente: {config.agent_name}
Descrição do agente: {config.agent_description or 'N/A'}
Pergunta do cliente: {user_message}
Contexto RAG disponível: {', '.join(chunk_titles[:5])}
Resposta gerada: {response[:500]}

Responda APENAS com JSON:
{{"ok": true}} se a resposta está adequada
{{"ok": false, "issue": "descrição curta do problema"}} se há problemas

Critérios:
1. Responde a pergunta diretamente?
2. Usa informações do contexto fornecido?
3. Não inventa dados? (Nome e descrição do agente são permitidos)"""

    try:
        # Use fast model for validation
        llm = get_chat_llm(
            model="google/gemini-2.0-flash-001",
            temperature=0.1,
            max_tokens=100
        )

        validation_response = llm.invoke([HumanMessage(content=validation_prompt)])
        validation_text = validation_response.content.strip()

        # Parse validation result
        import re
        json_match = re.search(r'\{[^}]+\}', validation_text)
        if json_match:
            result = json.loads(json_match.group())

            if not result.get("ok", True):
                issue = result.get("issue", "resposta inadequada")
                print(f"  Validation failed: {issue}")

                # Inject correction for retry (only once)
                correction = f"CORREÇÃO NECESSÁRIA: {issue}. Revise sua resposta para atender melhor à pergunta do cliente."
                return {
                    "react_messages": [HumanMessage(content=correction)],
                    "validation_attempts": attempts + 1
                }

        print("  Validation passed")

    except Exception as e:
        print(f"  Validation error (skipping): {e}")

    return {"validation_attempts": attempts}


def respond_node(state: GraphState) -> dict:
    """Extract messages from SendResponse and data from CollectData tool calls."""
    print("-> [Node] Respond")

    messages = state["react_messages"]
    agent_state = state["agent_state"]
    last_message = messages[-1]

    response_messages = []
    collected_updates = {}

    # Extract from tool calls
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        for tool_call in last_message.tool_calls:
            tool_name = tool_call.get("name")
            args = tool_call.get("args", {})

            if tool_name == SEND_RESPONSE_TOOL_NAME:
                response_messages = args.get("messages", [])
                print(f"  SendResponse: {len(response_messages)} messages")

            elif tool_name == COLLECT_DATA_TOOL_NAME:
                field = args.get("field", "")
                value = args.get("value", "")
                if field and value:
                    collected_updates[field] = value
                    agent_state.update_collected_data(field, value)
                    print(f"  CollectData: {field} = {value}")

    if not response_messages:
        response_messages = [last_message.content or "Desculpe, ocorreu um erro."]

    print(f"  Total messages: {len(response_messages)}, collected: {list(collected_updates.keys())}")

    return {
        "response_messages": response_messages,
        "final_response": "\n\n".join(response_messages),
        "agent_state": agent_state
    }


def respond_fallback_node(state: GraphState) -> dict:
    """Fallback when LLM responds with plain text instead of SendResponse tool."""
    print("-> [Node] Respond Fallback")

    config = state["config"]
    messages = state["react_messages"]

    # Get plain text from last AI message
    final_response = ""
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and msg.content:
            final_response = msg.content
            break

    if not final_response:
        final_response = "Desculpe, ocorreu um erro. Pode repetir?"

    # Parse into messages using existing logic
    response_messages = _parse_response(final_response, config.multi_message.max_messages)

    print(f"  Fallback messages: {len(response_messages)}")

    return {
        "response_messages": response_messages,
        "final_response": final_response
    }


def post_process_node(state: GraphState) -> dict:
    """Calculate timing for response messages and sync collected data to Contact."""
    print("-> [Node] Post-process")

    config = state["config"]
    agent_state = state["agent_state"]

    # Get response messages from respond/respond_fallback nodes
    response_messages = state.get("response_messages", [])
    final_response = state.get("final_response", "")

    if not response_messages:
        response_messages = ["Desculpe, ocorreu um erro. Pode repetir?"]
        final_response = response_messages[0]

    # Calculate typing times
    messages_with_timing = []
    for i, msg in enumerate(response_messages):
        typing_ms = min(
            config.multi_message.typing.base_ms + len(msg) * config.multi_message.typing.per_char_ms,
            config.multi_message.typing.max_delay_ms
        )
        pause_ms = config.multi_message.typing.between_messages_ms if i < len(response_messages) - 1 else 0

        messages_with_timing.append(
            MessageWithTiming(content=msg, typing_delay_ms=typing_ms, pause_after_ms=pause_ms)
        )

    # Update history with response
    for msg in response_messages:
        agent_state.add_to_history("assistant", msg)

    # Sync collected data to Contact if linked
    if agent_state.contact_id and agent_state.collected_data:
        try:
            _sync_contact_data(agent_state.contact_id, agent_state.collected_data)
            print(f"  Synced data to contact {agent_state.contact_id}: {list(agent_state.collected_data.keys())}")
        except Exception as e:
            print(f"  Failed to sync contact data: {e}")

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
            # Merge collected data into existing data
            if contact.data is None:
                contact.data = {}
            contact.data.update(collected_data)
            session.add(contact)
            session.commit()


def _parse_response(text: str, max_messages: int) -> list[str]:
    """Parse LLM response into message list."""
    # Try JSON parsing first
    try:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        parsed = json.loads(cleaned)
        if isinstance(parsed, dict) and "messages" in parsed:
            return parsed["messages"][:max_messages]
        elif isinstance(parsed, list):
            return [str(m) for m in parsed[:max_messages]]
    except (json.JSONDecodeError, KeyError):
        pass

    # Fallback: split by paragraphs
    if "\n\n" in text:
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        if 1 < len(paragraphs) <= max_messages:
            return paragraphs

    return [text]


# =============================================================================
# ROUTING
# =============================================================================

def should_continue_after_agent(state: GraphState) -> str:
    """Route based on whether agent wants to call tools or respond."""
    messages = state.get("react_messages", [])

    if not messages:
        return "respond_fallback"

    last_message = messages[-1]

    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        tool_names = [tc.get("name") for tc in last_message.tool_calls]

        # Check if it contains SendResponse or CollectData (both handled in respond node)
        has_send_response = SEND_RESPONSE_TOOL_NAME in tool_names
        has_collect_data = COLLECT_DATA_TOOL_NAME in tool_names

        # If ONLY internal tools (SendResponse/CollectData), go to respond
        internal_tools = {SEND_RESPONSE_TOOL_NAME, COLLECT_DATA_TOOL_NAME}
        if all(name in internal_tools for name in tool_names):
            return "respond"

        # If has SendResponse, go to respond (it can handle CollectData too)
        if has_send_response:
            return "respond"

        # Otherwise, execute the external tools
        return "tools"

    # No tool calls - fallback to wrapping plain text
    return "respond_fallback"


def should_continue_after_validate(state: GraphState) -> str:
    """Route based on validation result."""
    messages = state.get("react_messages", [])

    if not messages:
        return "post_process"

    last_message = messages[-1]

    # If validation injected a correction (HumanMessage), retry with agent
    if isinstance(last_message, HumanMessage) and "CORREÇÃO" in last_message.content:
        return "agent"

    # Otherwise, proceed to post_process
    return "post_process"


# =============================================================================
# GRAPH BUILDER
# =============================================================================

def build_graph() -> StateGraph:
    """
    Build the v3 pipeline graph.

    Flow: assemble → agent ⟷ tools → respond/respond_fallback → post_process

    The agent uses SendResponse tool to format final output.
    If it doesn't call SendResponse, respond_fallback parses plain text.
    """
    graph = StateGraph(GraphState)

    # Add nodes
    graph.add_node("assemble", assemble_node)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_node)
    graph.add_node("respond", respond_node)
    graph.add_node("respond_fallback", respond_fallback_node)
    graph.add_node("post_process", post_process_node)

    # Set entry point
    graph.set_entry_point("assemble")

    # Assemble → Agent
    graph.add_edge("assemble", "agent")

    # Agent → Tools, Respond, or Respond Fallback
    graph.add_conditional_edges(
        "agent",
        should_continue_after_agent,
        {
            "tools": "tools",
            "respond": "respond",
            "respond_fallback": "respond_fallback"
        }
    )

    # Tools → Agent (loop back)
    graph.add_edge("tools", "agent")

    # Respond → Post-process
    graph.add_edge("respond", "post_process")

    # Respond Fallback → Post-process
    graph.add_edge("respond_fallback", "post_process")

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

    # Set contact_id for data sync (can be updated on each turn)
    if contact_id is not None:
        agent_state.contact_id = contact_id

    input_state: GraphState = {
        "message": message,
        "config": config,
        "agent_state": agent_state,
        "assembled": None,
        "react_messages": [],  # Always start fresh - don't accumulate from checkpoint
        "response_messages": None,
        "validation_attempts": 0,
        "react_iterations": 0,
        "final_response": None,
        "messages": [],
        "escalation": None,
        "tokens_used": 0,
        "tokens_in": 0,
        "tokens_out": 0,
        "tool_calls_made": [],
        "system_prompt": None
    }

    # Run graph
    result = graph.invoke(input_state, config=config_dict)

    # Build response
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
            "history_length": len(result["agent_state"].history)
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
                    "history_length": len(agent_state.history)
                }
    except Exception as e:
        print(f"Error getting state: {e}")

    return None
