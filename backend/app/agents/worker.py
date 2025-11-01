"""
Temporal Worker - Executes AI agent workflows
Run this with: python -m app.agents.worker
"""
import asyncio
import os
from datetime import timedelta
from temporalio.client import Client
from temporalio.contrib.openai_agents import OpenAIAgentsPlugin, ModelActivityParameters
from temporalio.worker import Worker
from temporalio.worker.workflow_sandbox import SandboxedWorkflowRunner, SandboxRestrictions
from app.agents.workflows.assistant_workflow import (
    AssistantWorkflow,
    save_conversation_log,
    load_agent_config,
    load_previous_custom_fields,
)
from app.agents.activities.memory_activities import (
    get_relevant_memories,
    save_conversation_memory,
    get_conversation_history
)
from app.agents.activities.knowledge_search import search_knowledge
from app.agents.model_provider import OpenRouterModelProvider

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configure sandbox to pass through external modules
# Workflow uses these modules directly, so they must be in passthrough
sandbox_runner = SandboxedWorkflowRunner(
    restrictions=SandboxRestrictions.default.with_passthrough_modules(
        # External dependencies
        "voyageai",
        "aiolimiter",
        "langchain_text_splitters",
        "huggingface_hub",
        "http.client",
        # Our utility modules used in workflow
        "app.agents.config",
        "app.agents.schemas",
        "app.agents.memory",
        "app.agents.utils",
        "app.agents.tools"
    )
)


async def main():
    """Start the Temporal worker"""

    # Connect to Temporal server with OpenAI Agents plugin configured for OpenRouter
    client = await Client.connect(
        "localhost:5461",
        plugins=[
            OpenAIAgentsPlugin(
                model_params=ModelActivityParameters(
                    start_to_close_timeout=timedelta(seconds=30)
                ),
                model_provider=OpenRouterModelProvider(),
            ),
        ],
    )

    # Create worker that will execute workflows
    worker = Worker(
        client,
        task_queue="connectai-agents",
        workflows=[AssistantWorkflow],
        activities=[
            load_agent_config,
            load_previous_custom_fields,
            save_conversation_log,
            get_relevant_memories,
            save_conversation_memory,
            get_conversation_history,
            search_knowledge,
        ],
        workflow_runner=sandbox_runner,
    )

    print("🚀 Temporal worker started!")
    print("📋 Task queue: connectai-agents")
    print("🔄 Listening for workflows...")
    print("Press Ctrl+C to stop")

    # Run the worker
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
