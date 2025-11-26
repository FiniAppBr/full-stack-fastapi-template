# ConnectAI UI/UX Roadmap

**Date:** 2025-11-26
**Status:** Planning

## Current State

The v3 agent architecture is simplified and working:
- Pipeline: `assemble → agent ⟷ tools → validate → post_process`
- Entity capabilities flow to chunks → tool instructions
- Validation node catches bad responses
- Escalation via tool call

But the **UI doesn't reflect this architecture**. The neo-agents/edit form is cluttered and doesn't guide users effectively.

---

## 1. Entity Organization

### Current State
Entities already have `category` field with values:
- `products`, `policies`, `faq`, `people`, `locations`, `processes`, `brand`, `custom`

Also have `template` field for structured data.

### What's Missing
Two new categories for behavioral content:
- `situation` - Behavioral guidance (how to act)
- `example` - Few-shot conversations (retrieved via RAG)

### UI Changes
- Entity list grouped by category
- Quick filters by category
- "Situações" gets special UX copy: "Ensine seu agente como agir em situações específicas"

### Backend Changes
- Add `situation` and `example` to `ENTITY_CATEGORIES`
- No migration needed - existing entities keep their category

---

## 2. Neo-Agent Edit Form Revamp

### Current Problems
- Too many fields exposed
- No clear hierarchy
- User doesn't know what's important vs optional
- Guardrails buried in JSON

### Proposed Structure

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
│ │    Violão Yamaha C40, Guitarra Fender, Ukulele...       │ │
│ │ 🎓 Serviços (2)                                         │ │
│ │    Aula de Violão, Manutenção...                        │ │
│ │ 📋 Políticas (1)                                        │ │
│ │    Política de Troca                                    │ │
│ │ 💡 Situações (2)                                        │ │
│ │    Cliente irritado, Negociação de preço                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ OBJETIVOS                                       [+ Objetivo]│
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 1. Qualificar o cliente (nível, interesse)              │ │
│ │ 2. Apresentar produto adequado                          │ │
│ │ 3. Fechar venda ou agendar visita                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ FERRAMENTAS                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [x] Verificar estoque                                   │ │
│ │ [x] Verificar disponibilidade                           │ │
│ │ [x] Agendar compromisso                                 │ │
│ │ [ ] Enviar para atendente (escalação)                   │ │
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

### Key Changes

1. **Progressive disclosure** - Advanced settings collapsed by default
2. **Visual grouping** - Clear sections with icons
3. **Inline entity preview** - See linked entities without navigating away
4. **Tool checkboxes** - Simple enable/disable, not JSON
5. **Guardrails as chips** - Easy to add/remove, not textarea
6. **Escalation builder** - Condition → Message pairs, not raw config

---

## 3. Situações (Behavioral Entities)

### What They Are
Chunks that teach the agent HOW to behave, not WHAT to know.

### Examples

**"Cliente irritado"**
```
Quando o cliente demonstrar frustração ou irritação:
1. Reconheça o sentimento: "Entendo sua frustração"
2. Não seja defensivo
3. Foque na solução, não no problema
4. Se não resolver, ofereça escalar para gerente

Exemplo:
Cliente: "Isso é um absurdo! Comprei há 2 dias e já quebrou!"
Agente: "Entendo sua frustração, isso não deveria acontecer.
Vamos resolver agora - você prefere trocar por outro ou
prefere reembolso?"
```

**"Negociação de preço"**
```
Quando cliente pedir desconto:
1. Primeiro, entenda o contexto (volume? fidelidade?)
2. Nunca dê desconto sem contrapartida
3. Opções: pagamento à vista, combo, indicação
4. Limite máximo: 10% sem aprovação do gerente

Exemplo:
Cliente: "Não dá pra fazer um desconto?"
Agente: "Posso fazer 5% se for pagamento à vista,
ou 10% se levar o case junto. O que acha?"
```

### How They Work
- Created as entities with `type: situation`
- Chunked and embedded like any entity
- Retrieved by RAG when context matches
- Agent sees behavioral guidance in prompt

### UI for Creating Situações
```
┌─────────────────────────────────────────────────────────────┐
│ Nova Situação                                               │
├─────────────────────────────────────────────────────────────┤
│ Nome: [Cliente irritado                ]                    │
│                                                             │
│ Quando usar:                                                │
│ [Quando o cliente demonstra frustração, raiva ou          ] │
│ [insatisfação com produto ou atendimento                  ] │
│                                                             │
│ Como agir:                                                  │
│ [1. Reconheça o sentimento                                ] │
│ [2. Não seja defensivo                                    ] │
│ [3. Foque na solução                                      ] │
│ [4. Escale se necessário                                  ] │
│                                                             │
│ Exemplo de conversa:                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 👤 "Isso é um absurdo! Comprei há 2 dias e quebrou!"    │ │
│ │ 🤖 "Entendo sua frustração. Vamos resolver agora..."    │ │
│ │                                           [+ Mensagem]  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                                    [Cancelar] [Salvar]      │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Few-Shot Examples via RAG

### Current State
Examples removed from pipeline (was `ConversationExample`).

### Proposed
- Create examples as entities with `type: example`
- Tag with relevant context (intent, stage, situation)
- RAG retrieves when semantically relevant
- No hardcoded examples in config

### Benefits
- Examples scale with knowledge base
- Semantic matching, not intent-based
- Users can add/edit without code changes
- Same example can match multiple situations

---

## 5. Analytics Dashboard (Future)

### What We Need
- Conversation success rate
- Common questions/intents
- RAG chunk usage (which chunks help?)
- Escalation rate
- Response validation failures

### Not Now
This is post-launch. Focus on core UX first.

---

## Implementation Priority

| Priority | Item | Effort |
|----------|------|--------|
| 1 | Add `situation`, `example` to ENTITY_CATEGORIES | Trivial |
| 2 | Entity list grouping by category (UI) | Small |
| 3 | Neo-agent edit form revamp | Medium |
| 4 | Situações creation UX | Small |
| 5 | Analytics dashboard | Large (future) |

---

## Clarifications

### Situações vs Guardrails

| Guardrails | Situações |
|------------|-----------|
| Always in prompt | Retrieved via RAG |
| Hard rules | Contextual guidance |
| "Never say X" | "When Y happens, do Z" |
| Static | Semantic match |

**Example:**
- Guardrail: `never_say: "preço de concorrente"` → always enforced
- Situação: "Cliente irritado" → retrieved when customer sounds upset

### Questions to Resolve

1. **Entity creation flow** - Pick category first, or create then categorize?
2. **Tool permissions UI** - Include in agent edit or separate page?
3. **Multi-agent** - How does UI handle multiple agents per business?
