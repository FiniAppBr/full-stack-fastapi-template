"""
Memory nodes - retrieve and save memories using Mem0.
"""
from app.core.memory import get_memory
from app.agents.memory import should_save_memory
from app.agents.config import OptimizationConfig


def create_retrieve_memories_node():
    """Create memory retrieval node."""
    def retrieve_memories_node(state: dict) -> dict:
        """Retrieve relevant memories from Mem0."""
        print("→ Retrieve Memories Node")

        memory = get_memory()
        customer_id = state.get("customer_id")
        messages = state.get("messages", [])

        if not customer_id or not messages:
            return {"memory_context": ""}

        user_message = messages[-1].get("content", "") if messages else ""

        try:
            search_result = memory.search(
                query=user_message,
                user_id=customer_id,
                limit=5
            )

            memory_context = ""
            results = search_result.get('results', [])
            if results:
                memory_context = "Previous knowledge about this customer:\n"
                for i, result in enumerate(results, 1):
                    mem_text = result.get("memory", "")
                    if mem_text:
                        memory_context += f"- {mem_text}\n"
                        print(f"    Memory {i}: {mem_text[:80]}...")

            print(f"  Retrieved {len(results)} memories")
            return {"memory_context": memory_context}

        except Exception as e:
            print(f"  ✗ Memory retrieval error: {e}")
            return {"memory_context": ""}

    return retrieve_memories_node


def create_save_memory_node():
    """Create memory save node with trigger logic."""
    def save_memory_node(state: dict) -> dict:
        """Conditionally save conversation to Mem0 based on triggers."""
        print("→ Save Memory Node")

        customer_id = state.get("customer_id")
        messages = state.get("messages", [])
        optimization_config = state.get("optimization_config", {})

        if not customer_id or not messages:
            return {"memory_saved": False, "save_reason": "no_customer_or_messages"}

        config = OptimizationConfig.from_dict(optimization_config) if optimization_config else OptimizationConfig()

        should_save, reason = should_save_memory(
            customer_id=customer_id,
            turn_count=state.get("turn_count", 1),
            memory_worthy=state.get("memory_worthy", False),
            conversation_ended=state.get("conversation_ended", False),
            config=config
        )

        if should_save:
            try:
                memory = get_memory()

                conversation_messages = [
                    {"role": msg.get("role", "user"), "content": msg.get("content", "")}
                    for msg in messages[-2:]
                ]

                memory.add(
                    messages="\n".join([
                        f"{m['role'].title()}: {m['content']}"
                        for m in conversation_messages
                    ]),
                    user_id=customer_id,
                    metadata={
                        "sentiment": state.get("sentiment"),
                        "urgency": state.get("urgency"),
                        "requires_handoff": state.get("requires_handoff", False),
                    }
                )

                print(f"  ✓ Memory saved: {reason}")
                return {"memory_saved": True, "save_reason": reason}

            except Exception as e:
                print(f"  ✗ Memory save error: {e}")
                return {"memory_saved": False, "save_reason": f"error: {e}"}

        print(f"  ⊘ Memory not saved: {reason}")
        return {"memory_saved": False, "save_reason": reason}

    return save_memory_node
