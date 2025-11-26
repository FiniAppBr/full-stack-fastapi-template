# ConnectAI Agent Anatomy (v3)

## Pipeline

```
extract → check_escalation → assemble → agent (ReAct) → tools → post_process
```

## What Each Node Does

### 1. Extract
- Calls LLM to understand the message
- Outputs: `intent`, `trait_updates`, `objection_type`
- Updates state with new traits/objections
- File: `v3/pipeline/extract.py`

### 2. Check Escalation
- If intent matches escalation rule → handoff, skip generation
- File: `graph.py:105-127`

### 3. Assemble
- Enhances query with traits/objection context
- Runs semantic search (Voyage embeddings → PostgreSQL pgvector)
- Selects few-shot examples based on intent
- Trims to token budget
- File: `v3/pipeline/assemble.py`

### 4. Agent (ReAct Loop)
- Builds system prompt from assembled context
- Calls LLM with tools bound
- If LLM returns tool_calls → execute tools → loop back
- Exits when LLM returns final response
- File: `graph.py:187-226`

### 5. Tools
- Executes tool calls (check_availability, book_appointment, check_stock, etc.)
- File: `graph.py:229-291`

### 6. Post-Process
- Extracts final response from last AI message
- Splits into multiple messages (WhatsApp-style)
- Calculates typing delays
- File: `graph.py:294-349`

## State (Persisted via PostgresSaver)

- `traits`: extracted customer info (skill_level, use_case, etc.)
- `events`: triggered flags (link_sent, price_discussed, etc.)
- `history`: conversation messages
- `turn_count`: number of turns
- `objections_raised`: handled objections

Thread ID: `agent_{agent_id}_customer_{customer_id}`

## Generation Prompt Structure

1. Agent identity + description
2. Product/service info
3. Customer traits (from state)
4. Pending objectives (checklist)
5. Conversation state (events)
6. RAG entity chunks (MUST use)
7. RAG knowledge chunks (reference)
8. Few-shot examples
9. Response guidance (mirroring, format)
10. Guardrails (never_say, never_do)
11. Output format: `{"messages": ["msg1", "msg2"]}`

---

## Issues By Component

### Extract
**Problem:** Single intent per message. Real messages have multiple intents.
- "quanto custa? e tem parcelamento?" = `price_inquiry` + `payment_inquiry`
- RAG only pulls chunks for ONE topic

### Assemble
**Problem:** Query enhancement is weak.
- Only appends traits to query
- No conversation history context
- "quanto custa?" after discussing "violão Yamaha" still searches just "quanto custa?"

### Generation Prompt
**Problem:** Too much stuff, unclear hierarchy.
- 11 sections competing for attention
- LLM doesn't know what to prioritize
- Token bloat with irrelevant context

### Examples
**Problem:** Static selection by intent only.
- No awareness of conversation stage (early vs closing)
- No semantic similarity matching

### Response Output
**Problem:** No validation before sending.
- Doesn't check if response answers the question
- Doesn't verify RAG context was used
- Doesn't catch guardrail violations

### Tools
**Problem:** Generic tool instructions.
- LLM guesses when to use tools
- No intent-specific priming

---

## Fixes By Component

### Extract
**Fix:** Multi-intent extraction + LLM-generated search query.
```python
class ExtractionResult(BaseModel):
    intents: list[str]              # Multiple intents from message
    search_query: str               # LLM-generated query for RAG
    objection_type: Optional[str]
    trait_updates: dict[str, str]
```

Extraction prompt addition:
```
search_query: Gere uma query de busca que capture o que o cliente quer saber.
Inclua: produto/serviço sendo discutido, dúvidas específicas, contexto relevante.
Exemplo: "preço parcelamento violão Yamaha C40" (não "quanto custa?")
```

- LLM has full history context, generates optimal search query
- Handles pronouns, implicit references, multiple topics
- No deterministic rules needed - trust LLM + embeddings

**Reference:** Pattern 01 - Subagent Orchestration ("specialized expertise for each intent type")

### Assemble
**Fix:** Use LLM-generated search query directly.
```python
def assemble(config, state, extraction, message):
    # Use extraction's search_query instead of manual enhancement
    chunks = semantic_search(
        query=extraction.search_query,  # LLM-generated, context-aware
        agent_ids=config.get_agent_ids(),
        limit=config.assembly.base_search_limit
    )
    ...
```
- No manual query rewriting logic
- Extraction already paid for - just add one output field
- Flexible: captures nuance that structured fields would miss

**Reference:** Pattern 06 - Programmatic Orchestration ("explicit control flow instead of implicit model decisions")

### Generation Prompt
**Fix:** Clear hierarchy with priority sections.
```
## VOCÊ DEVE (obrigatório)
- Use os dados RAG fornecidos
- Responda a pergunta diretamente

## VOCÊ PODE (contexto útil)
- Traits, exemplos, conhecimento

## VOCÊ NÃO DEVE (guardrails)
- never_say, never_do
```
- Only include context relevant to THIS message type
- Reduce token bloat

**Reference:** Pattern 06 - Programmatic Orchestration ("deterministic - same input = same output")

### Progressive Loading
**Fix:** Conditionally include sections based on turn/context.
```python
def build_prompt_sections(state: AgentState, extraction: ExtractionResult) -> dict:
    sections = {}

    # Always include
    sections["rag_data"] = True
    sections["guardrails"] = True

    # Only on early turns (user learning the agent)
    sections["generation_guidance"] = state.turn_count <= 3

    # Only if tool might be needed
    sections["tool_instructions"] = extraction.intent in TOOL_INTENTS

    return sections
```
- Saves ~500 tokens per turn after first few
- Less noise = better focus on current task
- Note: Objection handling comes from RAG (query enhanced with objection_type), not hardcoded examples

**Reference:** Pattern 02 - Progressive Skills ("on-demand loading based on context")

### Examples
**Fix:** Semantic example matching.
```python
def select_examples(message: str, state: AgentState) -> list[Example]:
    # Embed current situation
    situation = f"{message} | turn {state.turn_count} | {state.traits}"
    # Find most similar examples by embedding distance
    return semantic_search(situation, example_embeddings, limit=2)
```
- Stage-aware (early vs closing)
- Similarity-based, not just intent-based

**Reference:** Pattern 02 - Progressive Skills ("on-demand loading based on context")

### Response Output
**Fix:** Add validation node before post_process.
```python
def validate_node(state: GraphState) -> dict:
    response = get_last_ai_response(state["react_messages"])

    validation = llm_haiku.invoke(f"""
    Pergunta: {state["message"]}
    Contexto RAG: {[c.title for c in state["assembled"].chunks]}
    Resposta: {response}

    1. Responde a pergunta? (sim/não)
    2. Usa dados do contexto? (sim/não)
    3. Consistente com histórico? (sim/não)

    Se "não", diga o problema em 1 frase.
    """)

    if "não" in validation:
        return {"react_messages": [HumanMessage(content=f"CORREÇÃO: {validation}")]}
    return {}
```
- Catches bad responses before user sees them
- Fast model (Haiku) keeps latency low

**Reference:** Pattern 07 - Wizard Workflows ("checkpoint confirmation before next phase")

### Tools
**Fix:** Conditional tool priming based on intent.
```python
def get_tool_instructions(intent: str) -> str:
    tool_map = {
        "availability_check": "AÇÃO: Use check_availability ANTES de responder.",
        "booking_request": "AÇÃO: Use book_appointment. Confirme data/hora primeiro.",
        "stock_inquiry": "AÇÃO: Use check_stock. Não invente quantidades.",
    }
    return tool_map.get(intent, "")
```
- Deterministic tool selection
- LLM knows exactly when to use tools

**Reference:** Pattern 06 - Programmatic Orchestration ("explicit control flow")

---

## Essential Patterns (What ConnectAI Needs)

### Tool Binding by Intent

Instead of generic tool list, bind tools to specific intents:

```python
TOOL_BINDINGS = {
    "availability_check": {
        "tools": ["check_availability"],
        "instruction": "MUST call before answering availability questions"
    },
    "booking_request": {
        "tools": ["book_appointment"],
        "instruction": "Confirm date/hora with user first, then call"
    },
    "stock_inquiry": {
        "tools": ["check_stock"],
        "instruction": "MUST call. Never invent quantities."
    }
}

def get_tool_context(intents: list[str]) -> str:
    instructions = []
    for intent in intents:
        if intent in TOOL_BINDINGS:
            instructions.append(TOOL_BINDINGS[intent]["instruction"])
    return "\n".join(instructions)
```

**Benefit:** LLM knows exactly when to use tools. No guessing.

---

### Entity Capabilities in Chunk Metadata

Currently, entity capabilities (`bookable`, `stockable`, `schedulable`) are stored on the Entity but not propagated to chunks. This means assemble can't generate tool context without extra DB calls.

**Fix:** Denormalize capabilities into chunk metadata during entity processing.

```python
# entities.py - during process_entity()
chunk = KnowledgeBase(
    content=content,
    title=entity.name,
    ...
    metadata_json=json.dumps({
        "entity_id": entity.id,
        "capabilities": entity.capabilities,
        "template": entity.template,
    }),
)
```

Then in assemble, derive tool instructions from retrieved chunks:

```python
# assemble.py - after RAG retrieval
def get_tool_context(chunks: list[ChunkMatch], intent: str) -> str:
    instructions = []
    for chunk in chunks:
        meta = json.loads(chunk.metadata_json or "{}")
        caps = meta.get("capabilities", [])

        if "bookable" in caps and intent in ["booking_request", "availability_check"]:
            instructions.append(f"Para '{chunk.title}': use check_availability ou book_appointment")
        if "stockable" in caps and intent == "stock_inquiry":
            instructions.append(f"Para '{chunk.title}': use check_stock (não invente quantidades)")

    return "\n".join(instructions)
```

**Benefits:**
- No extra DB calls - capabilities come with chunks
- Entity-specific instructions ("Para Curso Violão: use...") not generic
- Scales automatically - only pay for retrieved chunks
- Updates on re-process (existing flow)

**Reference:** Pattern 06 - Programmatic Orchestration ("explicit control flow")

---

### Structured Handoff

When escalating, give human agent full context:

```python
class HandoffPayload(BaseModel):
    reason: str                # "customer requested human" | "complex negotiation"
    customer_summary: str      # traits, key info extracted
    pending_question: str      # what user asked
    suggested_action: str      # what human should do

def build_handoff(state: AgentState, reason: str) -> HandoffPayload:
    return HandoffPayload(
        reason=reason,
        customer_summary=f"Nível: {state.traits.get('skill_level', '?')}, "
                        f"Interesse: {state.traits.get('product_interest', '?')}",
        pending_question=state.message,
        suggested_action="Responder sobre flexibilidade de preço"
    )
```

**Benefit:** Human agent doesn't start from zero.

---

## Updated Pipeline (Recommended)

```
extract (multi-intent) → check_escalation → assemble (query rewriting) → agent (ReAct) → tools → validate → post_process
```

**Enhanced Nodes:**
- `extract` - Returns `list[str]` of intents, not single intent
- `assemble` - Rewrites query with conversation context before RAG
- `check_escalation` - Returns `HandoffPayload` with context, not just boolean
- `tools` - Uses intent-specific binding and instructions
- `validate` - Single check (no regeneration loop), catches bad responses

**Not Added (overengineering for B2C agents):**
- Safety check node (turn limits = config, not a node)
- Task decomposition (multi-intent list is enough)
- Iterative RAG (fix embeddings upfront, don't retry)
- Metacognition loop (validate once, don't regenerate)
