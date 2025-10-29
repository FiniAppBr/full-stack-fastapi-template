# Compact Instructions for ConnectAI Session

**Status:** ✅ Assistant AI is LIVE and working via API + Frontend UI

## What We Built Today

### Assistant AI (Customer-facing WhatsApp agent)
**Stack:** Temporal + OpenAI Agents SDK + OpenAI (gpt-4o-mini for now)

**Current Implementation (3-agent barebones test):**
1. Intent Classification → gpt-4o-mini
2. Knowledge Retrieval → Hardcoded test data (R$60 small dog bath, R$85 large)
3. Response Generation → gpt-4o-mini → Portuguese responses

**Architecture:**
- `/opt/connectai/backend/app/agents/workflows/assistant_workflow.py` - 3-agent Temporal workflow
- `/opt/connectai/backend/app/agents/worker.py` - Temporal worker with OpenAI Agents plugin
- `/opt/connectai/backend/app/agents/model_provider.py` - Custom provider (OpenRouter ready, using OpenAI now)
- `/opt/connectai/backend/app/services/agent_service.py` - Service layer
- `/opt/connectai/backend/app/api/routes/agent.py` - API endpoint

**API Endpoint:** `POST /api/v1/agent/message`
```json
{
  "customer_id": "string",
  "message": "string",
  "agent_id": "string"
}
```

**Frontend UI:** Agent Builder → "Teste" tab (third tab)
- Component: `/opt/connectai/frontend/src/sections/builder/agent-test-chat.jsx`
- Calls live API, shows real Assistant AI responses
- URL: http://195.35.43.23:5459/builder/agent-builder

**Systemctl Services:**
- `connectai-temporal` - Temporal server (port 5461, UI 5462)
- `connectai-worker` - Temporal worker (executes workflows)
- `connectai-backend` - FastAPI (port 5460)
- `connectai-frontend` - React (port 5459)

## Tech Verified Working
- ✅ Temporal (1.18.1) orchestrates workflows
- ✅ OpenAI Agents SDK (0.3.2) creates durable agents
- ✅ OpenAIAgentsPlugin auto-wraps agent.run() as Activities
- ✅ gpt-4o-mini for LLM calls (can switch to Gemini via OpenRouter)
- ✅ API endpoint responds in ~5-6 seconds
- ✅ Frontend chat UI connected to live agent

## Key Learnings
1. **OpenAI Agents SDK + Temporal Integration:**
   - Must add `OpenAIAgentsPlugin()` to both client AND worker
   - Agents defined in workflow run as Activities automatically
   - No need to instantiate OpenAI client in workflow (plugin handles it)
   - Custom `ModelProvider` allows routing to OpenRouter/Gemini

2. **Workflow Sandbox Restrictions:**
   - Cannot use `os.getenv()` in workflows (determinism)
   - Cannot instantiate HTTP clients in workflows
   - All I/O must happen in Activities or via plugin

3. **Model Switching:**
   - Currently using gpt-4o-mini (works)
   - OpenRouter model names need validation (google/gemini-2.0-flash-exp didn't work)
   - Custom provider in `/opt/connectai/backend/app/agents/model_provider.py` ready for Gemini

## Next Steps (Ready to Continue)

### Immediate Improvements:
1. **Switch to Gemini** - Find correct OpenRouter model name, update model_provider.py
2. **Real Knowledge Retrieval** - Replace hardcoded data with pgvector semantic search
3. **Add Mem0** - Persistent customer memory across conversations
4. **Expand to 7 agents:**
   - Add Guardrails Agent (validate response)
   - Add Tool Executor Agent (bookings, payments via LangChain)
   - Add Memory Saver Agent (async save to Mem0)

### Manager AI (Knowledge Processing):
- Not built yet - will use CrewAI + Temporal + Docling
- Architecture planned in `/opt/connectai/docs/knowledge-service-overview.txt`
- 6 steps: Extract → Detect Structure → Normalize → Check Conflicts → Generate NL Variants → Store

## Important Files
**Backend:**
- Workflow: `app/agents/workflows/assistant_workflow.py`
- Worker: `app/agents/worker.py`
- Model Provider: `app/agents/model_provider.py`
- Service: `app/services/agent_service.py`
- API: `app/api/routes/agent.py`

**Frontend:**
- Test Chat: `src/sections/builder/agent-test-chat.jsx`
- Builder View: `src/sections/builder/builder-view.jsx`

**Systemd:**
- `/etc/systemd/system/connectai-temporal.service`
- `/etc/systemd/system/connectai-worker.service`

**Ports:**
- Backend: 5460
- Frontend: 5459
- Temporal: 5461
- Temporal UI: 5462

## Key Commands
```bash
# Restart services
systemctl restart connectai-temporal connectai-worker connectai-backend

# Check logs
journalctl -u connectai-worker -f
tail -f /var/log/connectai-worker.log

# Test API
curl -X POST http://localhost:5460/api/v1/agent/message \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"test","message":"Quanto custa?","agent_id":"test"}'
```

## Environment Variables (.env)
```
OPENAI_API_KEY=sk-proj-... (working)
OPENROUTER_API_KEY=sk-or-v1-... (ready, not used yet)
```

## Current Todo List Status
All setup tasks completed! Ready for feature expansion.
