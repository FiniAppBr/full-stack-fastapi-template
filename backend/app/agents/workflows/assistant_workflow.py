"""
Assistant AI Temporal Workflow
Using OpenAI Agents SDK + Temporal integration
"""
from dataclasses import dataclass
from temporalio import workflow
from agents import Agent, Runner


@dataclass
class ConversationInput:
    """Input for assistant conversation"""
    customer_id: str
    message: str
    agent_id: str  # Which ConnectAI agent (business) this conversation belongs to


@dataclass
class ConversationOutput:
    """Output from assistant conversation"""
    response: str
    intent: str
    confidence: float


@workflow.defn
class AssistantWorkflow:
    """
    Barebones Assistant AI workflow - 3 agents:
    1. Intent Classifier
    2. Knowledge Retriever
    3. Response Generator
    """

    @workflow.run
    async def run(self, input: ConversationInput) -> ConversationOutput:
        """
        Main workflow execution
        Each agent.run() automatically becomes a durable Temporal Activity
        """

        # AGENT 1: Classify intent
        # Note: No client needed - OpenAI Agents plugin + custom provider handles it
        intent_agent = Agent(
            name="Intent Classifier",
            model="gpt-4o-mini",  # Using OpenAI for now, will switch to Gemini
            instructions="""You are an intent classifier for a business assistant.
            Classify the user's message into one of these intents:
            - question: Asking about products, services, hours, pricing
            - booking: Wants to make an appointment or reservation
            - payment: Payment or billing inquiry
            - complaint: Issue or complaint

            Respond with ONLY the intent name and confidence (0.0-1.0).
            Format: intent_name|confidence
            Example: question|0.95
            """
        )

        intent_result = await Runner.run(
            intent_agent,
            input=input.message
        )

        # Parse intent and confidence
        intent_parts = intent_result.final_output.strip().split("|")
        intent = intent_parts[0] if len(intent_parts) > 0 else "question"
        confidence = float(intent_parts[1]) if len(intent_parts) > 1 else 0.5

        # AGENT 2: Knowledge Retriever (for now, returns hardcoded test data)
        # TODO: Replace with actual pgvector search
        retrieval_agent = Agent(
            name="Knowledge Retriever",
            model="gpt-4o-mini",
            instructions=f"""You are a knowledge retrieval agent.
            The user asked: "{input.message}"
            Intent: {intent}

            For now, return this test knowledge:
            "Haircut pricing: Small dogs R$60, Large dogs R$85.
            Hours: Mon-Fri 9am-6pm, Sat 10am-4pm."

            Later this will query a vector database.
            """
        )

        knowledge = await Runner.run(
            retrieval_agent,
            input=f"Retrieve knowledge for: {input.message}"
        )

        # AGENT 3: Response Generator
        response_agent = Agent(
            name="Response Generator",
            model="gpt-4o-mini",
            instructions=f"""You are a friendly business assistant.

            Customer message: "{input.message}"
            Intent: {intent}
            Knowledge: {knowledge.final_output}

            Generate a helpful, conversational response in Brazilian Portuguese.
            Be warm and professional. Keep it concise (2-3 sentences).
            """
        )

        final_response = await Runner.run(
            response_agent,
            input=input.message
        )

        return ConversationOutput(
            response=final_response.final_output,
            intent=intent,
            confidence=confidence
        )
