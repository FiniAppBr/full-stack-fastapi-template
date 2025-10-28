# Temporal Python AI Agent Workflow Documentation

Complete guide for implementing your 7-stage Assistant AI workflow using Temporal Python SDK.

## Quick Navigation

### Start Here
1. **[EXPLORATION_SUMMARY.md](./EXPLORATION_SUMMARY.md)** - Overview of findings (5 min read)
2. **[temporal_quick_reference.md](./temporal_quick_reference.md)** - Copy-paste code snippets (10 min to implement)
3. **[temporal_python_ai_patterns.md](./temporal_python_ai_patterns.md)** - Comprehensive guide (30 min read)

---

## What You'll Find

### EXPLORATION_SUMMARY.md
- Key findings from analyzing `/tmp/samples-python/`
- Mapping of your 7 stages to Temporal patterns
- Best practices discovered
- Most valuable sample files to study
- Quick start next steps

**Best for**: Quick overview and understanding the big picture

### temporal_quick_reference.md
- Ready-to-use code snippets
- All 7 stages implemented as activities
- Single-turn workflow example
- Multi-turn workflow example
- Worker and client setup
- File structure template
- Setup and testing commands

**Best for**: Implementation - copy the code and adapt to your needs

### temporal_python_ai_patterns.md
- Detailed patterns for each stage
- Human-in-the-loop patterns (signals, updates, queries)
- Error handling strategies
- State management options
- Complete workflow example with explanations
- Implementation roadmap

**Best for**: Deep understanding and design decisions

---

## Your 7-Stage Workflow

```
[User Input] 
    ↓
1. Intent Classification (activity)
    ↓
2. Knowledge Retrieval (activity) - RAG/Vector DB
    ↓
3. Memory Lookup (activity) - Conversation history
    ↓
4. Response Generation (activity) - LLM call
    ↓
5. Validation (activity) - Quality check
    ↓
6. Tool Execution (activity) - Search, calculate, etc.
    ↓
7. Memory Save (activity) - Store conversation
    ↓
[Response to User]
```

---

## Key Files Referenced from samples-python Repository

### Most Important (Study First)
- `openai_agents/customer_service/workflows/customer_service_workflow.py` - Multi-turn conversation
- `bedrock/signals_and_queries/workflows.py` - Signals, queries, history management
- `openai_agents/basic/workflows/tools_workflow.py` - LLM with tools

### Foundational (Reference)
- `hello/hello_activity.py` - Basic activity pattern
- `hello/hello_exception.py` - Error handling
- `hello/hello_parallel_activity.py` - Parallel execution
- `hello/hello_signal.py` - Signal pattern

---

## Implementation Checklist

### Phase 1: Setup (1 hour)
- [ ] Install Temporal CLI and Python SDK
- [ ] Start Temporal server locally
- [ ] Create project structure
- [ ] Copy models from quick_reference.md

### Phase 2: Activities (2 hours)
- [ ] Implement all 7 stage activities
- [ ] Fill in actual service calls (LLM, vector DB, etc.)
- [ ] Add error handling and logging

### Phase 3: Workflow (1 hour)
- [ ] Create SevenStageAssistantWorkflow
- [ ] Wire up all activities
- [ ] Add logging and metrics

### Phase 4: Test (1 hour)
- [ ] Create worker process
- [ ] Create client starter
- [ ] Test end-to-end

### Phase 5: Multi-Turn (2 hours)
- [ ] Create MultiTurnConversationWorkflow
- [ ] Implement signal handlers
- [ ] Add query endpoints

### Phase 6: Production (1-2 weeks)
- [ ] Add comprehensive error handling
- [ ] Implement monitoring/observability
- [ ] Add authentication/authorization
- [ ] Deploy to staging
- [ ] Load testing
- [ ] Production rollout

---

## Code Structure

Recommended layout:
```
temporal_assistant/
├── models/
│   └── types.py                     # All dataclasses
├── activities/
│   └── ai_activities.py             # All 7 stages
├── workflows/
│   ├── assistant_workflow.py        # Single-turn
│   └── multi_turn_workflow.py       # Multi-turn
├── worker.py                         # Worker process
├── starter.py                        # Single-turn client
├── conversation_client.py            # Multi-turn client
├── requirements.txt
└── README.md
```

---

## Critical Concepts

### 1. Determinism
Workflows must be deterministic - same input always produces same execution path.

### 2. All I/O in Activities
HTTP calls, DB queries, LLM calls - everything goes in activities, not workflows.

### 3. Dataclasses for Messages
Use dataclasses for all inputs/outputs for backward compatibility.

### 4. Always Set Timeouts
Every activity call needs `start_to_close_timeout`.

### 5. Use Signals for External Events
When users send messages during multi-turn, use signals.

---

## Essential Timeouts (Adjust Based on Your Services)

| Component | Timeout | Why |
|-----------|---------|-----|
| Intent classification | 10s | Should be fast (classifier or simple LLM) |
| Knowledge retrieval | 20s | Vector DB search can be slow |
| Memory lookup | 10s | Usually cached |
| Response generation | 30s | LLM calls are slow |
| Validation | 10s | Quick logic check |
| Tool execution | 20-60s | Depends on tool |
| Memory save | 10s | Database write |

---

## Running Your Workflow

```bash
# Terminal 1: Start Temporal server
temporal server start-dev

# Terminal 2: Start worker
python worker.py

# Terminal 3: Run single-turn workflow
python starter.py

# OR: Start multi-turn workflow
python conversation_client.py
```

---

## Key APIs

### Workflow Execution
```python
result = await client.execute_workflow(
    YourWorkflow.run,
    input_data,
    id="unique-id",
    task_queue="your-queue"
)
```

### Activity Execution
```python
result = await workflow.execute_activity(
    your_activity,
    input_params,
    start_to_close_timeout=timedelta(seconds=30)
)
```

### Signal (Async notification)
```python
await handle.signal(YourWorkflow.signal_method, data)
```

### Query (Read state)
```python
state = await handle.query(YourWorkflow.query_method)
```

### Update (Request-response)
```python
result = await handle.update(YourWorkflow.update_method, data)
```

---

## Next Steps

1. **Read EXPLORATION_SUMMARY.md** (5 min)
2. **Copy code from temporal_quick_reference.md** (20 min)
3. **Customize for your services** (1-2 hours)
4. **Test locally** (1 hour)
5. **Study temporal_python_ai_patterns.md** for edge cases (30 min)

---

## Resources

- **GitHub Samples**: https://github.com/temporalio/samples-python
- **Official Docs**: https://docs.temporal.io/develop/python
- **Temporal Python SDK**: https://github.com/temporalio/sdk-python
- **Temporal CLI**: https://docs.temporal.io/cli

---

## Document Sizes

- `EXPLORATION_SUMMARY.md` - 12 KB - Overview and key findings
- `temporal_quick_reference.md` - 15 KB - Code snippets and templates
- `temporal_python_ai_patterns.md` - 22 KB - Comprehensive guide with patterns

**Total**: ~50 KB of documentation with complete implementation guide

---

Last Updated: October 28, 2025

