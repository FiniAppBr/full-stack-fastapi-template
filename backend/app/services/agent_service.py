"""
Agent Service - Handles communication with Temporal workflows
"""
from temporalio.client import Client
from temporalio.contrib.openai_agents import OpenAIAgentsPlugin
from app.agents.workflows.assistant_workflow import AssistantWorkflow, ConversationInput, ConversationOutput
import uuid
import os


class AgentService:
    """Service for executing AI agent workflows via Temporal"""

    def __init__(self):
        self.client: Client | None = None
        self.temporal_url = "localhost:5461"
        self.task_queue = "connectai-agents"
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY", "")

    async def connect(self):
        """Connect to Temporal server"""
        if not self.client:
            self.client = await Client.connect(
                self.temporal_url,
                plugins=[OpenAIAgentsPlugin()],
            )

    async def send_message(
        self,
        customer_id: str,
        message: str,
        agent_id: str
    ) -> tuple[str, ConversationOutput]:
        """
        Send a message to the Assistant AI and get a response

        Args:
            customer_id: ID of the customer/user
            message: The message from the customer
            agent_id: ID of the ConnectAI agent (business) handling this

        Returns:
            Tuple of (workflow_id, ConversationOutput)
        """
        await self.connect()

        # Create unique workflow ID for this conversation turn
        workflow_id = f"conversation-{customer_id}-{uuid.uuid4()}"

        # Execute the workflow
        result = await self.client.execute_workflow(
            AssistantWorkflow.run,
            ConversationInput(
                customer_id=customer_id,
                message=message,
                agent_id=agent_id
            ),
            id=workflow_id,
            task_queue=self.task_queue,
        )

        return workflow_id, result


# Singleton instance
agent_service = AgentService()
