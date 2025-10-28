# Temporal Python AI Agent Workflow - Exploration Summary

## Repository Analyzed
- **GitHub**: https://github.com/temporalio/samples-python
- **Cloned to**: `/tmp/samples-python/`
- **Analysis Date**: 2025-10-28

---

## KEY FINDINGS

### 1. Perfect Match: OpenAI Agents Framework Integration

The Temporal Python samples include **dedicated OpenAI Agents SDK integration** with multiple examples:

- **Location**: `/tmp/samples-python/openai_agents/`
- **Most Relevant Files**:
  - `/tmp/samples-python/openai_agents/basic/workflows/hello_world_workflow.py` - LLM agent orchestration pattern
  - `/tmp/samples-python/openai_agents/basic/workflows/tools_workflow.py` - Agents with tool execution
  - `/tmp/samples-python/openai_agents/agent_patterns/workflows/agents_as_tools_workflow.py` - Multi-agent orchestration (agents calling agents)
  - `/tmp/samples-python/openai_agents/agent_patterns/workflows/routing_workflow.py` - Intent-based agent routing
  - `/tmp/samples-python/openai_agents/customer_service/workflows/customer_service_workflow.py` - **MOST RELEVANT** - Multi-turn conversation with state management

### 2. Alternative: Bedrock LLM Integration

For AWS-based deployments:

- **Location**: `/tmp/samples-python/bedrock/`
- **Key Pattern**: `/tmp/samples-python/bedrock/signals_and_queries/workflows.py`
  - Shows conversation history management
  - Uses signals for incoming user messages
  - Uses queries to retrieve conversation state
  - Perfect for multi-turn assistant workflows

### 3. Foundational Patterns

Basic workflow patterns for reference:

- **Basic Activity**: `/tmp/samples-python/hello/hello_activity.py`
- **Error Handling**: `/tmp/samples-python/hello/hello_exception.py`
- **Parallel Execution**: `/tmp/samples-python/hello/hello_parallel_activity.py`
- **Signals & Queries**: `/tmp/samples-python/hello/hello_signal.py`
- **Message Passing**: `/tmp/samples-python/message_passing/` (signals, updates, queries)

### 4. LangChain Integration

Show how to use LangChain chains with Temporal:

- **Location**: `/tmp/samples-python/langchain/workflow.py`
- Shows parallel activity execution and child workflows

---

## MAPPING TO YOUR 7-STAGE WORKFLOW

| Stage | Pattern | Example File | Implementation |
|-------|---------|--------------|-----------------|
| **1. Intent Classification** | Single Activity | `hello_activity.py` | Async activity returning intent type |
| **2. Knowledge Retrieval** | Activity with External Call | `get_weather_activity.py` | Activity calling vector DB/RAG |
| **3. Memory Lookup** | Activity with Query | `bedrock/.../workflows.py` | Activity querying memory store |
| **4. Response Generation** | LLM Activity | `tools_workflow.py` | Using OpenAI Agents SDK or direct LLM |
| **5. Validation** | Activity with Logic | `output_guardrails_workflow.py` | Validation activity |
| **6. Tool Execution** | Parallel Activities | `hello_parallel_activity.py` | Multiple tools via asyncio.gather() |
| **7. Memory Save** | Write Activity | Similar to #3 | Activity writing to database |

---

## CODE SNIPPETS FROM SAMPLES

### Pattern 1: Simple LLM Activity
From `/tmp/samples-python/openai_agents/basic/workflows/hello_world_workflow.py`:
```python
@workflow.defn
class HelloWorldAgent:
    @workflow.run
    async def run(self, prompt: str) -> str:
        agent = Agent(
            name="Assistant",
            instructions="You only respond in haikus.",
        )
        result = await Runner.run(agent, input=prompt)
        return result.final_output
```

### Pattern 2: Agent with Tools
From `/tmp/samples-python/openai_agents/basic/workflows/tools_workflow.py`:
```python
@workflow.defn
class ToolsWorkflow:
    @workflow.run
    async def run(self, question: str) -> str:
        agent = Agent(
            name="Hello world",
            instructions="You are a helpful agent.",
            tools=[
                temporal_agents.workflow.activity_as_tool(
                    get_weather,
                    start_to_close_timeout=timedelta(seconds=10)
                )
            ],
        )
        result = await Runner.run(agent, input=question)
        return result.final_output
```

### Pattern 3: Multi-Turn Conversation with Signals
From `/tmp/samples-python/bedrock/signals_and_queries/workflows.py`:
```python
@workflow.defn
class SignalQueryBedrockWorkflow:
    def __init__(self):
        self.conversation_history = []
        self.prompt_queue = deque()

    @workflow.run
    async def run(self, inactivity_timeout_minutes: int) -> str:
        while True:
            try:
                await workflow.wait_condition(
                    lambda: bool(self.prompt_queue),
                    timeout=timedelta(minutes=inactivity_timeout_minutes),
                )
            except asyncio.TimeoutError:
                break
            
            while self.prompt_queue:
                prompt = self.prompt_queue.popleft()
                response = await workflow.execute_activity_method(
                    BedrockActivities.prompt_bedrock,
                    prompt,
                    schedule_to_close_timeout=timedelta(seconds=20),
                )
                self.conversation_history.append(("response", response))

    @workflow.signal
    async def user_prompt(self, prompt: str) -> None:
        self.prompt_queue.append(prompt)

    @workflow.query
    def get_conversation_history(self) -> List[Tuple[str, str]]:
        return self.conversation_history
```

### Pattern 4: Parallel Execution
From `/tmp/samples-python/hello/hello_parallel_activity.py`:
```python
@workflow.defn
class SayHelloWorkflow:
    @workflow.run
    async def run(self) -> List[str]:
        results = await asyncio.gather(
            workflow.execute_activity(
                say_hello_activity, "user1", start_to_close_timeout=timedelta(seconds=5)
            ),
            workflow.execute_activity(
                say_hello_activity, "user2", start_to_close_timeout=timedelta(seconds=5)
            ),
        )
        return list(sorted(results))
```

### Pattern 5: Error Handling with Retry
From `/tmp/samples-python/hello/hello_exception.py`:
```python
result = await workflow.execute_activity(
    compose_greeting,
    ComposeGreetingInput("Hello", name),
    start_to_close_timeout=timedelta(seconds=10),
    retry_policy=RetryPolicy(maximum_attempts=2),
)
```

---

## BEST PRACTICES DISCOVERED

### 1. Use Dataclasses for All Messages
```python
@dataclass
class ActivityInput:
    field1: str
    field2: int
```
Why: Backward compatible when adding new fields

### 2. Always Set Timeouts
```python
start_to_close_timeout=timedelta(seconds=30)
schedule_to_close_timeout=timedelta(seconds=60)
```
Why: Prevents hanging activities

### 3. Keep Workflows Deterministic
- All I/O must be in activities
- No direct HTTP calls in workflow code
- Use `workflow.unsafe.imports_passed_through()` sparingly

### 4. Use Signals for Async External Events
- Signals = fire-and-forget
- Updates = request-response (newer)
- Queries = read-only state inspection

### 5. Sequential vs Parallel
- Sequential: Simple chain with `await`
- Parallel: Use `asyncio.gather()` for multiple activities

### 6. State Management Options
- **Option A**: Instance variables in `__init__`
- **Option B**: Continue-as-new for long-running workflows

---

## FILES PROVIDED IN THIS EXPLORATION

1. **`/opt/connectai/docs/temporal_python_ai_patterns.md`**
   - Comprehensive guide with all 7 stages
   - Human-in-the-loop patterns
   - Error handling
   - State management
   - Complete workflow example
   - Quick start guide

2. **`/opt/connectai/docs/temporal_quick_reference.md`**
   - Copy-paste ready code snippets
   - All dataclass definitions
   - Complete activities implementation
   - Single-turn and multi-turn workflows
   - Worker and client setup
   - Project structure template
   - Setup commands
   - Timeout guidelines

---

## QUICK START FOR YOUR PROJECT

### Immediate Next Steps (1-2 hours)

1. **Clone the workflow structure**:
   ```
   your_project/
   ├── models/types.py            # Copy from quick_reference.md
   ├── activities/ai_activities.py # Copy from quick_reference.md
   ├── workflows/assistant_workflow.py # Copy from quick_reference.md
   ├── worker.py                   # Copy from quick_reference.md
   └── starter.py                  # Copy from quick_reference.md
   ```

2. **Fill in actual implementations**:
   - `stage_1_classify_intent()` - Add your LLM or classifier
   - `stage_2_retrieve_knowledge()` - Add your RAG/vector DB call
   - `stage_3_lookup_memory()` - Add your memory store query
   - `stage_4_generate_response()` - Add your LLM call
   - `stage_5_validate_response()` - Add your validation logic
   - `stage_6_execute_tool()` - Add your tool handlers
   - `stage_7_save_memory()` - Add your storage write

3. **Test it**:
   ```bash
   temporal server start-dev
   python worker.py
   python starter.py
   ```

---

## MOST VALUABLE SAMPLE FILES TO STUDY

**Ranked by relevance to your use case**:

1. **`/tmp/samples-python/openai_agents/customer_service/workflows/customer_service_workflow.py`** (HIGHEST PRIORITY)
   - Multi-turn conversation management
   - State persistence
   - Proper message handling
   - Your workflow should look similar

2. **`/tmp/samples-python/bedrock/signals_and_queries/workflows.py`**
   - Conversation history management
   - Signal-based input handling
   - Query for state inspection
   - Timeout handling

3. **`/tmp/samples-python/openai_agents/basic/workflows/tools_workflow.py`**
   - LLM integration with tools
   - Simple agent orchestration
   - Good for learning the pattern

4. **`/tmp/samples-python/hello/hello_parallel_activity.py`**
   - How to run multiple activities in parallel
   - For Stage 6 (tool execution)

5. **`/tmp/samples-python/hello/hello_exception.py`**
   - Error handling and retry policy
   - Exception propagation

---

## KEY INSIGHTS FOR YOUR ARCHITECTURE

### 1. The 7-Stage Flow is Natural for Temporal
- Each stage = one activity
- Output of stage N = input to stage N+1
- Perfect for orchestration workflow pattern

### 2. Use OpenAI Agents SDK for LLM Stages
- Built-in integration with Temporal
- Handles tool execution automatically
- Great for complex prompting

### 3. Multi-Turn Conversation Pattern
- Use signals to receive user messages
- Use queries to retrieve history
- Use continue-as-new for long conversations

### 4. Memory/State Strategy
- Store conversation history in workflow instance variable
- Periodically save to external DB (activity)
- Use continue-as-new if conversation gets very long

### 5. Error Handling
- Wrap critical activities with retry policies
- Catch exceptions and provide fallbacks
- Log heavily for debugging

---

## RESOURCES

- **GitHub Repo**: https://github.com/temporalio/samples-python
- **Official Docs**: https://docs.temporal.io/develop/python
- **SDK Reference**: https://github.com/temporalio/sdk-python
- **Temporal CLI**: https://docs.temporal.io/cli#install

---

## SUMMARY

The Temporal Python samples repository contains **excellent examples** for building AI agent workflows:

- OpenAI Agents SDK integration is production-ready
- Multi-turn conversation patterns are well-documented
- Sequential + parallel activity patterns are clear
- Error handling and retry strategies are shown
- State management approaches are flexible

Your 7-stage workflow maps naturally to Temporal's activity pattern. The key is:

1. Keep workflows **orchestrating** (not doing the work)
2. Put all business logic in **activities**
3. Use **dataclasses** for all message types
4. Set **timeouts** on every activity call
5. Use **signals** for external events
6. Use **queries** for state inspection

All code snippets are provided in the quick reference guide. You can start implementing immediately.

