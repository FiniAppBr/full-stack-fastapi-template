# Compact Instructions for ConnectAI Session

**Context:** We've finalized the knowledge service architecture and verified all critical tech is installed. Ready to build barebones test.

## What We Decided

### Knowledge Service (Manager AI - processes uploaded files)
**Stack:** Docling → CrewAI → Temporal → PostgreSQL + pgvector

**Pipeline (6 steps, 8-10 seconds):**
1. Extract: Docling (PDF/DOCX/Excel → text+tables)
2. Detect Structure: CrewAI Agent 1 (Instructor + GPT-4o-mini)
3. Normalize: CrewAI Agent 2 (ftfy + clean-text, runs parallel with step 2)
4. Check Conflicts: CrewAI Agent 3 (DeepDiff + PostgreSQL) → Temporal PAUSES if conflicts
5. Generate NL Variants: CrewAI Agent 4 (Instructor + GPT-4o-mini)
6. Store: Docling HierarchicalChunker + PostgreSQL chunks

**Key:** CrewAI does parallel processing (steps 2+3), Temporal handles pause/resume for conflict resolution

**Cost:** $0.0006/file, removed validation step (redundant)

### Assistant AI (Customer-facing agent on WhatsApp)
**Stack:** Temporal → Gemini Flash 2.0/2.5 → pgvector → Mem0 → LangChain Tools

**Pipeline (7 stages, 2-5 seconds per message):**
1. Intent Classification: Gemini Flash 2.0 (FREE) → structured intent
2. Knowledge Retrieval: pgvector semantic search → top 3 chunks (v0.1: PostgreSQL full-text)
3. Memory Lookup: Mem0 → customer preferences/history (optional v0.3+)
4. Response Generation: Gemini Flash 2.5 → uses intent + knowledge + personality + memory
5. Guardrails: Validate response matches personality block (v0.2+)
6. Action Execution: LangChain tools (booking, payments, etc.) if needed
7. Memory Save: Persist to Mem0 + analytics (async)

**Key:** NOT a single AI call - orchestrated workflow with multi-model routing (90% FREE via Gemini)

**Cost:** ~$0 (v0.1 FREE tier), ~$0.02 per 20-turn conversation (v1.0)

## Tech Verified Installed
- ✅ temporalio (1.18.1)
- ✅ instructor (1.11.3)
- ✅ openai (1.109.1)
- ✅ pgvector (0.6.0) in PostgreSQL
- ✅ Temporal CLI

**Ports:**
- Backend: 5460
- Frontend: 5459
- Temporal server: 5461
- Temporal UI: 5462

## Next Steps (Barebones Test)
1. Create simple Temporal workflow with 3 activities:
   - Classify intent (Instructor)
   - Search knowledge (pgvector full-text)
   - Generate response (GPT-4o-mini)
2. Test with hardcoded "How much is a haircut?" → retrieve pricing → respond
3. Validate: Temporal orchestration + structured outputs + knowledge retrieval works

**Goal:** Prove core architecture in ~1 hour before building full system

## Key Files Updated
- `/opt/connectai/docs/knowledge-service-overview.txt` - Updated with CrewAI, 6 steps, Gemini Flash
- `/opt/connectai/docs/good-planning/making-the-agent-good.txt` - Updated with 7-stage assistant architecture
- `/opt/connectai/docs/crewai-implementation-steps-2-6.txt` - Full CrewAI code examples
- `/opt/connectai/docs/agent-swarm-frameworks-research.txt` - Research on CrewAI/AutoGen/LangGraph

## Important Decisions Made
- ✅ Validation step removed (Pydantic validates in step 2, normalization cleans, conflicts catch issues)
- ✅ CrewAI chosen over manual orchestration (39.8k stars, parallel execution, role-based)
- ✅ Gemini Flash 2.0/2.5 for assistant (mostly FREE vs GPT-4 expensive)
- ✅ Hybrid approach: CrewAI for speed, Temporal for pause/resume
- ✅ Start v0.1 with keyword search (70% accuracy target), upgrade to semantic if needed

## Brutal Honesty Received
- Risk: Over-engineering before proving users want it
- Focus: Ship dumb MVP Week 1, iterate based on real usage
- Stack is beautiful but don't spend 3 months on "perfect architecture"
- Get 5 businesses using ugly-but-working version, fix what breaks

## What to Remember
- Manager AI (knowledge processing) ≠ Assistant AI (customer conversations)
- Manager uses CrewAI for parallel agent tasks
- Assistant uses Temporal for multi-turn conversation state
- Both use Temporal, but for different reasons (CrewAI wrapper vs conversation orchestration)
- LangGraph considered for future "super manager" that coordinates everything
