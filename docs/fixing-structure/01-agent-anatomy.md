# ConnectAI Agent v3 - Simplified Architecture

**Date:** 2025-11-26
**Status:** Implemented

## Pipeline

```
assemble → agent ⟷ tools → post_process
```

No extraction LLM call. ~500 tokens saved per turn.

## What Each Node Does

### 1. Assemble
- Builds search query: `message + last 2 turns of history`
- Runs semantic search (Voyage embeddings → pgvector)
- Returns RAG chunks with metadata (capabilities, template)
- Derives tool instructions from entity capabilities
- **No LLM call** - just string concat + DB query

### 2. Agent (ReAct)
- Builds system prompt from config + RAG chunks
- Calls LLM with tools bound
- If tool_calls → execute → loop back
- Exits when LLM returns final response

### 3. Tools
- Executes tool calls
- Returns results to agent for next iteration

### 4. Post-Process
- Extracts response from last AI message
- Splits into multiple messages (WhatsApp-style)
- Calculates typing delays

## State (PostgresSaver)

```python
class AgentState:
    agent_id: str
    thread_id: str
    turn_count: int
    history: list[dict]  # [{role, content}, ...]
```

Thread ID: `agent_{agent_id}_customer_{customer_id}`

## Config Schema

```python
class BaseAgentConfig:
    # Identity
    agent_id: str
    agent_name: str
    agent_description: str
    linked_entities: list[int]  # For RAG
    enabled_tool_categories: list[str]

    # Content
    product_summary: str  # Product/service info

    # Behavior (all optional)
    objectives: list[Objective]  # Guidance for LLM
    guardrails: Guardrails  # never_say, never_do, always_do
    escalation_triggers: list[EscalationTrigger]  # LLM-evaluated

    # Settings
    generation: GenerationConfig
    rag: RAGConfig
    multi_message: MultiMessageConfig
```

## Generation Prompt Structure

```
Você é {agent_name}.
{agent_description}

## PRODUTO/SERVIÇO
{product_summary}

## DADOS OFICIAIS (from entity chunks)
{entity_content}
⚠️ Use EXATAMENTE as informações acima.

## CONHECIMENTO RELEVANTE (from document chunks)
{knowledge_content}

## OBJETIVOS (optional)
{objectives}

## ESCALAÇÃO (optional)
{escalation_conditions}

## COMO RESPONDER
- Responda de forma natural e direta
- Mensagens curtas (1-2 frases cada)
- Termine com uma pergunta que avança a conversa

## REGRAS (optional)
{guardrails}

## Ferramentas Disponíveis (if tools enabled)
{tools_summary}

## Instruções de Ferramentas (from entity capabilities)
Para 'Violão Yamaha C40': use check_stock (não invente quantidades)
Para 'Curso de Violão': use check_availability ou book_appointment
```

## RAG Search Query

Built from `message + last 2 turns`:
```python
def build_search_query(message: str, context_turns: int = 2) -> str:
    recent = history[-(context_turns * 2):]
    context = " ".join(msg["content"] for msg in recent)
    return f"{message} {context}"
```

**Why 2 turns?** Tested: +15% similarity improvement. Diminishing returns after.

## Entity Capabilities in Chunk Metadata

When entities are processed into chunks, their capabilities are stored in `metadata_json`:

```python
# entities.py - process_entity()
metadata = {
    "entity_id": entity.id,
    "capabilities": entity.capabilities or [],  # ["bookable", "stockable", "schedulable"]
    "template": entity.template,
}
chunk = KnowledgeBase(
    content=content,
    metadata_json=json.dumps(metadata),
    ...
)
```

In assemble, tool instructions are derived from chunk capabilities:

```python
# assemble.py - get_tool_context()
def get_tool_context(chunks: list[ChunkMatch]) -> str:
    for chunk in chunks:
        caps = chunk.metadata.get("capabilities", [])
        if "bookable" in caps:
            instructions.append(f"Para '{chunk.title}': use check_availability ou book_appointment")
        if "stockable" in caps:
            instructions.append(f"Para '{chunk.title}': use check_stock")
```

**Benefits:**
- No extra DB calls - capabilities come with chunks
- Entity-specific instructions, not generic
- Scales automatically - only pay for retrieved chunks
- Updates on re-process (existing flow)

## What Was Removed

| Component | Reason |
|-----------|--------|
| Extraction LLM call | Search query from history is free and effective |
| Traits | LLM sees history, infers implicitly |
| Intents | LLM judges tools directly |
| Events | Analytics can be post-hoc |
| ConversationExample | Use RAG for few-shot instead |

## Files Structure

```
app/agent/v3/
├── __init__.py      # Exports
├── schema.py        # Objective, Guardrails, EscalationTrigger, AgentState, etc.
├── config.py        # BaseAgentConfig, GenerationConfig, RAGConfig
├── prompts.py       # build_generation_prompt()
├── graph.py         # LangGraph: assemble → agent → tools → post_process
├── run.py           # run_turn() wrapper
└── pipeline/
    ├── __init__.py
    └── assemble.py  # RAG search
```

---

## Next Goals

### 1. UI for Objectives
- Let users add/edit objectives per agent
- Shows in prompt as guidance

### 2. Few-Shot via RAG
- Store example conversations as entities
- Retrieved when relevant (semantic match)
- No hardcoded examples needed

### 3. Tool Approval System
- `auto` / `notify` / `approve` per tool
- LangGraph interrupts for approval flow
- Owner notified via WhatsApp/dashboard

### 4. Structured Handoff
- When escalating, pass context to human
- Customer summary, pending question, suggested action

---

## Testing

```bash
# Quick test
curl -X POST http://localhost:5460/api/v1/neo-agents/1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "oi", "thread_id": "test_123"}'
```
