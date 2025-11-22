"""
RAG search node - searches knowledge base using Voyage + pgvector.
"""
from app.agents.utils.knowledge import search_knowledge
from app.agents.utils.rag import build_knowledge_context


def create_rag_search_node():
    """Create RAG search node that searches knowledge base."""
    def rag_search_node(state: dict) -> dict:
        """Search knowledge base for relevant information."""
        print("→ RAG Search Node")

        messages = state.get("messages", [])
        agent_id = state.get("agent_id")
        excluded_tags = state.get("excluded_tags", [])

        if not messages or not agent_id:
            print("  No messages or agent_id, skipping RAG")
            return {"rag_context": ""}

        user_message = messages[-1].get("content", "")
        print(f"  Searching for: {user_message[:50]}...")

        try:
            result = search_knowledge(
                query=user_message,
                agent_id=agent_id,
                limit=5,
                similarity_threshold=0.6
            )

            chunks = result.get("chunks", [])
            embedding_tokens = result.get("embedding_tokens", 0)

            if excluded_tags:
                chunks = [c for c in chunks if c.get("category") not in excluded_tags]

            print(f"  Found {len(chunks)} relevant chunks (used {embedding_tokens} embedding tokens)")

            if not chunks:
                return {"rag_context": ""}

            rag_context = build_knowledge_context(chunks, max_tokens=500)
            return {"rag_context": rag_context}

        except Exception as e:
            print(f"  RAG search error: {e}")
            return {"rag_context": ""}

    return rag_search_node
