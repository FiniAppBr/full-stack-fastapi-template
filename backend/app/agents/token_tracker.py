"""
Token tracking hooks for OpenAI Agents SDK.
Captures token usage via RunHooks callbacks.
"""
from agents import RunHooksBase
from agents.items import ModelResponse
from agents.run_context import RunContextWrapper
from agents import Agent


class TokenTrackingHooks(RunHooksBase):
    """
    RunHooks implementation that tracks token usage per agent.

    Usage:
        hooks = TokenTrackingHooks()
        result = await Runner.run(agent, input="Hello", hooks=hooks)
        print(hooks.get_total_tokens())
    """

    def __init__(self):
        """Initialize token tracking storage."""
        self.token_usage_by_agent = {}  # {agent_name: {input: int, output: int, total: int}}
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.total_tokens = 0
        self.model_used = None  # Will be set from first response

    async def on_llm_end(
        self,
        context: RunContextWrapper,
        agent: Agent,
        response: ModelResponse,
    ) -> None:
        """
        Called after each LLM call. Captures token usage from the response.

        Args:
            context: Run context wrapper
            agent: The agent that made the LLM call
            response: ModelResponse containing usage information
        """
        # Extract token usage from response
        usage = response.usage
        input_tokens = usage.input_tokens
        output_tokens = usage.output_tokens
        total_tokens = usage.total_tokens

        # Store per-agent usage
        agent_name = agent.name
        if agent_name not in self.token_usage_by_agent:
            self.token_usage_by_agent[agent_name] = {
                "input": 0,
                "output": 0,
                "total": 0
            }

        self.token_usage_by_agent[agent_name]["input"] += input_tokens
        self.token_usage_by_agent[agent_name]["output"] += output_tokens
        self.token_usage_by_agent[agent_name]["total"] += total_tokens

        # Accumulate totals
        self.total_input_tokens += input_tokens
        self.total_output_tokens += output_tokens
        self.total_tokens += total_tokens

        # Store model name from first response
        if self.model_used is None:
            self.model_used = agent.model

    def get_total_tokens(self) -> dict:
        """
        Get total token usage across all agents.

        Returns:
            Dict with input, output, and total token counts
        """
        return {
            "input": self.total_input_tokens,
            "output": self.total_output_tokens,
            "total": self.total_tokens
        }

    def get_per_agent_tokens(self) -> dict:
        """
        Get token usage breakdown by agent.

        Returns:
            Dict mapping agent names to token usage
        """
        return self.token_usage_by_agent

    def get_model(self) -> str:
        """Get the model that was used (captured from first LLM call)."""
        return self.model_used or "unknown"
