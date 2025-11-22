"""
Generate response node - LLM response generation.
"""
import os
from openai import OpenAI

from app.agents.config.models import models
from app.agents.utils.retry import openai_retry

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


@openai_retry
def _call_chat_api(client, model, messages, temperature, max_tokens):
    """Call OpenAI chat API with retry logic."""
    return client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens
    )


def create_generate_response_node(agent_config: dict):
    """Create response generation node with agent-specific instructions."""
    def generate_response_node(state: dict) -> dict:
        """Generate response using LLM with memory, RAG, and state."""
        print("→ Generate Response Node")

        messages = state.get("messages", [])
        memory_context = state.get("memory_context", "")
        rag_context = state.get("rag_context", "")

        if not messages:
            return {"response": "Olá! Como posso ajudar?"}

        user_message = messages[-1].get("content", "")

        base_instructions = agent_config.get("base_instructions", "")
        system_prompt = f"""{base_instructions}

{memory_context}

{rag_context}

IMPORTANTE: Responda de forma natural e variada. Seja prestativo e profissional."""

        try:
            response = _call_chat_api(
                client,
                models.chat_model,
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                models.chat_temperature,
                models.chat_max_tokens
            )

            assistant_response = response.choices[0].message.content

            usage = response.usage
            tokens_used = {
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
                "total_tokens": usage.total_tokens
            }

            print(f"  Generated: {assistant_response[:100]}...")
            print(f"  Tokens: {tokens_used['total_tokens']} (prompt: {tokens_used['prompt_tokens']}, completion: {tokens_used['completion_tokens']})")

            return {
                "response": assistant_response,
                "memory_worthy": True,
                "sentiment": "neutral",
                "urgency": "normal",
                "requires_handoff": False,
                "tokens_used": tokens_used,
            }

        except Exception as e:
            print(f"  ✗ OpenAI error: {e}")
            return {
                "response": "Desculpe, ocorreu um erro. Pode repetir?",
                "memory_worthy": False,
                "sentiment": "neutral",
                "urgency": "normal",
                "requires_handoff": False,
            }

    return generate_response_node
