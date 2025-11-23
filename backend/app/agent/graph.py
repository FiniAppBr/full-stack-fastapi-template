"""
ReAct Agent Graph - LangGraph-based reasoning + acting loop.

The graph implements:
1. State extraction (user-defined fields from conversation)
2. Gating (stage-aware topic filtering)
3. ReAct loop (LLM decides: respond or call tools)
4. Validation (post-response checks)
5. Splitting (multi-message formatting)

Flow:
  extract_state → gating → react_agent → validate → split → END
"""
from typing import Dict, Optional, Literal
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI
from sqlmodel import Session
import os

from app.core.db import engine
from app.models.agent import Agent
from app.llm.openai import models
from app.agent.pipeline.format import split_response_messages as split_response

from .state import generate_state_class, extract_state_fields
from .stages import get_stage_by_id, check_stage_transition, get_stage_rag_tags
from .prompts import compose_system_prompt
from .checkpointer import get_checkpointer
from .tools import get_tools_for_agent, search_knowledge_for_agent

# Global cache for compiled graphs
_agent_graphs: Dict[int, StateGraph] = {}


def _create_extract_node(agent_config: dict):
    """Create node that extracts state fields from conversation."""
    state_schema = agent_config.get("state_schema", {})

    def extract_node(state: dict) -> dict:
        """Extract user-defined fields from the last message."""
        print("-> Extract State")

        messages = state.get("messages", [])
        if not messages or not state_schema:
            return {"turn_count": state.get("turn_count", 0) + 1}

        last_message = messages[-1].get("content", "")
        extracted = extract_state_fields(state, state_schema, last_message)

        # Check stage transition
        current_stage_id = state.get("current_stage")
        stages = agent_config.get("stages", [])
        if stages and current_stage_id:
            current_stage = get_stage_by_id(stages, current_stage_id)
            next_stage = check_stage_transition(current_stage, {**state, **extracted})
            if next_stage:
                print(f"  Stage transition: {current_stage_id} -> {next_stage}")
                extracted["previous_stage"] = current_stage_id
                extracted["current_stage"] = next_stage

        return {
            **extracted,
            "turn_count": state.get("turn_count", 0) + 1
        }

    return extract_node


def _create_gating_node(agent_config: dict):
    """Create node that applies topic/stage gating rules."""
    gating_rules = agent_config.get("gating_rules", [])
    stages = agent_config.get("stages", [])
    handoff_triggers = agent_config.get("handoff_triggers", [])

    def gating_node(state: dict) -> dict:
        """Apply pre-agent filtering based on stage and rules."""
        print("-> Gating")

        excluded_tags = []
        requires_handoff = False
        handoff_reason = None

        # Stage-based gating
        current_stage_id = state.get("current_stage")
        if stages and current_stage_id:
            stage = get_stage_by_id(stages, current_stage_id)
            if stage and stage.blocked_topics:
                excluded_tags.extend(stage.blocked_topics)
                print(f"  Stage blocks: {stage.blocked_topics}")

        # Rule-based gating
        for rule in gating_rules:
            field = rule.get("if_field")
            equals = rule.get("equals")
            exclude = rule.get("exclude_tags", [])

            if field and field in state:
                if state.get(field) == equals:
                    excluded_tags.extend(exclude)
                    print(f"  Rule blocks: {exclude}")

        # Handoff detection (simple keyword check for now)
        messages = state.get("messages", [])
        if messages and handoff_triggers:
            last_message = messages[-1].get("content", "").lower()
            for trigger in handoff_triggers:
                if trigger.lower() in last_message:
                    requires_handoff = True
                    handoff_reason = trigger
                    print(f"  Handoff triggered: {trigger}")
                    break

        return {
            "excluded_tags": list(set(excluded_tags)),
            "requires_handoff": requires_handoff,
            "handoff_reason": handoff_reason
        }

    return gating_node


def _create_validate_node(agent_config: dict):
    """Create node that validates the response."""
    validation_rules = agent_config.get("validation_rules", [])

    def validate_node(state: dict) -> dict:
        """Post-agent validation checks."""
        print("-> Validate")

        response = state.get("response", "")
        if not response:
            return {"validation_passed": True}

        # Apply validation rules
        issues = []
        for rule in validation_rules:
            # Check "never_say" rules
            if "never_say" in rule:
                forbidden = rule["never_say"]
                if forbidden.lower() in response.lower():
                    issues.append(f"Response contains forbidden content: {forbidden}")

            # Check "must_include" when condition met
            if "if_field" in rule and "must_include" in rule:
                field = rule["if_field"]
                equals = rule.get("equals")
                must_include = rule["must_include"]
                if state.get(field) == equals and must_include.lower() not in response.lower():
                    issues.append(f"Response missing required content: {must_include}")

        if issues:
            print(f"  Validation issues: {issues}")
            return {
                "validation_passed": False,
                "validation_message": "; ".join(issues)
            }

        return {"validation_passed": True}

    return validate_node


def _create_split_node(agent_config: dict):
    """Create node that splits response into multiple messages."""
    multi_turn_config = agent_config.get("multi_turn_config", {})

    def split_node(state: dict) -> dict:
        """Split response for natural multi-message flow."""
        print("-> Split")

        response = state.get("response", "")
        if not response:
            return {"response_messages": []}

        if not multi_turn_config.get("enabled", False):
            return {"response_messages": [response]}

        messages = split_response(
            response=response,
            max_splits=multi_turn_config.get("max_splits", 4),
            style=multi_turn_config.get("style", "medium")
        )

        print(f"  Split into {len(messages)} messages")
        return {"response_messages": messages}

    return split_node


def create_agent_graph(agent_id: int) -> StateGraph:
    """
    Create a compiled LangGraph for a specific agent.

    Loads config from database and builds the ReAct graph.

    Args:
        agent_id: Agent ID from database

    Returns:
        Compiled StateGraph ready for invocation
    """
    print(f"\n{'='*60}")
    print(f"Creating ReAct Graph for Agent {agent_id}")
    print(f"{'='*60}")

    # Load agent config from DB
    with Session(engine) as session:
        agent = session.get(Agent, agent_id)

        if not agent:
            raise ValueError(f"Agent {agent_id} not found in database")

        agent_config = {
            "name": agent.name,
            "business_description": agent.description or "",
            "state_schema": agent.response_schema or {},
            "stages": agent.stages or [],
            "stages_enabled": agent.stages_enabled,
            "multi_turn_config": agent.multi_turn_config or {"enabled": False},
            "gating_rules": agent.gating_rules or [],
            "validation_rules": agent.validation_rules or [],
            "handoff_triggers": agent.handoff_triggers or [],
            "tone": agent.tone,
            "language": agent.language,
            "emoji_usage": agent.emoji_usage,
            "enabled_tools": agent.enabled_tools or [],
            "tool_configs": agent.tool_configs or {},
        }

    print(f"Config loaded:")
    print(f"  - State schema: {len(agent_config['state_schema'])} fields")
    print(f"  - Gating rules: {len(agent_config['gating_rules'])}")
    print(f"  - Validation rules: {len(agent_config['validation_rules'])}")
    print(f"  - Multi-turn: {agent_config['multi_turn_config'].get('enabled', False)}")
    print(f"  - Stages enabled: {agent_config['stages_enabled']}")
    print(f"  - Enabled tools: {agent_config['enabled_tools']}")

    # Generate dynamic state class
    state_class = generate_state_class(agent_id, agent_config["state_schema"])

    # Create LLM for ReAct agent
    llm = ChatOpenAI(
        model=models.chat_model,
        temperature=models.chat_temperature,
        max_tokens=models.chat_max_tokens,
        api_key=os.getenv("OPENAI_API_KEY")
    )

    # Build tools list from registry
    tools = get_tools_for_agent(agent_config["enabled_tools"])

    # Create the graph
    graph = StateGraph(state_class)

    # Add nodes
    graph.add_node("extract_state", _create_extract_node(agent_config))
    graph.add_node("gating", _create_gating_node(agent_config))

    # ReAct agent node - generates response using LLM with RAG context
    def react_node(state: dict) -> dict:
        """Generate response using LLM with RAG context."""
        print("-> ReAct Agent")

        messages = state.get("messages", [])
        if not messages:
            return {"response": "Ola! Como posso ajudar?"}

        # Build system prompt
        current_stage = None
        rag_tags = None
        if agent_config.get("stages_enabled") and state.get("current_stage"):
            current_stage = get_stage_by_id(
                agent_config.get("stages", []),
                state.get("current_stage")
            )
            if current_stage:
                rag_tags = current_stage.get("rag_tags")

        # Get customer state for context
        state_context = {
            k: v for k, v in state.items()
            if k in agent_config["state_schema"] and v
        }

        # RAG search - get relevant knowledge
        rag_context = ""
        if "search_knowledge" in agent_config.get("enabled_tools", []):
            last_message = messages[-1].get("content", "") if messages else ""
            if last_message:
                rag_context = search_knowledge_for_agent(
                    query=last_message,
                    agent_id=agent_id,
                    tags=rag_tags
                )
                if rag_context and "No relevant information" not in rag_context:
                    print(f"  RAG: Found relevant knowledge")

        system_prompt = compose_system_prompt(
            agent_config=agent_config,
            current_stage=current_stage,
            rag_context=rag_context,
            state_context=state_context
        )

        try:
            response = llm.invoke([
                {"role": "system", "content": system_prompt},
                *messages
            ])

            print(f"  Response: {response.content[:100]}...")
            return {
                "response": response.content,
                "rag_context": rag_context,
                "tokens_used": {
                    "prompt_tokens": response.response_metadata.get("token_usage", {}).get("prompt_tokens", 0),
                    "completion_tokens": response.response_metadata.get("token_usage", {}).get("completion_tokens", 0),
                }
            }
        except Exception as e:
            print(f"  LLM error: {e}")
            return {"response": "Desculpe, ocorreu um erro. Pode repetir?"}

    graph.add_node("react_agent", react_node)
    graph.add_node("validate", _create_validate_node(agent_config))
    graph.add_node("split", _create_split_node(agent_config))

    # Add edges
    graph.set_entry_point("extract_state")
    graph.add_edge("extract_state", "gating")
    graph.add_edge("gating", "react_agent")
    graph.add_edge("react_agent", "validate")
    graph.add_edge("validate", "split")
    graph.add_edge("split", END)

    # Compile with checkpointer
    checkpointer = get_checkpointer()
    compiled = graph.compile(checkpointer=checkpointer)

    print("Graph compiled with checkpointer\n")

    return compiled


def get_or_create_agent_graph(agent_id: int, force_rebuild: bool = False) -> StateGraph:
    """
    Get cached graph or create new one.

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
    Clear cached graphs. Call when agent config changes.

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
