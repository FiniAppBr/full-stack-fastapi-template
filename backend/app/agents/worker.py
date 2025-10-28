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
from app.agents.workflows.assistant_workflow import AssistantWorkflow
from app.agents.model_provider import OpenRouterModelProvider

# Load environment variables
from dotenv import load_dotenv
load_dotenv()


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
        # activities=[], # We don't have manual activities - OpenAI Agents SDK creates them automatically
    )

    print("🚀 Temporal worker started!")
    print("📋 Task queue: connectai-agents")
    print("🔄 Listening for workflows...")
    print("Press Ctrl+C to stop")

    # Run the worker
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
