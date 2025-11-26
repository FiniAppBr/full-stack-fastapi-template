# ConnectAI UI/UX Roadmap

**Date:** 2025-11-26
**Status:** Planning

---

## 1. Entity Organization

**Current:** Entities have `category` field (products, policies, faq, people, locations, processes, brand, custom).

**Add:** `situation` and `example` categories for behavioral content.

**UI:** Group entity list by category, add quick filters.

---

## 2. Contact Schema (Custom Fields)

**Purpose:** Let businesses define custom data to collect from contacts (budget, symptoms, preferences, etc.).

**Flow:**
1. **Settings > Campos de Contato** - define fields per workspace
2. **Agent Edit > Coleta de Dados** - pick which fields agent collects, set necessity
3. **Contact view** - shows collected field values

**Schema:**
```python
class ContactField:
    key: str              # "budget"
    label: str            # "Orçamento"
    type: str             # "number" | "text" | "select" | "date"
    options: list[str]    # For select type

class AgentFieldConfig:
    field_key: str
    necessity: str        # "required" | "recommended" | "optional"
```

**Tool:** Agent calls `save_contact_field(field, value)` when it learns something naturally in conversation.

**Why tool, not extraction:** Agent has context, decides when to save. No extra LLM call. Natural collection, not form-like interrogation.

---

## 3. Neo-Agent Edit Form

**Problems:** Cluttered, no hierarchy, guardrails buried in JSON.

**Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ Agent Settings                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ IDENTIDADE                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Nome: [Nina                    ]                        │ │
│ │ Descrição: [Vendedora especializada em instrumentos...] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ CONHECIMENTO                                    [+ Entidade]│
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📦 Produtos (3)                                         │ │
│ │ 🎓 Serviços (2)                                         │ │
│ │ 📋 Políticas (1)                                        │ │
│ │ 💡 Situações (2)                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ COLETA DE DADOS                                   [+ Campo] │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ budget (obrigatório)                                    │ │
│ │ bedrooms (recomendado)                                  │ │
│ │ location (opcional)                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ OBJETIVOS                                       [+ Objetivo]│
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 1. Qualificar o cliente                                 │ │
│ │ 2. Apresentar produto adequado                          │ │
│ │ 3. Fechar venda ou agendar visita                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ FERRAMENTAS                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [x] Verificar estoque                                   │ │
│ │ [x] Verificar disponibilidade                           │ │
│ │ [x] Agendar compromisso                                 │ │
│ │ [ ] Enviar para atendente                               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ▼ Configurações Avançadas                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Guardrails                                              │ │
│ │   Nunca dizer: [preço de concorrente, ]                 │ │
│ │   Nunca fazer: [inventar especificações, ]              │ │
│ │   Sempre fazer: [confirmar dados antes de agendar, ]    │ │
│ │                                                         │ │
│ │ Escalação                                               │ │
│ │   Se: [cliente pede humano] → [Transferir mensagem...]  │ │
│ │   Se: [reclamação grave   ] → [Vou chamar gerente...]   │ │
│ │                                                         │ │
│ │ Modelo: [google/gemini-2.0-flash-001 ▼]                 │ │
│ │ Temperatura: [0.7]                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                                    [Cancelar] [Salvar]      │
└─────────────────────────────────────────────────────────────┘
```

**Key:** Progressive disclosure. Advanced collapsed by default.

---

## 4. Situações (Behavioral Entities)

Entities with `category: situation`. Teach agent HOW to act.

**Example:** "Cliente irritado"
```
Quando frustrado:
1. Reconheça o sentimento
2. Não seja defensivo
3. Foque na solução
```

Retrieved via RAG when context matches. Not always in prompt like guardrails.

---

## 5. Few-Shot via RAG

Create examples as entities (`category: example`). RAG retrieves when semantically relevant. No hardcoded examples.

---

## 6. Analytics (Future)

- Conversation success rate
- RAG chunk usage
- Escalation rate
- Validation failures

Post-launch.

---

## Clarifications

**Guardrails vs Situações:**
| Guardrails | Situações |
|------------|-----------|
| Always in prompt | Retrieved via RAG |
| Hard rules | Contextual guidance |
| "Never say X" | "When Y, do Z" |

**Entity chunks vs Document chunks:**
| Entity | Document |
|--------|----------|
| User-crafted, precise | Bulk uploaded |
| "DADOS OFICIAIS" | "CONHECIMENTO RELEVANTE" |
| Use exactly | Can paraphrase |

---

## Priority

| # | Item | Effort |
|---|------|--------|
| 1 | Contact schema + save_contact_field tool | Medium |
| 2 | Add situation/example categories | Trivial |
| 3 | Entity list grouping UI | Small |
| 4 | Agent edit form revamp | Medium |
| 5 | Analytics | Large (future) |

---

## Open Questions & Notes

### Entities / Conhecimento
- Polish the entity management UX
- Add `situation` category, maybe recategorize existing
- Consider merging tabs, add "document" as entity type
- Probably remove Playground

### Navigation Structure
- Group Contatos + Kanban better
- Group Calendário + Recursos better
- Restructure Recursos (better grouping)

### Data Collection Fields
- How to enforce necessity levels (required/recommended/optional)?
- Are all fields pertaining to contact, or could some be session-scoped?
- How to make fields required for tool calling? (e.g., `book_appointment` needs `phone`)

### Personality vs Identity
- Current: separate "personality" tab with tone, message size, emoji, etc.
- Question: merge into identity? Or keep separate?
- We need: message length, message count, tone, formality
- Idea: **Personality library** - presets with few-shot examples baked in
  - "Profissional", "Casual", "Técnico", etc.
  - User picks preset, can customize
  - Presets include tone + example conversations

### Other
- Tool permissions UI - where does it live?
- Multi-agent per workspace - how to handle?
