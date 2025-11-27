"""
v3 LangGraph Integration - Clean Architecture.

Flow: assemble → agent ⟷ tools → extract_data → generate → post_process

Key principles:
- Tools are for OPTIONAL actions (search, escalate)
- Nodes are for GUARANTEED steps (extract, generate, post_process)
- Response generation is ALWAYS a dedicated node, not a tool
- Data extraction uses structured output, not tool calls
"""

import os
import json
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

    # ReAct messages (for tool loop)
    react_messages: Annotated[Sequence[BaseMessage], react_messages_reducer]

    # Response (from generate node)
    response_messages: Optional[list[str]]

    # Tool tracking
    react_iterations: int
    tool_calls_made: list[dict]

    # Output
    final_response: Optional[str]
    messages: list[MessageWithTiming]
    escalation: Optional[dict]
    tokens_used: int
    tokens_in: int
    tokens_out: int
    system_prompt: Optional[str]


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

    # Add tool instructions if tools enabled
    if config.enabled_tool_categories:
        tools_summary = get_available_tools_summary(config.enabled_tool_categories)
        system_prompt += f"\n\n## Ferramentas Disponíveis\n{tools_summary}"

        if assembled.tool_context:
            system_prompt += f"\n\n## Instruções de Ferramentas\n{assembled.tool_context}"

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
    """Execute tools called by the agent."""
    print("-> [Node] Tools")

    config = state["config"]
    messages = state["react_messages"]
    last_message = messages[-1]

    if not hasattr(last_message, 'tool_calls') or not last_message.tool_calls:
        return {}

    enabled_tool_names = get_enabled_tools(config.enabled_tool_categories)
    tools = get_tools_for_agent(enabled_tool_names)
    tool_map = {tool.name: tool for tool in tools}

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

    extraction_prompt = f"""Analyze this conversation and extract any data the user provided.

Conversation:
{conversation_text}

Fields to extract:
{json.dumps(collection_fields, ensure_ascii=False, indent=2)}

Return extracted data as key-value pairs. Only include fields where the user clearly provided information.
If no relevant data was provided, return empty dict."""

    try:
        # Use fast model for extraction
        llm = get_chat_llm(
            model="google/gemini-2.0-flash-001",
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

def generate_node(state: GraphState) -> dict:
    """Generate response using structured output. ALWAYS produces a response."""
    print("-> [Node] Generate")

    config = state["config"]
    messages = state["react_messages"]

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

    return {
        "response_messages": response_messages,
        "final_response": "\n\n".join(response_messages),
        "tokens_used": tokens_used,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out
    }


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

    # Update history
    for msg in response_messages:
        agent_state.add_to_history("assistant", msg)

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

    Flow: assemble → agent ⟷ tools → extract_data → generate → post_process

    - agent: Handles tool calls (search, escalate, etc.)
    - extract_data: Extracts structured data from conversation (if configured)
    - generate: ALWAYS produces a response (guaranteed)
    """
    graph = StateGraph(GraphState)

    # Add nodes
    graph.add_node("assemble", assemble_node)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tools_node)
    graph.add_node("extract_data", extract_data_node)
    graph.add_node("generate", generate_node)
    graph.add_node("post_process", post_process_node)

    # Set entry point
    graph.set_entry_point("assemble")

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

    # Generate → Post-process (always)
    graph.add_edge("generate", "post_process")

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
        "react_messages": [],
        "response_messages": None,
        "react_iterations": 0,
        "tool_calls_made": [],
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
