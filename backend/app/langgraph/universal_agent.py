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
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg_pool import ConnectionPool
import operator
import os
import json
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

# Initialize PostgreSQL connection pool for checkpointer
_connection_pool = None
_checkpointer = None
_checkpointer_ready = False

def _init_checkpointer_at_startup() -> None:
    """
    Initialize checkpointer tables at module load.
    Must run BEFORE any database transactions are opened.
    CREATE INDEX CONCURRENTLY waits for all transactions to complete.
    """
    global _connection_pool, _checkpointer, _checkpointer_ready

    if _checkpointer_ready:
        return

    import psycopg
    from psycopg.rows import dict_row
    from langgraph.checkpoint.postgres.base import MIGRATIONS

    connection_string = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"

    print("Initializing checkpointer tables...")

    with psycopg.connect(connection_string, autocommit=True, row_factory=dict_row) as conn:
        # Run first migration to create migrations table
        conn.execute(MIGRATIONS[0])

        # Check current version
        result = conn.execute("SELECT v FROM checkpoint_migrations ORDER BY v DESC LIMIT 1")
        row = result.fetchone()
        version = row["v"] if row else -1

        print(f"  Current checkpoint migration version: {version}")

        # Run pending migrations
        for v in range(version + 1, len(MIGRATIONS)):
            migration = MIGRATIONS[v]
            print(f"  Running migration {v}: {migration[:60]}...")
            conn.execute(migration)
            conn.execute(f"INSERT INTO checkpoint_migrations (v) VALUES ({v})")

        if version < len(MIGRATIONS) - 1:
            print(f"  Migrations complete (now at version {len(MIGRATIONS) - 1})")
        else:
            print(f"  Tables already at version {version}")

    # Create the pool for actual use
    _connection_pool = ConnectionPool(
        conninfo=connection_string,
        min_size=1,
        max_size=10,
        open=True
    )
    _checkpointer = PostgresSaver(conn=_connection_pool)
    _checkpointer_ready = True
    print("✓ Checkpointer initialized")


# Initialize at module load (before any requests)
try:
    _init_checkpointer_at_startup()
except Exception as e:
    print(f"WARNING: Checkpointer init failed: {e}")
    # Continue without checkpointer - graph will fail at runtime


def get_checkpointer() -> PostgresSaver:
    """Get the PostgreSQL checkpointer (initialized at startup)."""
    if not _checkpointer_ready or _checkpointer is None:
        raise RuntimeError("Checkpointer not initialized. Check startup logs.")
    return _checkpointer

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
        """Extract structured fields from LAST MESSAGE only, merge with previous state."""
        print("→ Extract State Node")

        response_schema = agent_config.get("response_schema", {})
        if not response_schema:
            print("  No response_schema defined, skipping extraction")
            return {}

        messages = state.get("messages", [])
        if not messages:
            return {}

        # Get ONLY last user message - checkpointer handles history
        last_message = messages[-1].get("content", "") if messages else ""

        # Get previous state values (from checkpointer)
        previous_state = {
            field: state.get(field)
            for field in response_schema.keys()
            if state.get(field) is not None
        }

        # Build JSON schema dynamically from response_schema
        properties = {}
        for field_name, possible_values in response_schema.items():
            if isinstance(possible_values, list) and len(possible_values) > 0:
                properties[field_name] = {
                    "type": "string",
                    "enum": possible_values,
                    "description": f"One of: {', '.join(possible_values)}"
                }

        if not properties:
            return {}

        # Build extraction prompt
        field_descriptions = {
            "budget_range": "Customer's budget: unknown (not mentioned), under_5k (< R$5.000), 5k_to_20k (R$5.000-R$20.000), 20k_plus (> R$20.000)",
            "lead_quality": "Lead temperature: browser (just looking), warm (showing interest), hot (ready to buy)",
            "contact_captured": "Contact info: none, email_only, phone_only, or both",
            "catalogue_requested": "Did customer explicitly ask for catalogue/catalog?",
            "competitor_mentioned": "Did customer mention competitor stores/brands?",
            "consultation_interest": "Interest in home consultation: yes, no, or not_offered yet"
        }

        schema_description = "\n".join([
            f"- {field}: {field_descriptions.get(field, 'Extract from conversation')}"
            for field in properties.keys()
        ])

        # Show previous state in prompt so LLM knows what's already captured
        previous_state_str = json.dumps(previous_state, indent=2) if previous_state else "No previous state"

        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": f"""Extract customer information from this message.

Fields to extract:
{schema_description}

CURRENT STATE (from previous messages):
{previous_state_str}

Rules:
- Extract NEW information from this message only
- If this message updates a field (e.g., new budget), use the new value
- If a field is not mentioned, keep the current state value
- This message overrides previous values if it contains new info

Return JSON with ALL fields."""
                    },
                    {
                        "role": "user",
                        "content": f"Customer message: {last_message}"
                    }
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "customer_state",
                        "strict": True,
                        "schema": {
                            "type": "object",
                            "properties": properties,
                            "required": list(properties.keys()),
                            "additionalProperties": False
                        }
                    }
                },
                temperature=0.1
            )

            extracted = json.loads(response.choices[0].message.content)

            # Log extraction
            usage = response.usage
            print(f"  Extracted: {extracted}")
            print(f"  Tokens: {usage.total_tokens} (prompt: {usage.prompt_tokens}, completion: {usage.completion_tokens})")

            return extracted

        except Exception as e:
            print(f"  ✗ Extraction error: {e}")
            # Return defaults on error
            defaults = {}
            for field_name, possible_values in response_schema.items():
                defaults[field_name] = possible_values[0] if possible_values else "unknown"
            return defaults

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

    # Compile graph with checkpointer for state persistence
    checkpointer = get_checkpointer()
    compiled = graph.compile(checkpointer=checkpointer)

    print(f"✓ Graph compiled with checkpointer\n")

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
