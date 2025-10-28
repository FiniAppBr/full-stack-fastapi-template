# Temporal Python AI Agent Workflow Patterns Analysis

## Overview

The Temporal Python SDK provides excellent patterns for building AI agent workflows. Based on analysis of the official samples repository (https://github.com/temporalio/samples-python), here are the most relevant patterns for your 7-stage Assistant AI workflow.

---

## 1. MOST RELEVANT EXAMPLES

### A. OpenAI Agents Framework (Best Match for Your Use Case)
**Location**: `/tmp/samples-python/openai_agents/`

This is the **most directly applicable** to your AI agent workflow:

- **`openai_agents/basic/workflows/hello_world_workflow.py`** - Simple LLM agent orchestration
- **`openai_agents/basic/workflows/tools_workflow.py`** - Agent with tool execution capabilities  
- **`openai_agents/agent_patterns/workflows/agents_as_tools_workflow.py`** - Agents calling other agents (orchestration)
- **`openai_agents/agent_patterns/workflows/routing_workflow.py`** - Intent routing to different agents
- **`openai_agents/agent_patterns/workflows/parallelization_workflow.py`** - Run agents in parallel
- **`openai_agents/customer_service/workflows/customer_service_workflow.py`** - Multi-turn conversational workflow with state

**Why relevant**: Uses the OpenAI Agents SDK integrated with Temporal, showing LLM integration patterns.

### B. Bedrock LLM Integration (AWS Alternative)
**Location**: `/tmp/samples-python/bedrock/`

Shows how to integrate AWS Bedrock (another LLM service):

- **`bedrock/basic/workflows.py`** - Simple LLM prompt execution
- **`bedrock/signals_and_queries/workflows.py`** - **BEST FOR YOUR USE CASE** - Multi-turn conversation with signal-based message handling

**Why relevant**: Shows how to call external LLMs and manage conversation state/memory.

### C. LangChain Integration
**Location**: `/tmp/samples-python/langchain/`

Shows LangChain chains orchestrated through Temporal workflows.

### D. Basic Workflow Patterns
**Location**: `/tmp/samples-python/hello/`

Foundational patterns for activities, parallel execution, signals, and error handling.

### E. Message Passing (Human-in-the-Loop)
**Location**: `/tmp/samples-python/message_passing/`

Shows signals, queries, and updates for external communication.

---

## 2. PATTERNS FOR YOUR 7-STAGE WORKFLOW

### Stage 1: Intent Classification
**Pattern**: Single Activity Execution
```python
@activity.defn
async def classify_intent(user_message: str) -> str:
    """Classify user intent using LLM"""
    # Call LLM or rule-based classifier
    return intent_type  # e.g., "query", "command", "help"
```

**Workflow Integration**:
```python
result = await workflow.execute_activity(
    classify_intent,
    user_message,
    start_to_close_timeout=timedelta(seconds=10)
)
```

**Reference**: `/tmp/samples-python/hello/hello_activity.py`

---

### Stage 2: Knowledge Retrieval
**Pattern**: External Service Call Activity
```python
@activity.defn
async def retrieve_knowledge(query: str, intent: str) -> dict:
    """Retrieve relevant knowledge from vector DB or knowledge base"""
    # Call external knowledge service (RAG, vector search, etc)
    return {
        "relevant_docs": [...],
        "context": "...",
        "source": "knowledge_base"
    }
```

**Reference**: `/tmp/samples-python/openai_agents/basic/activities/get_weather_activity.py`

---

### Stage 3: Memory Lookup
**Pattern**: Local Activity or External Service
```python
@activity.defn
async def lookup_memory(user_id: str, session_id: str) -> dict:
    """Look up user memory/context from store"""
    return {
        "previous_context": [...],
        "user_preferences": {...},
        "conversation_history": [...]
    }
```

**Reference**: `/tmp/samples-python/bedrock/signals_and_queries/workflows.py` (lines 90-91 - maintains conversation_history)

---

### Stage 4: Response Generation
**Pattern**: LLM Activity with Tool Use
```python
@activity.defn
async def generate_response(
    prompt: str,
    knowledge: dict,
    memory: dict,
    intent: str
) -> str:
    """Generate response using LLM with context"""
    # Use OpenAI/Bedrock/LangChain to generate response
    return response_text
```

**Using OpenAI Agents SDK**:
```python
from agents import Agent, Runner

agent = Agent(
    name="ResponseGenerator",
    instructions="Generate helpful responses using provided context",
    tools=[...]  # Tools for tool execution
)

result = await Runner.run(agent, input=prompt_with_context)
```

**Reference**: `/tmp/samples-python/openai_agents/basic/workflows/tools_workflow.py`

---

### Stage 5: Validation
**Pattern**: Sequential Activity
```python
@activity.defn
async def validate_response(response: str, intent: str) -> dict:
    """Validate response quality and safety"""
    return {
        "is_valid": bool,
        "issues": [],
        "confidence": 0.95,
        "needs_revision": False
    }
```

**Reference**: `/tmp/samples-python/openai_agents/agent_patterns/workflows/output_guardrails_workflow.py`

---

### Stage 6: Tool Execution
**Pattern**: Parallel Activity Execution
```python
@activity.defn
async def execute_tool(tool_name: str, tool_params: dict) -> str:
    """Execute requested tool (search, calculate, etc)"""
    # Route to appropriate tool handler
    return tool_result
```

**Run in Parallel** (if multiple tools needed):
```python
# Using asyncio.gather for parallel execution
results = await asyncio.gather(
    workflow.execute_activity(tool_activity_1, params1, ...),
    workflow.execute_activity(tool_activity_2, params2, ...),
    workflow.execute_activity(tool_activity_3, params3, ...)
)
```

**Reference**: `/tmp/samples-python/hello/hello_parallel_activity.py` + `/tmp/samples-python/openai_agents/agent_patterns/workflows/parallelization_workflow.py`

---

### Stage 7: Memory Save
**Pattern**: Final Write Activity
```python
@activity.defn
async def save_memory(
    user_id: str,
    session_id: str,
    conversation_turn: dict,
    extracted_context: dict
) -> bool:
    """Save conversation and context to memory store"""
    # Write to database, vector store, etc
    return success
```

**Reference**: Similar to retrieval activities

---

## 3. COMPLETE WORKFLOW EXAMPLE

Here's how to combine all 7 stages:

```python
from dataclasses import dataclass
from datetime import timedelta
from temporalio import activity, workflow
from agents import Agent, Runner

# Input/Output Models
@dataclass
class AssistantInput:
    user_id: str
    session_id: str
    message: str

@dataclass
class StageResult:
    intent: str
    knowledge: dict
    memory: dict
    response: str
    validation: dict
    tools_executed: list
    memory_saved: bool

# Activities
@activity.defn
async def classify_intent(message: str) -> str:
    # LLM or rule-based classification
    return "query"  # example

@activity.defn
async def retrieve_knowledge(query: str) -> dict:
    return {"docs": [], "context": ""}

@activity.defn
async def lookup_memory(user_id: str, session_id: str) -> dict:
    return {"history": []}

@activity.defn
async def generate_response(prompt: str, context: dict) -> str:
    # Could use OpenAI Agents SDK
    return "Here's my response..."

@activity.defn
async def validate_response(response: str) -> dict:
    return {"is_valid": True}

@activity.defn
async def execute_tool(tool_name: str, params: dict) -> str:
    return "tool result"

@activity.defn
async def save_memory(user_id: str, data: dict) -> bool:
    return True

# Workflow
@workflow.defn
class AssistantWorkflow:
    @workflow.run
    async def run(self, input: AssistantInput) -> str:
        # Stage 1: Intent Classification
        intent = await workflow.execute_activity(
            classify_intent,
            input.message,
            start_to_close_timeout=timedelta(seconds=10)
        )
        workflow.logger.info(f"Stage 1 - Intent: {intent}")

        # Stage 2: Knowledge Retrieval
        knowledge = await workflow.execute_activity(
            retrieve_knowledge,
            input.message,
            start_to_close_timeout=timedelta(seconds=15)
        )
        workflow.logger.info(f"Stage 2 - Retrieved {len(knowledge['docs'])} documents")

        # Stage 3: Memory Lookup
        memory = await workflow.execute_activity(
            lookup_memory,
            input.user_id,
            input.session_id,
            start_to_close_timeout=timedelta(seconds=10)
        )
        workflow.logger.info(f"Stage 3 - Retrieved memory with {len(memory['history'])} turns")

        # Stage 4: Response Generation
        context = {
            "intent": intent,
            "knowledge": knowledge,
            "memory": memory,
            "message": input.message
        }
        response = await workflow.execute_activity(
            generate_response,
            str(context),
            start_to_close_timeout=timedelta(seconds=20)
        )
        workflow.logger.info(f"Stage 4 - Generated response: {response[:100]}...")

        # Stage 5: Validation
        validation = await workflow.execute_activity(
            validate_response,
            response,
            start_to_close_timeout=timedelta(seconds=10)
        )
        workflow.logger.info(f"Stage 5 - Validation result: {validation['is_valid']}")

        # Stage 6: Tool Execution (if needed)
        tools_executed = []
        if validation.get("needs_tool_execution"):
            tool_result = await workflow.execute_activity(
                execute_tool,
                "search_tool",
                {"query": input.message},
                start_to_close_timeout=timedelta(seconds=30)
            )
            tools_executed.append(tool_result)
            workflow.logger.info(f"Stage 6 - Tool executed")

        # Stage 7: Memory Save
        memory_saved = await workflow.execute_activity(
            save_memory,
            input.user_id,
            {
                "session_id": input.session_id,
                "message": input.message,
                "response": response,
                "intent": intent
            },
            start_to_close_timeout=timedelta(seconds=10)
        )
        workflow.logger.info(f"Stage 7 - Memory saved: {memory_saved}")

        return response
```

---

## 4. HUMAN-IN-THE-LOOP PATTERNS

### Pattern A: Signals (Async)
For receiving external input while workflow is running:

```python
@workflow.defn
class InteractiveAssistant:
    def __init__(self):
        self.feedback_queue = asyncio.Queue()
        self.chat_complete = False

    @workflow.run
    async def run(self) -> str:
        # Wait for feedback or timeout
        try:
            await workflow.wait_condition(
                lambda: not self.feedback_queue.empty() or self.chat_complete,
                timeout=timedelta(minutes=30)
            )
        except asyncio.TimeoutError:
            return "Conversation timed out"
        
        while not self.feedback_queue.empty():
            feedback = self.feedback_queue.get_nowait()
            # Process feedback
            
        return "completed"

    @workflow.signal
    async def send_feedback(self, feedback: str) -> None:
        await self.feedback_queue.put(feedback)

    @workflow.signal
    def complete_chat(self) -> None:
        self.chat_complete = True

    @workflow.query
    def get_status(self) -> str:
        return "waiting for input"
```

**Reference**: `/tmp/samples-python/hello/hello_signal.py` and `/tmp/samples-python/bedrock/signals_and_queries/workflows.py`

### Pattern B: Updates (Sync with Response)
For request-response interactions:

```python
@workflow.update
async def process_user_input(self, user_input: str) -> str:
    # Process immediately and return result
    response = await Runner.run(agent, user_input)
    return response.final_output

@workflow.update.validator
def validate_input(self, user_input: str) -> None:
    if not user_input or len(user_input) > 1000:
        raise ValueError("Invalid input")
```

**Reference**: `/tmp/samples-python/openai_agents/customer_service/workflows/customer_service_workflow.py`

### Pattern C: Queries (Read-Only)
For inspecting workflow state:

```python
@workflow.query
def get_conversation_history(self) -> List[str]:
    return self.conversation_history

@workflow.query
def get_current_state(self) -> str:
    return f"Processing: {self.current_stage}"
```

**Reference**: `/tmp/samples-python/bedrock/signals_and_queries/workflows.py` (lines 81-87)

---

## 5. ERROR HANDLING PATTERNS

### Retry Policy
```python
from temporalio.common import RetryPolicy

result = await workflow.execute_activity(
    my_activity,
    params,
    start_to_close_timeout=timedelta(seconds=30),
    retry_policy=RetryPolicy(
        initial_interval=timedelta(seconds=1),
        backoff_coefficient=2.0,
        maximum_attempts=3,
        maximum_interval=timedelta(seconds=60)
    )
)
```

### Exception Handling
```python
from temporalio.exceptions import ApplicationError

try:
    result = await workflow.execute_activity(...)
except ApplicationError as e:
    workflow.logger.error(f"Activity failed: {e}")
    # Fallback logic
    result = default_value
```

**Reference**: `/tmp/samples-python/hello/hello_exception.py`

---

## 6. STATE MANAGEMENT PATTERNS

### Pattern A: Workflow Instance Variables
```python
@workflow.defn
class StatefulWorkflow:
    def __init__(self):
        self.conversation_history = []
        self.current_intent = None
        self.user_context = {}
    
    @workflow.run
    async def run(self, input: str) -> str:
        self.current_intent = await workflow.execute_activity(...)
        self.conversation_history.append(input)
        return "response"
```

### Pattern B: Continue-as-New (For Long-Running Workflows)
```python
@workflow.defn
class LongRunningAssistant:
    def __init__(self, state: WorkflowState | None = None):
        self.conversation_history = state.history if state else []
        self.user_id = state.user_id if state else None
    
    @workflow.run
    async def run(self, state: WorkflowState | None = None):
        # Do work...
        
        # When workflow gets too long, continue as new
        if workflow.info().is_continue_as_new_suggested():
            workflow.continue_as_new(
                WorkflowState(
                    history=self.conversation_history,
                    user_id=self.user_id
                )
            )
```

**Reference**: `/tmp/samples-python/openai_agents/customer_service/workflows/customer_service_workflow.py` (lines 59-74)

---

## 7. QUICK START: YOUR FIRST WORKFLOW

### Step 1: Set Up Project Structure
```
your_project/
├── workflows/
│   ├── __init__.py
│   └── assistant_workflow.py
├── activities/
│   ├── __init__.py
│   ├── intent_activity.py
│   ├── knowledge_activity.py
│   ├── memory_activity.py
│   ├── generation_activity.py
│   ├── validation_activity.py
│   ├── tool_activity.py
│   └── save_activity.py
├── models/
│   └── types.py
├── worker.py
└── starter.py
```

### Step 2: Define Models (`models/types.py`)
```python
from dataclasses import dataclass

@dataclass
class AssistantInput:
    user_id: str
    session_id: str
    message: str

@dataclass
class WorkflowResult:
    response: str
    intent: str
    tools_used: list
    success: bool
```

### Step 3: Create Activities
```python
# activities/intent_activity.py
from temporalio import activity

@activity.defn
async def classify_intent(message: str) -> str:
    # Simple intent classification
    if "?" in message:
        return "query"
    elif "do" in message.lower():
        return "command"
    return "statement"
```

### Step 4: Create Workflow
```python
# workflows/assistant_workflow.py
from dataclasses import dataclass
from datetime import timedelta
from temporalio import workflow

from activities.intent_activity import classify_intent
from activities.knowledge_activity import retrieve_knowledge
from models.types import AssistantInput, WorkflowResult

@workflow.defn
class AssistantWorkflow:
    @workflow.run
    async def run(self, input: AssistantInput) -> str:
        # Stage 1: Intent
        intent = await workflow.execute_activity(
            classify_intent,
            input.message,
            start_to_close_timeout=timedelta(seconds=10)
        )
        
        # Stage 2: Knowledge
        knowledge = await workflow.execute_activity(
            retrieve_knowledge,
            input.message,
            start_to_close_timeout=timedelta(seconds=10)
        )
        
        return f"Intent: {intent}, Knowledge: {knowledge}"
```

### Step 5: Create Worker
```python
# worker.py
import asyncio
from temporalio.client import Client
from temporalio.worker import Worker

from workflows.assistant_workflow import AssistantWorkflow
from activities.intent_activity import classify_intent
from activities.knowledge_activity import retrieve_knowledge

async def main():
    client = await Client.connect("localhost:7233")
    
    worker = Worker(
        client,
        task_queue="assistant-task-queue",
        workflows=[AssistantWorkflow],
        activities=[classify_intent, retrieve_knowledge],
    )
    
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main())
```

### Step 6: Create Starter
```python
# starter.py
import asyncio
from temporalio.client import Client

from workflows.assistant_workflow import AssistantWorkflow
from models.types import AssistantInput

async def main():
    client = await Client.connect("localhost:7233")
    
    input = AssistantInput(
        user_id="user123",
        session_id="session456",
        message="What is the weather?"
    )
    
    result = await client.execute_workflow(
        AssistantWorkflow.run,
        input,
        id="my-workflow-123",
        task_queue="assistant-task-queue",
    )
    
    print(f"Result: {result}")

if __name__ == "__main__":
    asyncio.run(main())
```

### Step 7: Run It
```bash
# Terminal 1: Start worker
python worker.py

# Terminal 2: Start workflow
python starter.py
```

---

## 8. KEY TEMPORAL CONCEPTS FOR AI WORKFLOWS

### 1. Determinism Requirement
- Workflows must be **deterministic** and **side-effect free**
- All I/O must happen in activities
- Cannot make HTTP calls directly in workflow code
- Use `workflow.unsafe.imports_passed_through()` carefully

### 2. Activities Are the Workhorses
- All external calls (LLM, database, API) go here
- Can retry, timeout, heartbeat
- Don't put long computation here if it needs to be resumed
- Better to do complex logic in activities than workflows

### 3. Dataclasses for Messages
```python
@dataclass
class ActivityInput:
    field1: str
    field2: int
    # Fields can be added in future (backward compatible)
```

### 4. Timeouts Are Essential
```python
# Always set these for activities
start_to_close_timeout=timedelta(seconds=30)  # Total time activity can take
schedule_to_close_timeout=timedelta(seconds=60)  # From scheduled to closed
```

### 5. Parallelism via asyncio.gather()
```python
results = await asyncio.gather(
    workflow.execute_activity(activity1, param1, ...),
    workflow.execute_activity(activity2, param2, ...),
)
```

---

## 9. COMPARISON: SIGNALS vs UPDATES vs QUERIES

| Feature | Signal | Update | Query |
|---------|--------|--------|-------|
| **Purpose** | Async notification | Sync request-response | Read state |
| **Waits for Response** | No | Yes | No |
| **Can Modify State** | Yes | Yes | No |
| **Use Case** | External event notification | User input/feedback | Status/history check |
| **Example** | "User sent feedback" | "Process this input" | "What's the history?" |

---

## 10. RESOURCE LINKS

### Official Examples
- **Temporal Python SDK**: https://github.com/temporalio/sdk-python
- **Samples Repository**: https://github.com/temporalio/samples-python
- **Documentation**: https://docs.temporal.io/develop/python

### Most Relevant Sample Files
- Basic workflow: `/tmp/samples-python/hello/hello_activity.py`
- Error handling: `/tmp/samples-python/hello/hello_exception.py`
- Parallel activities: `/tmp/samples-python/hello/hello_parallel_activity.py`
- Signals/Queries: `/tmp/samples-python/bedrock/signals_and_queries/workflows.py`
- OpenAI integration: `/tmp/samples-python/openai_agents/basic/workflows/tools_workflow.py`
- Multi-turn conversation: `/tmp/samples-python/openai_agents/customer_service/workflows/customer_service_workflow.py`
- LangChain integration: `/tmp/samples-python/langchain/workflow.py`

---

## 11. IMPLEMENTATION ROADMAP FOR YOUR PROJECT

### Phase 1: Basic Pipeline (Week 1)
- [ ] Set up Temporal locally
- [ ] Implement stages 1, 2, 4 (Intent, Knowledge, Generation)
- [ ] Create basic workflow
- [ ] Test with simple flows

### Phase 2: Complete Pipeline (Week 2)
- [ ] Add stages 3, 5, 7 (Memory, Validation, Save)
- [ ] Implement error handling
- [ ] Add basic tool execution

### Phase 3: Interactive Features (Week 3)
- [ ] Add signals for user feedback
- [ ] Implement human-in-the-loop validation
- [ ] Add queries for history/state inspection

### Phase 4: Advanced Features (Week 4)
- [ ] Multi-agent orchestration (agents-as-tools pattern)
- [ ] Parallel tool execution
- [ ] Conversation memory with continue-as-new

---

## SUMMARY

For your 7-stage Assistant AI workflow, **focus on**:

1. **OpenAI Agents Framework** - Use the `Agent` + `Runner` pattern for LLM interactions
2. **Sequential Activities** - Chain your 7 stages with proper dataclasses for state passing
3. **Bedrock Signals/Queries** - Adopt the signal pattern for multi-turn conversations
4. **Error Handling** - Use `RetryPolicy` and exception handling for robustness
5. **Continue-as-New** - For long-running conversations (when workflow gets "too old")

The key insight is: **Workflows orchestrate**, **Activities do the work**. Keep your workflow clean and state-passing explicit with dataclasses.

