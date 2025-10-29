"""
Assistant AI Temporal Workflow
Using OpenAI Agents SDK + Temporal integration + Mem0 Memory
"""
from dataclasses import dataclass
from datetime import datetime
from temporalio import workflow, activity
from agents import Agent, Runner
from app.agents.activities.memory_activities import (
    get_relevant_memories,
    save_conversation_memory,
    get_conversation_history
)


@activity.defn
async def save_conversation_log(log_data: dict) -> None:
    """
    Activity to save conversation log to database.
    Must be an Activity (not in workflow) because DB I/O is non-deterministic.
    """
    from sqlmodel import Session, create_engine
    from app.models import ConversationLog
    from app.core.config import settings
    from app.agents.pricing import calculate_cost

    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

    # Calculate cost from token usage
    estimated_cost = calculate_cost(
        model=log_data.get("model_used", "gpt-4o-mini"),
        input_tokens=log_data.get("input_tokens", 0),
        output_tokens=log_data.get("output_tokens", 0)
    )

    log = ConversationLog(
        workflow_id=log_data["workflow_id"],
        customer_id=log_data["customer_id"],
        agent_id=log_data["agent_id"],
        message=log_data["message"],
        response=log_data["response"],
        intent=log_data["intent"],
        confidence=log_data["confidence"],
        duration_seconds=log_data["duration_seconds"],
        agent_timings=log_data["agent_timings"],
        status=log_data["status"],
        input_chars=len(log_data["message"]),
        output_chars=len(log_data["response"]),
        # Token tracking
        input_tokens=log_data.get("input_tokens", 0),
        output_tokens=log_data.get("output_tokens", 0),
        total_tokens=log_data.get("total_tokens", 0),
        token_details=log_data.get("token_details", {}),
        model_used=log_data.get("model_used", "gpt-4o-mini"),
        estimated_cost_usd=estimated_cost,
    )

    with Session(engine) as session:
        session.add(log)
        session.commit()


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
    duration_seconds: float
    agent_timings: dict


@workflow.defn
class AssistantWorkflow:
    """
    Barebones Assistant AI workflow - 3 agents:
    1. Intent Classifier
    2. Knowledge Retriever
    3. Response Generator
    """

    def __init__(self):
        """Initialize workflow state for real-time queries"""
        self.current_step = "starting"
        self.progress = 0  # 0-100%
        self.agent_timings = {}
        self.token_details = {}  # Per-agent token usage
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.model_used = "gpt-4o-mini"

    def _extract_tokens(self, run_result, agent_name: str) -> dict:
        """
        Extract token usage from RunResult and accumulate totals.

        Args:
            run_result: RunResult from Runner.run()
            agent_name: Name of the agent for tracking

        Returns:
            Dict with input, output, total tokens for this agent
        """
        input_tokens = 0
        output_tokens = 0

        # Sum up tokens from all responses (usually just 1 per agent)
        for response in run_result.raw_responses:
            input_tokens += response.usage.input_tokens
            output_tokens += response.usage.output_tokens

        total_tokens = input_tokens + output_tokens

        # Store per-agent usage
        self.token_details[agent_name] = {
            "input": input_tokens,
            "output": output_tokens,
            "total": total_tokens
        }

        # Accumulate totals
        self.total_input_tokens += input_tokens
        self.total_output_tokens += output_tokens

        return {"input": input_tokens, "output": output_tokens, "total": total_tokens}

    @workflow.query
    def get_progress(self) -> dict:
        """Query method for real-time progress updates via WebSocket"""
        return {
            "current_step": self.current_step,
            "progress": self.progress,
            "agent_timings": self.agent_timings
        }

    @workflow.run
    async def run(self, input: ConversationInput) -> ConversationOutput:
        """
        Main workflow execution with Mem0 memory integration
        Each agent.run() automatically becomes a durable Temporal Activity
        """
        start_time = workflow.now()

        # STEP 0: Retrieve relevant memories from Mem0
        self.current_step = "retrieving_memories"
        self.progress = 5

        user_memories = await workflow.execute_activity(
            get_relevant_memories,
            args=[input.customer_id, input.message, 5],
            start_to_close_timeout=workflow.timedelta(seconds=5),
        )

        # Format memories for context
        memory_context = ""
        if user_memories:
            memory_context = "Previous knowledge about this customer:\n"
            for mem in user_memories:
                memory_context += f"- {mem['text']}\n"

        # STEP 0.5: Retrieve recent conversation history (last 3 turns)
        conversation_history = await workflow.execute_activity(
            get_conversation_history,
            args=[input.customer_id, input.agent_id, 3],
            start_to_close_timeout=workflow.timedelta(seconds=5),
        )

        # Format conversation history for context
        history_context = ""
        if conversation_history:
            history_context = "Recent conversation history:\n"
            for msg in conversation_history:
                role_label = "Customer" if msg["role"] == "user" else "Assistant"
                history_context += f"{role_label}: {msg['content']}\n"

        # AGENT 1: Classify intent
        self.current_step = "intent_classification"
        self.progress = 10
        agent1_start = workflow.now()

        # Note: No client needed - OpenAI Agents plugin + custom provider handles it
        intent_agent = Agent(
            name="Intent Classifier",
            model="gpt-4o-mini",  # Using OpenAI for now, will switch to Gemini
            instructions=f"""You are an intent classifier for a business assistant.
            Classify the user's message into one of these intents:
            - question: Asking about products, services, hours, pricing
            - booking: Wants to make an appointment or reservation
            - payment: Payment or billing inquiry
            - complaint: Issue or complaint

            {memory_context}

            {history_context}

            Use the customer context and conversation history above to better understand their intent.
            For example, if they say "And for a large one?" and the history shows they were asking about grooming,
            classify this as a follow-up question about grooming.

            Respond with ONLY the intent name and confidence (0.0-1.0).
            Format: intent_name|confidence
            Example: question|0.95
            """
        )

        intent_result = await Runner.run(
            intent_agent,
            input=input.message
        )
        agent1_duration = (workflow.now() - agent1_start).total_seconds()
        self.agent_timings["intent_classifier"] = agent1_duration

        # Extract token usage from RunResult
        agent1_tokens = self._extract_tokens(intent_result, "intent_classifier")
        self.progress = 40

        # Parse intent and confidence
        intent_parts = intent_result.final_output.strip().split("|")
        intent = intent_parts[0] if len(intent_parts) > 0 else "question"
        confidence = float(intent_parts[1]) if len(intent_parts) > 1 else 0.5

        # AGENT 2: Knowledge Retriever (for now, returns hardcoded test data)
        self.current_step = "knowledge_retrieval"
        agent2_start = workflow.now()

        # TODO: Replace with actual pgvector search
        retrieval_agent = Agent(
            name="Knowledge Retriever",
            model="gpt-4o-mini",
            instructions=f"""You are a knowledge retrieval agent.
            The user asked: "{input.message}"
            Intent: {intent}

            {memory_context}

            {history_context}

            For now, return this test knowledge:
            "Haircut pricing: Small dogs R$60, Large dogs R$85.
            Hours: Mon-Fri 9am-6pm, Sat 10am-4pm."

            Use the customer context and conversation history to personalize the response.
            Later this will query a vector database.
            """
        )

        knowledge = await Runner.run(
            retrieval_agent,
            input=f"Retrieve knowledge for: {input.message}"
        )
        agent2_duration = (workflow.now() - agent2_start).total_seconds()
        self.agent_timings["knowledge_retriever"] = agent2_duration

        # Extract token usage
        agent2_tokens = self._extract_tokens(knowledge, "knowledge_retriever")
        self.progress = 70

        # AGENT 3: Response Generator
        self.current_step = "response_generation"
        agent3_start = workflow.now()

        response_agent = Agent(
            name="Response Generator",
            model="gpt-4o-mini",
            instructions=f"""You are a friendly business assistant.

            Customer message: "{input.message}"
            Intent: {intent}
            Knowledge: {knowledge.final_output}

            {memory_context}

            {history_context}

            Generate a helpful, conversational response in Brazilian Portuguese.
            Be warm and professional. Keep it concise (2-3 sentences).
            Use what you know about the customer and the conversation history to personalize the response.
            If this is a follow-up question, reference what was discussed earlier.
            """
        )

        final_response = await Runner.run(
            response_agent,
            input=input.message
        )
        agent3_duration = (workflow.now() - agent3_start).total_seconds()
        self.agent_timings["response_generator"] = agent3_duration

        # Extract token usage
        agent3_tokens = self._extract_tokens(final_response, "response_generator")
        self.progress = 75

        # AGENT 4: Save conversation to Mem0
        # This extracts facts and stores long-term memories
        # We do this BEFORE logging so we can include memory tokens
        self.current_step = "saving_memory"
        agent4_start = workflow.now()
        memory_result = await workflow.execute_activity(
            save_conversation_memory,
            args=[
                input.customer_id,
                [
                    {"role": "user", "content": input.message},
                    {"role": "assistant", "content": final_response.final_output}
                ],
                {"intent": intent, "confidence": confidence}
            ],
            start_to_close_timeout=workflow.timedelta(seconds=15),
        )
        agent4_duration = (workflow.now() - agent4_start).total_seconds()
        self.agent_timings["memory_saver"] = agent4_duration

        # Track estimated memory tokens
        if memory_result and memory_result.get("success"):
            self.token_details["memory_saver"] = {
                "input": memory_result["input_tokens"],
                "output": memory_result["output_tokens"],
                "total": memory_result["total_tokens"],
                "note": "estimated"  # Mark as estimated, not actual
            }
            self.total_input_tokens += memory_result["input_tokens"]
            self.total_output_tokens += memory_result["output_tokens"]

        self.progress = 95

        # Calculate total duration and tokens (AFTER memory save)
        total_duration = (workflow.now() - start_time).total_seconds()
        total_tokens = self.total_input_tokens + self.total_output_tokens

        # AGENT 5: Save to database (as Activity)
        self.current_step = "saving_logs"
        await workflow.execute_activity(
            save_conversation_log,
            args=[{
                "workflow_id": workflow.info().workflow_id,
                "customer_id": input.customer_id,
                "agent_id": input.agent_id,
                "message": input.message,
                "response": final_response.final_output,
                "intent": intent,
                "confidence": confidence,
                "duration_seconds": total_duration,
                "agent_timings": self.agent_timings,
                "status": "completed",
                # Token tracking
                "input_tokens": self.total_input_tokens,
                "output_tokens": self.total_output_tokens,
                "total_tokens": total_tokens,
                "token_details": self.token_details,
                "model_used": self.model_used,
            }],
            start_to_close_timeout=workflow.timedelta(seconds=10),
        )

        self.progress = 100
        self.current_step = "completed"

        return ConversationOutput(
            response=final_response.final_output,
            intent=intent,
            confidence=confidence,
            duration_seconds=total_duration,
            agent_timings=self.agent_timings
        )
