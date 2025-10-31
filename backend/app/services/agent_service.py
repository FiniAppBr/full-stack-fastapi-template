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
        agent_id: str,
        turn_count: int = 1,
        conversation_ended: bool = False
    ) -> tuple[str, ConversationOutput]:
        """
        Send a message to the Assistant AI and get a response

        Args:
            customer_id: ID of the customer/user
            message: The message from the customer
            agent_id: ID of the ConnectAI agent (business) handling this
            turn_count: Current turn number in conversation (for memory triggers)
            conversation_ended: Whether this is the end of conversation

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
                agent_id=agent_id,
                turn_count=turn_count,
                conversation_ended=conversation_ended
            ),
            id=workflow_id,
            task_queue=self.task_queue,
        )

        return workflow_id, result

    async def end_conversation(
        self,
        customer_id: str,
        agent_id: str
    ) -> None:
        """
        Mark conversation as ended and trigger final memory save.

        This is called when:
        - User inactive for 3+ minutes
        - User explicitly ends conversation

        The memory save will analyze the entire conversation and extract
        key learnings to store in Mem0.
        """
        from app.agents.activities.memory_activities import (
            get_conversation_history,
            save_conversation_memory
        )
        from app.agents.config import OptimizationConfig

        # Get recent conversation history
        history = await get_conversation_history(customer_id, agent_id, limit=20)

        # Only save if conversation has enough turns
        config = OptimizationConfig()
        if len(history) < config.memory.min_turns * 2:  # *2 because each turn = user + assistant
            print(f"Conversation too short ({len(history)} messages), skipping memory save")
            return

        # Trigger memory save for entire conversation
        await save_conversation_memory(
            customer_id=customer_id,
            messages=history,
            metadata={"trigger": "end_of_conversation"}
        )

        print(f"End-of-conversation memory saved for {customer_id}")


# Singleton instance
agent_service = AgentService()
