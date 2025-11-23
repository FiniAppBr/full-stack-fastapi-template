"""
Context System v2 Graph - LangGraph implementation of the 6-stage pipeline.

Pipeline stages:
1. EXTRACT - Detect signals/traits from message, derive gates/mode
2. ASSEMBLE - Select content chunks based on rules + RAG
3. GENERATE - Create response with LLM using mode instructions
4. VALIDATE - Check response against rules
5. EXECUTE - Run any tools
6. FORMAT - Split into multi-turn messages

This graph uses:
- Python config files (e.g., nina_v2.py) for agent configuration
- PostgresSaver for state persistence across sessions
- RuntimeState for 2x2 state model (gates, traits, mode, signals)
"""

from typing import TypedDict, Annotated, Optional, Any
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

from .checkpointer import get_checkpointer
from .schema import RuntimeState, ChunkMatch
from .pipeline import (
    extract, assemble, AssembleResult, format_context,
    generate, GenerateResult, validate, split_response_messages,
    AgentConfig
)
from .configs import (
    NINA_CONFIG, AGENT_NAME, AGENT_DESCRIPTION,
    PERSONALITY, VALIDATION_RULES, MODES
)


class GraphState(TypedDict):
    """
    LangGraph state schema for v2 pipeline.

    Combines:
    - messages: Conversation history (LangGraph managed)
    - runtime: V2 RuntimeState (gates, traits, mode, signals)
    - context_chunks: Assembled chunks (for generate stage)
    - response: Generated response (after generate stage)
    - response_messages: Split messages (after format stage)
    """
    # Conversation history - uses add_messages reducer for proper merging
    messages: Annotated[list, add_messages]

    # V2 runtime state - replaced entirely each turn
    runtime: dict  # RuntimeState as dict for serialization

    # Pipeline outputs
    context_chunks: list[dict]  # ChunkMatch as dicts for serialization
    response: str
    response_messages: list[str]

    # Metadata
    agent_config_name: str  # Which config to use (e.g., "nina")


# Config registry - maps names to configs
_CONFIG_REGISTRY: dict[str, AgentConfig] = {}


def register_config(name: str, config: AgentConfig):
    """Register an agent config by name."""
    _CONFIG_REGISTRY[name] = config


def get_config(name: str) -> AgentConfig:
    """Get config by name."""
    if name not in _CONFIG_REGISTRY:
        raise ValueError(f"Config '{name}' not registered. Available: {list(_CONFIG_REGISTRY.keys())}")
    return _CONFIG_REGISTRY[name]


# Register Nina config (imported at top)
register_config("nina", NINA_CONFIG)


def _create_extract_node():
    """Create the extraction node using v2 pipeline."""

    def extract_node(state: GraphState) -> dict:
        """
        Extract signals/traits from last message, derive gates/mode.

        Input: messages, runtime
        Output: updated runtime
        """
        print("\n-> Extract (v2)")

        messages = state.get("messages", [])
        if not messages:
            return {}

        # Get config
        config_name = state.get("agent_config_name", "nina")
        config = get_config(config_name)

        # Get current runtime state
        runtime_dict = state.get("runtime", {})
        runtime = RuntimeState(**runtime_dict) if runtime_dict else RuntimeState(
            gates={g.id: False for g in config.gates},
            traits={t.id: None for t in config.traits},
            mode="conexao",
            signals={},
            turn_count=0
        )

        # Get last user message
        last_message = ""
        for msg in reversed(messages):
            if hasattr(msg, 'type') and msg.type == "human":
                last_message = msg.content
                break
            elif isinstance(msg, dict) and msg.get("role") == "user":
                last_message = msg.get("content", "")
                break

        if not last_message:
            print("  No user message found")
            return {}

        # Build history for context (last 5 turns = 10 messages)
        history = []
        for msg in messages[-10:]:
            if hasattr(msg, 'type'):
                role = "user" if msg.type == "human" else "assistant"
                history.append({"role": role, "content": msg.content})
            elif isinstance(msg, dict):
                history.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

        # Run extraction
        result = extract(config, runtime, last_message, history=history[:-1] if history else None)

        # Apply updates to runtime
        new_runtime = RuntimeState(
            gates={**runtime.gates, **result.gate_updates},
            traits={**runtime.traits, **{k: v for k, v in result.trait_updates.items() if v}},
            mode=result.mode_shift or runtime.mode,
            signals=result.signals,
            last_message=last_message,
            turn_count=runtime.turn_count + 1
        )

        print(f"  Mode: {new_runtime.mode}")
        print(f"  Gates: {[k for k, v in new_runtime.gates.items() if v]}")
        print(f"  Traits: {[k for k, v in new_runtime.traits.items() if v]}")

        return {"runtime": new_runtime.model_dump()}

    return extract_node


def _create_placeholder_node(name: str):
    """Create placeholder node for stages not yet implemented."""

    def placeholder_node(state: GraphState) -> dict:
        print(f"\n-> {name} (placeholder)")
        return {}

    return placeholder_node


def _create_assemble_node():
    """Create the assembly node using v2 pipeline."""

    def assemble_node(state: GraphState) -> dict:
        """
        Assemble context chunks based on rules and state.

        Input: runtime, messages
        Output: context_chunks (serialized ChunkMatch list)
        """
        print("\n-> Assemble (v2)")

        messages = state.get("messages", [])
        if not messages:
            return {"context_chunks": []}

        # Get config
        config_name = state.get("agent_config_name", "nina")
        config = get_config(config_name)

        # Get runtime state
        runtime_dict = state.get("runtime", {})
        runtime = RuntimeState(**runtime_dict) if runtime_dict else RuntimeState()

        # Get last user message for search queries
        last_message = ""
        for msg in reversed(messages):
            if hasattr(msg, 'type') and msg.type == "human":
                last_message = msg.content
                break
            elif isinstance(msg, dict) and msg.get("role") == "user":
                last_message = msg.get("content", "")
                break

        # Run assembly
        result = assemble(
            config=config,
            state=runtime,
            last_message=last_message,
            token_budget=2000,
            agent_id="nina"
        )

        # Serialize chunks for state storage
        chunks_data = [
            {
                "chunk": {
                    "id": cm.chunk.id,
                    "labels": cm.chunk.labels,
                    "title": cm.chunk.title,
                    "content": cm.chunk.content,
                    "trait_filter": cm.chunk.trait_filter,
                    "token_count": cm.chunk.token_count,
                },
                "score": cm.score,
                "source_rule": cm.source_rule,
            }
            for cm in result.chunks
        ]

        print(f"  Chunks: {len(chunks_data)}, Tokens: {result.token_count}")

        return {"context_chunks": chunks_data}

    return assemble_node


def _create_generate_node():
    """Create generate node using v2 pipeline with mode instructions."""

    def generate_node(state: GraphState) -> dict:
        """
        Generate response using LLM with mode instructions and assembled context.

        Input: runtime, context_chunks, messages
        Output: response
        """
        print("\n-> Generate (v2)")

        # Get runtime state
        runtime_dict = state.get("runtime", {})
        runtime = RuntimeState(**runtime_dict) if runtime_dict else RuntimeState()

        # Get current mode object
        current_mode = None
        for mode in MODES:
            if mode.id == runtime.mode:
                current_mode = mode
                break

        # Deserialize chunks back to ChunkMatch objects
        from .schema import Chunk
        chunks_data = state.get("context_chunks", [])
        context_chunks = []
        for cd in chunks_data:
            chunk = Chunk(
                id=cd["chunk"]["id"],
                labels=cd["chunk"]["labels"],
                title=cd["chunk"]["title"],
                content=cd["chunk"]["content"],
                trait_filter=cd["chunk"]["trait_filter"],
                token_count=cd["chunk"]["token_count"],
            )
            context_chunks.append(ChunkMatch(
                chunk=chunk,
                score=cd["score"],
                source_rule=cd.get("source_rule")
            ))

        # Build conversation history for LLM
        messages = state.get("messages", [])
        history = []
        for msg in messages[-10:]:  # Last 5 turns
            if hasattr(msg, 'type'):
                role = "user" if msg.type == "human" else "assistant"
                history.append({"role": role, "content": msg.content})
            elif isinstance(msg, dict):
                history.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

        # Call generate
        result = generate(
            state=runtime,
            context_chunks=context_chunks,
            messages=history,
            agent_name=AGENT_NAME,
            agent_description=AGENT_DESCRIPTION,
            personality=PERSONALITY,
            mode=current_mode,
            validation_rules=VALIDATION_RULES,
            model="gpt-4o-mini",
            temperature=0.7
        )

        print(f"  Mode: {runtime.mode}")
        print(f"  Response: {result.response[:100]}..." if len(result.response) > 100 else f"  Response: {result.response}")

        # Return response AND add assistant message to history (add_messages reducer will merge)
        return {
            "response": result.response,
            "messages": [{"role": "assistant", "content": result.response}]
        }

    return generate_node


def _create_format_node():
    """Create format node that splits response into multiple messages."""

    def format_node(state: GraphState) -> dict:
        """
        Split response into multiple messages for natural chat flow.

        Input: response
        Output: response_messages (list of strings)
        """
        print("\n-> Format (v2)")

        response = state.get("response", "")
        if not response:
            return {"response_messages": []}

        # Split into multiple messages (max 2, short style per Nina config)
        messages = split_response_messages(
            response=response,
            max_splits=2,
            style="short"
        )

        print(f"  Split into {len(messages)} message(s)")

        return {"response_messages": messages}

    return format_node


def create_v2_graph(config_name: str = "nina") -> StateGraph:
    """
    Create a compiled v2 LangGraph.

    Args:
        config_name: Name of registered config (default: "nina")

    Returns:
        Compiled StateGraph with PostgresSaver checkpointer
    """
    print(f"\n{'='*60}")
    print(f"Creating v2 Graph (config: {config_name})")
    print(f"{'='*60}")

    # Verify config exists
    config = get_config(config_name)
    print(f"Config loaded:")
    print(f"  - Signals: {len(config.signals)}")
    print(f"  - Traits: {len(config.traits)}")
    print(f"  - Gates: {len(config.gates)}")
    print(f"  - Modes: {len(config.modes)}")
    print(f"  - Rules: {len(config.rules)}")

    # Create graph
    graph = StateGraph(GraphState)

    # Add nodes (v2 pipeline stages)
    graph.add_node("extract", _create_extract_node())
    graph.add_node("assemble", _create_assemble_node())
    graph.add_node("generate", _create_generate_node())
    graph.add_node("validate", _create_placeholder_node("Validate"))
    graph.add_node("execute", _create_placeholder_node("Execute"))
    graph.add_node("format", _create_format_node())

    # Add edges (linear flow for now)
    graph.set_entry_point("extract")
    graph.add_edge("extract", "assemble")
    graph.add_edge("assemble", "generate")
    graph.add_edge("generate", "validate")
    graph.add_edge("validate", "execute")
    graph.add_edge("execute", "format")
    graph.add_edge("format", END)

    # Compile with checkpointer for persistence
    checkpointer = get_checkpointer()
    compiled = graph.compile(checkpointer=checkpointer)

    print("Graph compiled with PostgresSaver checkpointer\n")

    return compiled


# Cache for compiled graphs
_v2_graphs: dict[str, StateGraph] = {}


def get_v2_graph(config_name: str = "nina", force_rebuild: bool = False) -> StateGraph:
    """
    Get cached v2 graph or create new one.

    Args:
        config_name: Config name
        force_rebuild: Force rebuild even if cached

    Returns:
        Compiled StateGraph
    """
    if force_rebuild or config_name not in _v2_graphs:
        _v2_graphs[config_name] = create_v2_graph(config_name)

    return _v2_graphs[config_name]
