# ConnectAI Agent System - PRD

## Pipeline Architecture (Verified)

```
USER MESSAGE
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ PREPROCESS                                          (graph.py:152)│
│ • Normalize dates/times from user message                       │
│   ("sábado" → "2025-12-06", "amanhã às 10h" → date + time)     │
│ • Store in agent_state.collected_data as _normalized_date/time  │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ ASSEMBLE                                            (graph.py:194)│
│ • Add user message to history                                   │
│ • Increment turn_count                                          │
│ • RAG search: user_message → embeddings → similar chunks        │
│ • Build system prompt:                                          │
│   - Agent description                                           │
│   - RAG chunks (REFERÊNCIA)                                     │
│   - Objectives (OBJETIVOS DA CONVERSA)                          │
│   - Response rules (COMO RESPONDER)                             │
│   - Guardrails (REGRAS)                                         │
│   - Tools + usage instructions (if enabled)                     │
│   - Collected data context (DADOS JÁ COLETADOS)                 │
│ • Build react_messages: [system_prompt, history, user_message]  │
│                                                                 │
│ RAG query: assemble.py:58-66 (all categories mixed)             │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ AGENT (ReAct loop)                                  (graph.py:332)│
│ • LLM with bound tools sees react_messages                      │
│ • Decides: call tools OR done                                   │
│ • Max 3 iterations                                              │
│ • If no tools enabled → skip directly to EXTRACT_DATA           │
└─────────────────────────────────────────────────────────────────┘
     │
     ├── has tool_calls? ──▶ TOOLS ──┐
     │                               │
     │   ┌───────────────────────────┘
     │   │
     │   ▼
     │  ┌─────────────────────────────────────────────────────────┐
     │  │ TOOLS                                       (graph.py:391)│
     │  │ • Execute each tool call                                │
     │  │ • Inject _normalized_date for booking tools             │
     │  │ • Cache check_availability results                      │
     │  │ • Return tool results as ToolMessages                   │
     │  └─────────────────────────────────────────────────────────┘
     │       │
     │       ├── more tool calls? ──▶ back to AGENT
     │       │
     │       ▼ done with tools
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ EXTRACT_DATA                                        (graph.py:500)│
│ • Build extraction prompt from last 3 conversation turns        │
│ • LLM extracts structured data (name, custom fields)            │
│ • Store in agent_state.collected_data                           │
│ • Uses fast model (gemini-2.5-flash-lite, temp=0.1)            │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ GENERATE                                            (graph.py:631)│
│ • If retry: inject validation feedback as SystemMessage         │
│ • Booking guard: warn if user wants to book but tool not called │
│ • LLM with structured output → ResponseSchema                   │
│   (messages: list[str], thinking: Optional[str])                │
│ • Guaranteed to produce valid response structure                │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ VALIDATE                                            (graph.py:760)│
│ • Rule checks:                                                  │
│   - never_say violations                                        │
│   - Response too long (>150% of max)                            │
│   - Greeting after turn 1                                       │
│ • LLM check:                                                    │
│   - Hallucination detection (facts not in RAG context)          │
│ • If issues found AND retry_count < 2 → back to GENERATE        │
└─────────────────────────────────────────────────────────────────┘
     │
     ├── validation failed & retries left? ──▶ back to GENERATE
     │
     ▼ passed (or max retries)
┌─────────────────────────────────────────────────────────────────┐
│ POST_PROCESS                                        (graph.py:847)│
│ • Calculate typing delays per message:                          │
│   base=1725ms + 138ms/char + variance(-300,+400)               │
│   floor=1500ms                                                  │
│ • Add pause between messages (config.typing.between_messages_ms)│
│ • Add assistant messages to history                             │
│ • Return MessageWithTiming objects                              │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
RESPONSE TO USER
```

## LLM Calls Per Turn

| Node | Model | Purpose |
|------|-------|---------|
| PREPROCESS | - | No LLM (regex date parsing) |
| ASSEMBLE | - | No LLM (vector search only) |
| AGENT | config.generation.model | 0-3 calls (0 if no tools enabled) |
| TOOLS | - | No LLM (executes tool functions) |
| EXTRACT_DATA | gemini-2.5-flash-lite | 1 call (always) |
| GENERATE | config.generation.model | 1-3 calls (retries on validation fail) |
| VALIDATE | gemini-2.5-flash-lite | 0-3 calls (0 if no RAG chunks) |
| POST_PROCESS | - | No LLM (timing calculations) |

**Minimum: 2 LLM calls** (no tools, no chunks: extract + generate)
**Typical: 4 LLM calls** (tools enabled, has chunks: agent + extract + generate + validate)
**Maximum: 10 LLM calls** (3 agent loops + extract + 3 generate + 3 validate)

## Key Files

| File | Purpose |
|------|---------|
| `app/agent/core/graph.py` | LangGraph pipeline, all nodes |
| `app/agent/core/prompts.py` | System prompt builder |
| `app/agent/core/config.py` | BaseAgentConfig class |
| `app/agent/core/db_loader.py` | NeoAgent DB → BaseAgentConfig |
| `app/agent/core/schema.py` | Core types (Objective, Guardrails, ChunkMatch) |
| `app/agent/core/pipeline/assemble.py` | RAG search logic |
| `app/api/routes/chat.py` | Chat API endpoint |

## Entity System

Entities are flexible data containers with `category` and `template` fields.

### Categories and Their Purpose

| Category | Purpose | Should go to |
|----------|---------|--------------|
| `products` | Product info (price, features) | RAG → REFERÊNCIA |
| `policies` | Guarantees, refund policies | RAG → REFERÊNCIA |
| `documents` | Uploaded knowledge files | RAG → REFERÊNCIA |
| `people` | Team members, instructors | RAG → REFERÊNCIA |
| `faq` | Frequently asked questions | RAG → REFERÊNCIA |
| `objections` | Objection handling scripts | RAG → REFERÊNCIA |
| `guardrails` | Behavioral rules (never_say, always_do) | Config → REGRAS (NOT RAG) |

### Current Issue: Mixed RAG

All entity categories are chunked and searched together in a single query:
```python
# assemble.py:58-66
stmt = (
    select(KnowledgeBase, similarity)
    .where(KnowledgeBase.agent_id.in_(agent_ids))  # Only filter: linked entities
    .where(KnowledgeBase.is_active == True)
    .order_by(similarity.desc())
    .limit(limit)  # Single limit for all categories
)
```

A query with `limit=5` might return:
- 2 objection chunks (maybe not relevant)
- 1 document chunk
- 2 product chunks
- 0 policy chunks (crowded out)

### Proposed: Category-Aware RAG

Separate queries per category type with dedicated limits:
```
Knowledge (documents, faq): limit=3
Entities (products, policies, people): limit=2
Objections: limit=1 when detected
Guardrails: excluded (come from config, not RAG)
```

## Prompt Structure

```
Você é {agent_name}.
{agent_description}

## REFERÊNCIA (dados potencialmente relevantes)
{rag_chunks - products, policies, documents, NOT guardrails}

## OBJETIVOS DA CONVERSA
{data_collection_hints + funnel_objectives}

## DADOS JÁ COLETADOS (if any)
{collected contact fields - name, etc.}

## CONTEXTO DE DATA/HORA (if preprocessed)
{normalized dates/times from user message}

## COMO RESPONDER
- Responda de forma natural e direta
- DIVIDA sua resposta em {min}-{max} mensagens curtas (estilo WhatsApp)
- Cada mensagem deve ser CURTA (máximo ~{max_length} caracteres)
- Termine com uma pergunta que avança a conversa
- Se perguntar algo direto (preço, como funciona), RESPONDA DIRETO primeiro

## REGRAS
GERAL:
  - NÃO invente informações
  - NÃO repita perguntas já respondidas
  - NÃO diga 'Olá', 'Oi' (after turn 1)

NUNCA DIGA:
  {never_say rules from guardrail entities}

NUNCA FAÇA:
  {never_do rules from guardrail entities}

SEMPRE FAÇA:
  {always_do rules from guardrail entities}

## Ferramentas Disponíveis (if tools enabled)
{tool categories and names}

## USO DE FERRAMENTAS (OBRIGATÓRIO)
{tool usage instructions}

## 🚨 AÇÃO OBRIGATÓRIA (conditional - when booking intent detected)
{force book_appointment call}
```

## Known Issues

### Fixed
- [x] Guardrails bypass RAG entirely (prompts.py:51-54, come from config instead)
- [x] Language field mismatch (was "en", now "pt")
- [x] Category passed to ChunkMatch metadata (assemble.py:82-84)

### Open
- [ ] RAG mixes all categories (single query, single limit)
- [ ] No tool usage context (tools listed but no guidance when to use)
- [ ] Data collection fields without hints are invisible to agent
- [ ] Turn awareness lives in entity.data.trigger (brittle - should be in agent config)

---

## TODO: RAG Improvements

### 1. Category-based RAG limits ✅
- Each category gets its own limit instead of one mixed query
- Default: `documents: 3, products: 2, policies: 1, objections: 1, faq: 2, people: 1`
- Guardrails excluded entirely from RAG (assemble.py:100)
- Implemented in `_category_based_search()` (assemble.py:103)
- **Limits are editable per agent** via `config.rag.category_limits` (config.py, db_loader.py)

### 2. Intent-aware retrieval
- ASSEMBLE decides which categories are needed for this turn
- Greeting → skip RAG or minimal
- Price question → products, policies
- Objection detected → objections + products

### 3. Entity metadata index (lite info)
- Store entity summaries/tags in memory or fast lookup
- ASSEMBLE checks metadata first: "is there a product entity? is there a guarantee policy?"
- Only fetch full chunks for relevant entities

### 4. Two-stage retrieval
- Stage 1: Which entities are relevant? (metadata check, cheap)
- Stage 2: Fetch full chunks only for relevant entities (embedding search)

### 5. Smart Document Import (TODO)

**Problem:** Documents are currently uploaded as raw text, chunked arbitrarily (e.g., "Part 10", "Part 39"), and stored as generic `documents` category. This causes: (1) poor semantic retrieval because chunks lack context, (2) category imbalance (217 document chunks vs 1 product, 1 objection), (3) content that should be FAQs/products/objections stays buried in document blobs.

**Solution:** Upload → structure-aware chunking (headers, paragraphs) → classify chunks by likely category → LLM extracts entities from relevant chunks → merge/dedupe → user reviews → create proper entities (FAQ, product, objection, etc.) → discard or archive raw document. Handles large docs via batch processing. One-time cost at ingest, not per conversation.

### 6. Sales Pipeline / Multi-Stage Funnels (TODO)

**Problem:** Some clients need multi-stage sales pipelines (e.g., 7 stages: CONEXÃO → DESCOBERTA → VALIDAR → MOSTRAR → PROVA SOCIAL → INTENÇÃO → LINK → FOLLOW-UP) with hundreds of stage-specific scripts. Current system has no stage awareness—RAG retrieves semantically similar content regardless of conversation progress, causing: (1) wrong-stage scripts surfacing (closing scripts during discovery), (2) prompt bloat from irrelevant content, (3) no structured progression through sales funnel.

**Approaches considered and rejected:**
- *State machine with explicit transitions*: Complex to configure, brittle, fights against LLM flexibility.
- *Turn-based stage detection*: Unreliable—rapport might take 1 turn or 5 turns depending on the person.
- *Conditions on every entity*: Expensive to configure (tagging 1000+ scripts), maintenance nightmare.
- *Field-based gating*: Partially viable but over-engineers the problem—LLMs are naturally good at sales conversations.

**Simplest solution (try first):** Add stage framework + progress to prompt (~150 tokens). Let LLM handle progression naturally. Track data collection fields (motivation, level, intent, etc.) and show what's collected vs missing. Scripts become RAG material for tone/examples, not hard requirements. Trust the LLM.

```
## PIPELINE (conduza naturalmente)
1. CONEXÃO → rapport, motivação
2. DESCOBERTA → nível, dificuldades
3. VALIDAR → encorajar
...

## PROGRESSO: motivação ✓, nível ✓, intenção ✗
```

**Smarter solution (if simple fails):** Add lightweight ROUTER call before ASSEMBLE. Router sees stages + current message + collected fields, outputs which content categories are relevant (e.g., `["objections", "descoberta_scripts"]`). RAG then retrieves only from those categories. This saves tokens on GENERATE (expensive) by spending a small router call (cheap). Stage detection becomes implicit in category selection—no state machine needed.

```
PREPROCESS → ROUTER (new, ~500 tokens) → ASSEMBLE (filtered) → GENERATE (smaller context)
```

**Data collection fields for sales funnels:** motivation, level, context (church/home), difficulties, style, intent (ready/looking), wants_link, link_sent. Gates are soft—content is "more relevant" when fields match, not hard-locked.

### 7. Pipeline UI/UX (TODO)

**Problem:** Users have large documents (1000+ lines) with stage-organized content but no way to configure pipelines without coding. They need to: (1) define stages, (2) map content to stages, (3) specify what data each stage collects. Current entity UI has no stage awareness—content is uploaded as flat blobs with no pipeline structure.

**Solution:** Three UI components that work together:

1. **Pipeline Builder** (new tab in agent config): Visual stage editor where users create/reorder stages, add descriptions, and specify which data fields each stage should collect. Shows content count per stage.

2. **Smart Import enhancement**: When uploading structured documents, detect stage markers (headers like "1. CONEXÃO", "2. DESCOBERTA"), auto-create pipeline stages, and auto-tag extracted content. User reviews and confirms. Turns a 1771-line doc into a configured pipeline in one click.

3. **Entity stage tagging**: Simple dropdown on entity create/edit to assign stage. Bulk tagger in list view for mass-tagging. Objections tagged as "any stage" so they surface whenever keywords match.

**Data model changes:**
- `NeoAgentConfig.pipeline`: `{ enabled, stages: [{ id, name, description, collect_fields, order }] }`
- `Entity.stage`: string (stage id) or null (any stage)
- `Entity.content_type`: "script" | "objection" | "faq" | etc.

**Flow:** Upload document → Smart Import detects stages → auto-creates pipeline + tags content → user tweaks in Pipeline Builder → Router uses config automatically. No code, just configuration.

### 8. Proposed Pipeline Architecture (TODO)

Replaces current blind-RAG architecture with UNDERSTAND node that routes + extracts before retrieval.

```
PREPROCESS (no LLM)
    Input:  user_message
    Output: normalized_dates, normalized_times
    ↓
UNDERSTAND (LLM, cheap model) ←─────────────────────────────────┐
    Input:  message                                              │
            history (last 2-3 turns)                             │
            collected_fields (state)                             │
            entity_metadata (categories + "when to use")         │
            stage_definitions (if pipeline enabled)              │
            fields_to_extract                                    │
    Output: { categories, extracted_data, stage, needs_tools }   │
    ↓                                                            │
ASSEMBLE (no LLM, vector search)                                 │
    Input:  message                                              │
            categories (from UNDERSTAND)                         │
            category_limits                                      │
    Output: focused_rag_chunks                                   │
    ↓                                                            │
AGENT (LLM, main model, 0-3 calls) ◄══════╗                      │
    Input:  message                       ║ ReAct                │
            history                       ║ Loop                 │
            focused_rag_chunks            ║ (if tools)           │
            available_tools               ║                      │
    Output: tool_calls OR done            ║                      │
    ↓                                     ║                      │
TOOLS (no LLM, execution)                 ║                      │
    Input:  tool_calls                    ║                      │
    Output: tool_results ════════════════►╝                      │
    ↓                                                            │
GENERATE (LLM, main model, 1-3 calls) ◄──────────────────────┐   │
    Input:  message                                          │   │
            history                                          │   │
            focused_rag_chunks                               │   │
            tool_results                                     │   │
            extracted_data (from UNDERSTAND)                 │   │
            stage (from UNDERSTAND)                          │   │
            guardrails                                       │   │
    Output: response_messages                                │   │
    ↓                                                        │   │
VALIDATE (LLM, cheap model, 0-1 call)                        │   │
    Input:  response_messages                                │   │
            original_message                                 │   │
            history (last 2-3 turns)                         │   │
            focused_rag_chunks (for hallucination check)     │   │
            guardrails                                       │   │
    Output: pass OR {fail + feedback} ───────────────────────┘   │
    ↓                                                            │
POST_PROCESS (no LLM)                                            │
    Input:  response_messages                                    │
    Output: messages_with_timing                                 │
            sync collected_data to contact ──────────────────────┘
```

**LLM calls summary:**

| Node | Model | Calls | When |
|------|-------|-------|------|
| UNDERSTAND | cheap | 1 | always |
| AGENT | main | 0-3 | only if tools enabled |
| GENERATE | main | 1-3 | always (retries on validation fail) |
| VALIDATE | cheap | 0-1 | only if RAG chunks exist |

**Typical flow (no tools):** UNDERSTAND (1) → GENERATE (1) → VALIDATE (1) = **3 calls**

**Tool flow:** UNDERSTAND (1) → AGENT (1-3) → GENERATE (1) → VALIDATE (1) = **4-6 calls**

**Key changes from current architecture:**
- UNDERSTAND replaces EXTRACT_DATA and adds routing (fused, one call)
- ASSEMBLE moves after UNDERSTAND and is filtered by routing decision
- GENERATE receives focused context instead of noisy blind-RAG
- Same or fewer LLM calls, but smarter context

## Validation Rules

| Rule | Where | Retries? |
|------|-------|----------|
| never_say violations | validate_node | Yes |
| Response too long | validate_node | Yes |
| Greeting after turn 1 | validate_node | Yes |
| Hallucination | validate_node (LLM) | Yes |
| Booking without tool | generate_node (guard) | No (warning injected) |
