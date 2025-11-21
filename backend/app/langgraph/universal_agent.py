"""
Universal Agent System - LangGraph + Mem0
Replaces Temporal workflows with dynamic LangGraph graphs generated from DB config.

Each agent in the database gets its own compiled graph with:
- Dynamic state schema from response_schema
- Memory integration (Mem0)
- Knowledge search (RAG)
- Custom validation rules
- Multi-turn response splitting
"""

from typing import TypedDict, Optional, List, Annotated, Dict, Any, Type
from langgraph.graph import StateGraph, END
import operator
import os
from datetime import datetime

from openai import OpenAI
from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.core.memory import get_memory
from app.models.agent import Agent
from app.models import ConversationLog
from app.agents.utils import split_response
from app.agents.memory import should_save_memory
from app.agents.utils.behavior_engines import apply_gating_rules, validate_response
from app.agents.config import OptimizationConfig

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Global cache for compiled graphs
_agent_graphs: Dict[int, StateGraph] = {}


def generate_state_class(agent_id: int, response_schema: dict) -> Type[TypedDict]:
    """
    Dynamically generate a TypedDict state class from agent's response_schema.

    Args:
        agent_id: Agent identifier for unique class name
        response_schema: Dict like {"budget_range": ["unknown", "low", "high"], ...}

    Returns:
        TypedDict class for LangGraph state
    """
    # Base fields that all agents have
    base_fields = {
        "messages": Annotated[List[dict], operator.add],
        "customer_id": str,
        "agent_id": int,
        "turn_count": int,
        "conversation_ended": bool,
        # Processing fields
        "memory_context": Optional[str],
        "excluded_tags": Optional[List[str]],
        "rag_context": Optional[str],
        "response": Optional[str],
        "validation_passed": Optional[bool],
        "validation_message": Optional[str],
        # Memory metadata
        "memory_worthy": bool,
        "sentiment": Optional[str],
        "urgency": Optional[str],
        "requires_handoff": bool,
        "memory_saved": bool,
        "save_reason": Optional[str],
        # Config
        "multi_turn_config": Optional[dict],
        "optimization_config": Optional[dict],
        "response_schema": Optional[dict],
        # Token usage
        "tokens_used": Optional[dict],
    }

    # Add custom fields from response_schema
    if response_schema:
        for field_name in response_schema.keys():
            base_fields[field_name] = Optional[str]

    # Create TypedDict class using TypedDict constructor (not type())
    state_class = TypedDict(
        f"Agent{agent_id}State",
        base_fields
    )

    return state_class


# ============================================================
# LANGGRAPH NODES
# ============================================================

def create_extract_state_node(agent_config: dict):
    """Create extract state node with agent-specific schema."""
    def extract_state_node(state: dict) -> dict:
        """Extract structured fields from latest message using OpenAI structured outputs."""
        print("→ Extract State Node")

        # TODO: Implement OpenAI structured outputs extraction
        # For now, pass through with defaults
        updates = {}

        response_schema = agent_config.get("response_schema", {})
        for field_name, possible_values in response_schema.items():
            if field_name not in state or state[field_name] is None:
                # Default to first value (usually "unknown")
                updates[field_name] = possible_values[0] if possible_values else "unknown"

        return updates

    return extract_state_node


def create_retrieve_memories_node():
    """Create memory retrieval node."""
    def retrieve_memories_node(state: dict) -> dict:
        """Retrieve relevant memories from Mem0."""
        print("→ Retrieve Memories Node")

        memory = get_memory()
        customer_id = state.get("customer_id")
        messages = state.get("messages", [])

        if not customer_id or not messages:
            return {"memory_context": ""}

        # Get latest user message
        user_message = messages[-1].get("content", "") if messages else ""

        try:
            # Search Mem0
            search_result = memory.search(
                query=user_message,
                user_id=customer_id,
                limit=5
            )

            # Format memories as context
            memory_context = ""
            results = search_result.get('results', [])
            if results:
                memory_context = "Previous knowledge about this customer:\n"
                for i, result in enumerate(results, 1):
                    mem_text = result.get("memory", "")
                    if mem_text:
                        memory_context += f"- {mem_text}\n"
                        print(f"    Memory {i}: {mem_text[:80]}...")

            print(f"  Retrieved {len(results)} memories")
            return {"memory_context": memory_context}

        except Exception as e:
            print(f"  ✗ Memory retrieval error: {e}")
            return {"memory_context": ""}

    return retrieve_memories_node


def create_apply_gating_node(gating_rules: list):
    """Create gating node with agent-specific rules."""
    def apply_gating_node(state: dict) -> dict:
        """Apply gating rules based on current state."""
        print("→ Apply Gating Node")

        excluded_tags = []

        if not gating_rules:
            return {"excluded_tags": excluded_tags}

        # Check each gating rule
        for rule in gating_rules:
            field_name = rule.get("if_field")
            expected_value = rule.get("equals")
            tags_to_exclude = rule.get("exclude_tags", [])

            # Check if condition is met
            if field_name in state and state.get(field_name) == expected_value:
                excluded_tags.extend(tags_to_exclude)
                print(f"  ✓ Gating: {field_name}={expected_value} → excluding {tags_to_exclude}")

        return {"excluded_tags": list(set(excluded_tags))}  # Remove duplicates

    return apply_gating_node


def create_rag_search_node():
    """Create RAG search node."""
    def rag_search_node(state: dict) -> dict:
        """Search knowledge base with filtered tags."""
        print("→ RAG Search Node")

        excluded_tags = state.get("excluded_tags", [])
        messages = state.get("messages", [])

        if messages:
            user_message = messages[-1].get("content", "")
            print(f"  Searching for: {user_message[:50]}...")
            print(f"  Excluded tags: {excluded_tags}")

        # TODO: Implement actual RAG search with agent's knowledge blocks
        # For now, mock
        return {"rag_context": "Mock RAG context"}

    return rag_search_node


def create_generate_response_node(agent_config: dict):
    """Create response generation node with agent-specific instructions."""
    def generate_response_node(state: dict) -> dict:
        """Generate response using LLM with memory, RAG, and state."""
        print("→ Generate Response Node")

        # Get context
        messages = state.get("messages", [])
        memory_context = state.get("memory_context", "")
        rag_context = state.get("rag_context", "")

        if not messages:
            return {"response": "Olá! Como posso ajudar?"}

        # Get latest user message
        user_message = messages[-1].get("content", "")

        # Build system prompt
        base_instructions = agent_config.get("base_instructions", "")
        system_prompt = f"""{base_instructions}

{memory_context}

{rag_context}

IMPORTANTE: Responda de forma natural e variada. Seja prestativo e profissional."""

        # Call OpenAI
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=300
            )

            assistant_response = response.choices[0].message.content

            # Get token usage
            usage = response.usage
            tokens_used = {
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
                "total_tokens": usage.total_tokens
            }

            print(f"  Generated: {assistant_response[:100]}...")
            print(f"  Tokens: {tokens_used['total_tokens']} (prompt: {tokens_used['prompt_tokens']}, completion: {tokens_used['completion_tokens']})")

            # TODO: Extract structured fields (memory_worthy, sentiment, urgency, requires_handoff)
            # For now, use defaults
            return {
                "response": assistant_response,
                "memory_worthy": True,  # Default to saving
                "sentiment": "neutral",
                "urgency": "normal",
                "requires_handoff": False,
                "tokens_used": tokens_used,
            }

        except Exception as e:
            print(f"  ✗ OpenAI error: {e}")
            return {
                "response": "Desculpe, ocorreu um erro. Pode repetir?",
                "memory_worthy": False,
                "sentiment": "neutral",
                "urgency": "normal",
                "requires_handoff": False,
            }

    return generate_response_node


def create_execute_actions_node():
    """Create actions execution node."""
    def execute_actions_node(state: dict) -> dict:
        """Execute tools/actions based on OpenAI function calling."""
        print("→ Execute Actions Node")

        # TODO: Implement tool execution
        # For now, no actions
        return {}

    return execute_actions_node


def create_validate_node(validation_rules: list):
    """Create validation node with agent-specific rules."""
    def validate_node(state: dict) -> dict:
        """Validate response against validation rules."""
        print("→ Validation Node")

        response = state.get("response", "")

        if not validation_rules:
            print("  ✓ No validation rules")
            return {"validation_passed": True}

        # Use existing validation engine
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


def create_save_memory_node():
    """Create memory save node with trigger logic."""
    def save_memory_node(state: dict) -> dict:
        """Conditionally save conversation to Mem0 based on triggers."""
        print("→ Save Memory Node")

        customer_id = state.get("customer_id")
        messages = state.get("messages", [])
        optimization_config = state.get("optimization_config", {})

        if not customer_id or not messages:
            return {"memory_saved": False, "save_reason": "no_customer_or_messages"}

        # Create config object
        config = OptimizationConfig.from_dict(optimization_config) if optimization_config else OptimizationConfig()

        # Check if we should save
        should_save, reason = should_save_memory(
            customer_id=customer_id,
            turn_count=state.get("turn_count", 1),
            memory_worthy=state.get("memory_worthy", False),
            conversation_ended=state.get("conversation_ended", False),
            config=config
        )

        if should_save:
            try:
                memory = get_memory()

                # Format conversation
                conversation_messages = [
                    {"role": msg.get("role", "user"), "content": msg.get("content", "")}
                    for msg in messages[-2:]  # Last 2 messages (user + assistant)
                ]

                # Save to Mem0
                memory.add(
                    messages="\n".join([
                        f"{m['role'].title()}: {m['content']}"
                        for m in conversation_messages
                    ]),
                    user_id=customer_id,
                    metadata={
                        "sentiment": state.get("sentiment"),
                        "urgency": state.get("urgency"),
                        "requires_handoff": state.get("requires_handoff", False),
                    }
                )

                print(f"  ✓ Memory saved: {reason}")
                return {"memory_saved": True, "save_reason": reason}

            except Exception as e:
                print(f"  ✗ Memory save error: {e}")
                return {"memory_saved": False, "save_reason": f"error: {e}"}

        print(f"  ⊘ Memory not saved: {reason}")
        return {"memory_saved": False, "save_reason": reason}

    return save_memory_node


def split_response_from_state(state: dict) -> list[str]:
    """
    Split response based on multi_turn_config in state.
    Returns array of messages for natural conversation flow.
    """
    response = state.get("response", "")
    if not response:
        return []

    multi_turn_config = state.get("multi_turn_config") or {}

    # If multi-turn disabled, return single message
    if not multi_turn_config.get("enabled", False):
        return [response]

    # Split response using configured settings
    return split_response(
        response=response,
        max_splits=multi_turn_config.get("max_splits", 4),
        style=multi_turn_config.get("style", "medium")
    )


# ============================================================
# GRAPH FACTORY
# ============================================================

def create_agent_graph(agent_id: int) -> StateGraph:
    """
    Create a compiled LangGraph for a specific agent.
    Loads config from database and generates dynamic state + nodes.

    Args:
        agent_id: Agent ID from database

    Returns:
        Compiled StateGraph ready for invocation
    """
    print(f"\n{'='*60}")
    print(f"Creating LangGraph for Agent {agent_id}")
    print(f"{'='*60}")

    # Load agent config from DB
    with Session(engine) as session:
        agent = session.get(Agent, agent_id)

        if not agent:
            raise ValueError(f"Agent {agent_id} not found in database")

        agent_config = {
            "response_schema": agent.response_schema or {},
            "multi_turn_config": agent.multi_turn_config or {"enabled": False},
            "media_rules": agent.media_rules or {},
            "gating_rules": agent.gating_rules or [],
            "validation_rules": agent.validation_rules or [],
            "base_instructions": agent.description or "",
            "tools": agent.tools or [],
        }

    print(f"Loaded config:")
    print(f"  - Response schema: {len(agent_config['response_schema'])} fields")
    print(f"  - Gating rules: {len(agent_config['gating_rules'])}")
    print(f"  - Validation rules: {len(agent_config['validation_rules'])}")
    print(f"  - Multi-turn: {agent_config['multi_turn_config'].get('enabled', False)}")

    # Generate dynamic state class
    state_class = generate_state_class(agent_id, agent_config["response_schema"])

    # Create StateGraph
    graph = StateGraph(state_class)

    # Add nodes
    graph.add_node("extract_state", create_extract_state_node(agent_config))
    graph.add_node("retrieve_memories", create_retrieve_memories_node())
    graph.add_node("apply_gating", create_apply_gating_node(agent_config["gating_rules"]))
    graph.add_node("rag_search", create_rag_search_node())
    graph.add_node("generate_response", create_generate_response_node(agent_config))
    graph.add_node("execute_actions", create_execute_actions_node())
    graph.add_node("validate", create_validate_node(agent_config["validation_rules"]))
    graph.add_node("save_memory", create_save_memory_node())

    # Add edges (fixed pipeline)
    graph.set_entry_point("extract_state")
    graph.add_edge("extract_state", "retrieve_memories")
    graph.add_edge("retrieve_memories", "apply_gating")
    graph.add_edge("apply_gating", "rag_search")
    graph.add_edge("rag_search", "generate_response")
    graph.add_edge("generate_response", "execute_actions")
    graph.add_edge("execute_actions", "validate")
    graph.add_edge("validate", "save_memory")
    graph.add_edge("save_memory", END)

    # Compile graph
    compiled = graph.compile()

    print(f"✓ Graph compiled successfully\n")

    return compiled


def get_or_create_agent_graph(agent_id: int, force_rebuild: bool = False) -> StateGraph:
    """
    Get cached graph or create new one.
    Caches graphs in memory for performance.

    Args:
        agent_id: Agent ID
        force_rebuild: Force rebuild even if cached

    Returns:
        Compiled StateGraph
    """
    if force_rebuild or agent_id not in _agent_graphs:
        _agent_graphs[agent_id] = create_agent_graph(agent_id)

    return _agent_graphs[agent_id]


def clear_agent_graph_cache(agent_id: Optional[int] = None):
    """
    Clear cached graphs.
    Call when agent config changes in DB.

    Args:
        agent_id: Specific agent to clear, or None for all
    """
    global _agent_graphs

    if agent_id is None:
        _agent_graphs = {}
        print("Cleared all agent graph cache")
    elif agent_id in _agent_graphs:
        del _agent_graphs[agent_id]
        print(f"Cleared cache for agent {agent_id}")
