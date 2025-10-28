# Temporal Python AI Workflow - Quick Reference Guide

## Essential Code Snippets for Your 7-Stage Workflow

### 1. Activity Input/Output Models
```python
from dataclasses import dataclass
from typing import List, Dict, Any

@dataclass
class AssistantInput:
    """Initial workflow input"""
    user_id: str
    session_id: str
    message: str

@dataclass
class IntentResult:
    intent: str
    confidence: float

@dataclass
class KnowledgeResult:
    documents: List[str]
    context: str
    sources: List[str]

@dataclass
class MemoryResult:
    history: List[Dict[str, str]]
    user_profile: Dict[str, Any]
    recent_topics: List[str]

@dataclass
class ValidationResult:
    is_valid: bool
    confidence: float
    issues: List[str]
    needs_revision: bool
    needs_tool_execution: bool
```

### 2. All 7 Activities in One File
```python
# activities/ai_activities.py
from dataclasses import dataclass
from datetime import timedelta
from temporalio import activity
import json

@activity.defn
async def stage_1_classify_intent(message: str) -> IntentResult:
    """Stage 1: Intent Classification"""
    # Could use LLM, rule-based, or ML classifier
    intent = "query" if "?" in message else "command"
    return IntentResult(intent=intent, confidence=0.95)

@activity.defn
async def stage_2_retrieve_knowledge(
    query: str, intent: str
) -> KnowledgeResult:
    """Stage 2: Knowledge Retrieval (RAG)"""
    # Call vector DB, knowledge base, etc.
    # Simulate retrieval
    return KnowledgeResult(
        documents=["Doc 1", "Doc 2"],
        context="Retrieved context for the query",
        sources=["db1", "db2"]
    )

@activity.defn
async def stage_3_lookup_memory(
    user_id: str, session_id: str
) -> MemoryResult:
    """Stage 3: Memory Lookup"""
    # Query conversation memory
    return MemoryResult(
        history=[
            {"role": "user", "content": "previous message"},
            {"role": "assistant", "content": "previous response"}
        ],
        user_profile={"name": "User", "preferences": {}},
        recent_topics=["topic1", "topic2"]
    )

@activity.defn
async def stage_4_generate_response(
    message: str,
    intent: str,
    knowledge: KnowledgeResult,
    memory: MemoryResult
) -> str:
    """Stage 4: Response Generation"""
    # Build context and call LLM
    context = f"""
    Intent: {intent}
    Knowledge: {knowledge.context}
    History: {memory.history[-2:]}
    """
    # Call LLM (OpenAI, Bedrock, etc.)
    # For now, return mock response
    return "Generated response based on context"

@activity.defn
async def stage_5_validate_response(
    response: str, intent: str
) -> ValidationResult:
    """Stage 5: Validation"""
    # Check response quality, safety, etc.
    is_valid = len(response) > 0
    return ValidationResult(
        is_valid=is_valid,
        confidence=0.9,
        issues=[],
        needs_revision=False,
        needs_tool_execution="search" in response.lower()
    )

@activity.defn
async def stage_6_execute_tool(
    tool_name: str, tool_params: dict
) -> str:
    """Stage 6: Tool Execution"""
    # Route to appropriate tool handler
    if tool_name == "search":
        return f"Search results for: {tool_params.get('query')}"
    elif tool_name == "calculate":
        return f"Calculation result: {tool_params.get('expr')}"
    return "Tool not found"

@activity.defn
async def stage_7_save_memory(
    user_id: str,
    session_id: str,
    message: str,
    response: str,
    intent: str
) -> bool:
    """Stage 7: Memory Save"""
    # Save to conversation store, vector DB, etc.
    # Simulate saving
    return True
```

### 3. Complete Workflow (Sequential Pipeline)
```python
# workflows/assistant_workflow.py
from datetime import timedelta
from temporalio import workflow
from activities.ai_activities import (
    stage_1_classify_intent,
    stage_2_retrieve_knowledge,
    stage_3_lookup_memory,
    stage_4_generate_response,
    stage_5_validate_response,
    stage_6_execute_tool,
    stage_7_save_memory,
)

@workflow.defn
class SevenStageAssistantWorkflow:
    @workflow.run
    async def run(self, input: AssistantInput) -> str:
        # Stage 1: Intent Classification
        intent_result = await workflow.execute_activity(
            stage_1_classify_intent,
            input.message,
            start_to_close_timeout=timedelta(seconds=10)
        )
        workflow.logger.info(f"Stage 1: Intent = {intent_result.intent}")

        # Stage 2: Knowledge Retrieval
        knowledge = await workflow.execute_activity(
            stage_2_retrieve_knowledge,
            input.message,
            intent_result.intent,
            start_to_close_timeout=timedelta(seconds=20)
        )
        workflow.logger.info(f"Stage 2: Retrieved {len(knowledge.documents)} docs")

        # Stage 3: Memory Lookup
        memory = await workflow.execute_activity(
            stage_3_lookup_memory,
            input.user_id,
            input.session_id,
            start_to_close_timeout=timedelta(seconds=10)
        )
        workflow.logger.info(f"Stage 3: Retrieved {len(memory.history)} history items")

        # Stage 4: Response Generation
        response = await workflow.execute_activity(
            stage_4_generate_response,
            input.message,
            intent_result.intent,
            knowledge,
            memory,
            start_to_close_timeout=timedelta(seconds=30)
        )
        workflow.logger.info(f"Stage 4: Generated response (len={len(response)})")

        # Stage 5: Validation
        validation = await workflow.execute_activity(
            stage_5_validate_response,
            response,
            intent_result.intent,
            start_to_close_timeout=timedelta(seconds=10)
        )
        workflow.logger.info(f"Stage 5: Valid={validation.is_valid}")

        # Stage 6: Tool Execution (if needed)
        if validation.needs_tool_execution:
            tool_result = await workflow.execute_activity(
                stage_6_execute_tool,
                "search",
                {"query": input.message},
                start_to_close_timeout=timedelta(seconds=20)
            )
            response += f"\n\nTool result: {tool_result}"
            workflow.logger.info("Stage 6: Tool executed")

        # Stage 7: Memory Save
        saved = await workflow.execute_activity(
            stage_7_save_memory,
            input.user_id,
            input.session_id,
            input.message,
            response,
            intent_result.intent,
            start_to_close_timeout=timedelta(seconds=10)
        )
        workflow.logger.info(f"Stage 7: Memory saved = {saved}")

        return response
```

### 4. Multi-Turn Conversation (Using Signals)
```python
# workflows/multi_turn_workflow.py
import asyncio
from collections import deque
from dataclasses import dataclass
from datetime import timedelta
from temporalio import workflow

@dataclass
class ChatMessage:
    role: str  # "user" or "assistant"
    content: str

@workflow.defn
class MultiTurnConversationWorkflow:
    def __init__(self):
        self.conversation_history: deque[ChatMessage] = deque(maxlen=100)
        self.should_exit = False

    @workflow.run
    async def run(self) -> list[ChatMessage]:
        """Keep workflow running until explicitly ended"""
        while not self.should_exit:
            # Wait for new message or timeout
            try:
                await workflow.wait_condition(
                    lambda: len(self.conversation_history) > 0 or self.should_exit,
                    timeout=timedelta(hours=1)
                )
            except asyncio.TimeoutError:
                workflow.logger.info("Conversation timeout")
                break

            # Process all pending messages
            while len(self.conversation_history) > 0:
                message = self.conversation_history.popleft()
                
                # Process with LLM
                response_text = await workflow.execute_activity(
                    stage_4_generate_response,
                    message.content,
                    "query",
                    {},
                    {},
                    start_to_close_timeout=timedelta(seconds=30)
                )
                
                # Add response to history
                self.conversation_history.append(
                    ChatMessage(role="assistant", content=response_text)
                )

        return list(self.conversation_history)

    @workflow.signal
    async def send_message(self, message: str) -> None:
        """Receive user message via signal"""
        self.conversation_history.append(
            ChatMessage(role="user", content=message)
        )

    @workflow.signal
    def end_conversation(self) -> None:
        """End the conversation"""
        self.should_exit = True

    @workflow.query
    def get_history(self) -> list[ChatMessage]:
        """Query conversation history"""
        return list(self.conversation_history)
```

### 5. Worker Setup
```python
# worker.py
import asyncio
from temporalio.client import Client
from temporalio.worker import Worker
from workflows.assistant_workflow import SevenStageAssistantWorkflow
from workflows.multi_turn_workflow import MultiTurnConversationWorkflow
from activities.ai_activities import (
    stage_1_classify_intent,
    stage_2_retrieve_knowledge,
    stage_3_lookup_memory,
    stage_4_generate_response,
    stage_5_validate_response,
    stage_6_execute_tool,
    stage_7_save_memory,
)

async def main():
    client = await Client.connect("localhost:7233")
    
    worker = Worker(
        client,
        task_queue="assistant-ai-task-queue",
        workflows=[
            SevenStageAssistantWorkflow,
            MultiTurnConversationWorkflow,
        ],
        activities=[
            stage_1_classify_intent,
            stage_2_retrieve_knowledge,
            stage_3_lookup_memory,
            stage_4_generate_response,
            stage_5_validate_response,
            stage_6_execute_tool,
            stage_7_save_memory,
        ],
    )
    
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main())
```

### 6. Workflow Starter (Client)
```python
# starter.py
import asyncio
from temporalio.client import Client
from workflows.assistant_workflow import (
    SevenStageAssistantWorkflow,
    AssistantInput,
)

async def main():
    client = await Client.connect("localhost:7233")
    
    # Single-turn workflow
    result = await client.execute_workflow(
        SevenStageAssistantWorkflow.run,
        AssistantInput(
            user_id="user123",
            session_id="session456",
            message="What is the capital of France?"
        ),
        id="assistant-workflow-001",
        task_queue="assistant-ai-task-queue",
    )
    
    print(f"Result: {result}")

if __name__ == "__main__":
    asyncio.run(main())
```

### 7. Multi-Turn Conversation Client
```python
# conversation_client.py
import asyncio
from temporalio.client import Client
from workflows.multi_turn_workflow import MultiTurnConversationWorkflow

async def main():
    client = await Client.connect("localhost:7233")
    
    # Start workflow
    handle = await client.start_workflow(
        MultiTurnConversationWorkflow.run,
        id="conversation-001",
        task_queue="assistant-ai-task-queue",
    )
    
    # Send messages via signals
    await handle.signal(
        MultiTurnConversationWorkflow.send_message,
        "What is Python?"
    )
    
    await asyncio.sleep(1)
    
    # Check history
    history = await handle.query(
        MultiTurnConversationWorkflow.get_history
    )
    print(f"Conversation: {history}")
    
    # End conversation
    await handle.signal(MultiTurnConversationWorkflow.end_conversation)
    
    # Get final result
    result = await handle.result()
    print(f"Final history: {result}")

if __name__ == "__main__":
    asyncio.run(main())
```

### 8. Error Handling with Retry
```python
from temporalio.common import RetryPolicy
from datetime import timedelta

# With retry policy
result = await workflow.execute_activity(
    stage_4_generate_response,
    input_data,
    start_to_close_timeout=timedelta(seconds=30),
    retry_policy=RetryPolicy(
        initial_interval=timedelta(seconds=1),
        backoff_coefficient=2.0,
        maximum_attempts=3,
        maximum_interval=timedelta(seconds=30)
    )
)

# With exception handling
from temporalio.exceptions import ApplicationError

try:
    result = await workflow.execute_activity(...)
except ApplicationError as e:
    workflow.logger.error(f"Activity failed: {e}")
    result = "default_fallback_response"
```

---

## File Structure
```
ai_assistant_temporal/
├── models/
│   ├── __init__.py
│   └── types.py                 # All dataclass definitions
├── activities/
│   ├── __init__.py
│   └── ai_activities.py         # All 7 stages
├── workflows/
│   ├── __init__.py
│   ├── assistant_workflow.py    # Single-turn pipeline
│   └── multi_turn_workflow.py   # Multi-turn conversation
├── worker.py                     # Start worker process
├── starter.py                    # Single-turn client
├── conversation_client.py        # Multi-turn client
└── requirements.txt
```

---

## Setup Commands
```bash
# Install Temporal CLI
brew install temporal-cli  # macOS
# or from https://docs.temporal.io/cli#install

# Start Temporal server
temporal server start-dev

# Install dependencies
pip install temporalio

# Run worker (Terminal 1)
python worker.py

# Run workflow (Terminal 2)
python starter.py

# Run conversation (Terminal 2)
python conversation_client.py
```

---

## Key Timeouts
- **Intent classification**: 10s (fast)
- **Knowledge retrieval**: 20s (RAG can be slow)
- **Memory lookup**: 10s (usually cached)
- **Response generation**: 30s (LLM calls are slow)
- **Validation**: 10s (quick check)
- **Tool execution**: 20-60s (depends on tool)
- **Memory save**: 10s (database write)

---

## Testing Your Workflow
```python
# test_workflow.py
from temporalio.testing import WorkflowEnvironment
from workflows.assistant_workflow import SevenStageAssistantWorkflow

async def test_workflow():
    async with await WorkflowEnvironment.start_time_skipping() as env:
        result = await env.client.execute_workflow(
            SevenStageAssistantWorkflow.run,
            AssistantInput(
                user_id="test_user",
                session_id="test_session",
                message="Test message"
            ),
            id="test-workflow",
            task_queue="test-queue"
        )
        
        assert "Generated response" in result
        print(f"Test passed! Result: {result}")

# Run test
asyncio.run(test_workflow())
```

