# Token Optimization System

**Goal:** Minimize token usage while maintaining functionality
**Savings:** 56% reduction (1,956 → 861 tokens/conversation)

---

## Hard Rules

### RAG (Retrieval-Augmented Generation)
- `top_k = 3` (retrieve max 3 chunks)
- `similarity_threshold = 0.4` (reject chunks < 0.4 cosine similarity)
- `max_context_tokens = 500` (hard limit, truncates if exceeded)
- `contextual_search_turns = 3` (prepend last 3 messages to search query)
- **No special handling for small documents** - RAG runs for all docs

### Memory (Mem0)
- **Strategy:** Hybrid (only save when triggered)
- **Triggers:**
  1. End-of-conversation (3 min inactivity → frontend calls `/conversations/end`)
  2. Turn threshold (>= 10 turns)
  3. Agent flags `memory_worthy=true`
- **Minimum turns:** 2 (conversations < 2 turns never save)
- **Result:** 80% savings (831 → 166 tokens per save)

### Structured Output
Replaces intent classification (-170 tokens). Agent returns:
```json
{
  "response": "string",
  "sentiment": "neutral|positive|frustrated|angry",
  "requires_handoff": "boolean",
  "handoff_reason": "complaint|too_complex|out_of_scope|emergency|none",
  "urgency": "normal|high",
  "memory_worthy": "boolean"
}
```

### Response Generation
- `max_length = "concise"` (2-3 sentences)
- `language = "pt-BR"`
- `tone = "warm"`
- `model = "gpt-4o-mini"`

### Handoff (Human Escalation)
- Triggers when:
  - `requires_handoff=true` AND (`handoff_reason="complaint"` OR `"emergency"`)
  - OR `sentiment in ["frustrated", "angry"]`
- Notifies: Slack webhook (Email/WhatsApp TODO)
- Fire-and-forget (doesn't block response)

### Function Tools
- **Currently disabled** (`booking_enabled=false`, `payment_links_enabled=false`)
- Available: `check_availability()`, `book_appointment()`, `send_payment_link()`
- Enable in config + implement integration TODOs

---

## API Changes

### POST `/api/v1/message`

**Request:**
```json
{
  "customer_id": "string",
  "message": "string",
  "agent_id": "string",
  "turn_count": 1  // NEW: track conversation length
}
```

**Response:**
```json
{
  "response": "string",
  "sentiment": "neutral",
  "requires_handoff": false,
  "handoff_reason": "none",
  "urgency": "normal",
  "memory_worthy": false,
  "memory_saved": false,
  "memory_save_reason": "too_few_turns_1",
  "workflow_id": "string",
  "duration_seconds": 2.5,
  "agent_timings": {}
}
```

### POST `/api/v1/conversations/end`

Trigger end-of-conversation memory save.

**Request:**
```json
{
  "customer_id": "string",
  "agent_id": "string"
}
```

**Response:** 204 No Content

---

## Configuration

**Location:** `backend/app/agents/config/optimization.py`

```python
from app.agents.config import OptimizationConfig

config = OptimizationConfig(
    memory=MemoryConfig(
        strategy="hybrid",          # hybrid | disabled | always
        turn_threshold=10,
        inactivity_seconds=180,     # 3 minutes
        min_turns=2
    ),
    rag=RAGConfig(
        top_k=3,
        similarity_threshold=0.4,
        max_context_tokens=500
    ),
    response=ResponseConfig(
        max_length="concise",       # concise | normal | detailed
        language="pt-BR",
        tone="warm"                 # warm | professional | casual
    ),
    handoff=HandoffConfig(
        enabled=True,
        notify_on_complaint=True,
        notify_on_emergency=True,
        notify_on_frustrated=True,
        slack_webhook="https://...",
        email_recipient="support@...",
        whatsapp_number="+55..."
    ),
    tools=ToolsConfig(
        booking_enabled=False,
        payment_links_enabled=False,
        calendar_integration="none",
        payment_provider="none"
    ),
    model="gpt-4o-mini",
    enable_tracing=False
)
```

---

## Frontend Integration Required

To activate smart memory triggers, implement inactivity timer:

```javascript
let turnCount = 0;
let inactivityTimer = null;
const INACTIVITY_TIMEOUT = 3 * 60 * 1000; // 3 minutes

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(async () => {
    await fetch('/api/v1/conversations/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id, agent_id })
    });
  }, INACTIVITY_TIMEOUT);
}

async function sendMessage(message) {
  turnCount++;
  const response = await fetch('/api/v1/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_id,
      message,
      agent_id,
      turn_count: turnCount
    })
  });
  resetInactivityTimer();
  return response.json();
}
```

---

## File Structure

```
backend/app/agents/
├── workflows/
│   └── assistant_workflow.py      # Main workflow (refactored)
├── config/
│   ├── __init__.py
│   └── optimization.py            # Configuration
├── schemas/
│   ├── __init__.py
│   └── structured_output.py       # Response schema
├── tools/
│   ├── __init__.py
│   ├── booking.py                 # Booking tools
│   └── payments.py                # Payment tools
├── handoffs/
│   ├── __init__.py
│   └── handlers.py                # Human escalation
├── memory/
│   ├── __init__.py
│   └── triggers.py                # Smart memory logic
└── utils/
    ├── __init__.py
    └── rag.py                     # RAG optimization
```

---

## Database Changes

**Migration:** `3c2420f304b5_add_structured_output_fields_to_conversation_log.py`

**New fields in `conversation_log`:**
- `sentiment` VARCHAR DEFAULT 'neutral'
- `requires_handoff` BOOLEAN DEFAULT false
- `handoff_reason` VARCHAR DEFAULT 'none'
- `urgency` VARCHAR DEFAULT 'normal'

**Deprecated fields (kept for backwards compatibility):**
- `intent` VARCHAR
- `confidence` FLOAT

---

## Token Breakdown

| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| Intent Classification | 170 | 0 | 170 |
| Memory Save | 831 | 166 | 665 |
| RAG | 250 | 150 | 100 |
| Response | 700 | 540 | 160 |
| **Total** | **1,956** | **861** | **1,095 (56%)** |

---

## Key Behavior Changes

1. **Memory is NOT saved after every turn** - only when triggered
2. **70% of conversations (1-3 turns) never save to Mem0** - by design
3. **Intent classification removed** - replaced with actionable structured output
4. **Frontend must implement inactivity timer** - or memory only saves after 10 turns
5. **Handoffs are automatic** - no manual intervention needed for complaints/emergencies
