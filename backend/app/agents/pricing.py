"""
Model pricing configuration for cost tracking.
Prices are in USD per 1M tokens.
"""

MODEL_PRICING = {
    # OpenAI Models
    "gpt-4o-mini": {
        "input": 0.15,  # $0.15 per 1M input tokens
        "output": 0.60,  # $0.60 per 1M output tokens
    },
    "gpt-4o": {
        "input": 2.50,
        "output": 10.00,
    },
    "gpt-4-turbo": {
        "input": 10.00,
        "output": 30.00,
    },
    "gpt-3.5-turbo": {
        "input": 0.50,
        "output": 1.50,
    },

    # Google Gemini (via OpenRouter)
    "google/gemini-2.0-flash-exp": {
        "input": 0.00,  # Currently free during preview
        "output": 0.00,
    },
    "google/gemini-pro": {
        "input": 0.50,
        "output": 1.50,
    },

    # Default fallback
    "default": {
        "input": 0.15,
        "output": 0.60,
    }
}


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """
    Calculate the estimated cost in USD for a given model and token usage.

    Args:
        model: Model name (e.g., "gpt-4o-mini")
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens

    Returns:
        Estimated cost in USD
    """
    pricing = MODEL_PRICING.get(model, MODEL_PRICING["default"])

    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]

    return input_cost + output_cost
