# Knowledge Block Design

## Purpose
Allow users to add information that the agent can reference when answering customer questions.

## Block Structure (Already in DB)
```python
{
  "id": 1,
  "agent_id": 2,
  "block_type": "knowledge",
  "config": {
    "source_type": "text" | "file" | "faq",
    "content": "...",           # For text/FAQ
    "file_path": "...",         # For files
    "file_type": "pdf|docx|txt",
    "chunks": [...],            # Processed text chunks
    "embeddings": [...],        # Vector embeddings (optional, for optimization)
  }
}
```

## Functional Requirements

### 1. Knowledge Ingestion
**What happens when user creates a knowledge block:**

- **Text input**: User pastes text directly
  - Store as-is in `config.content`
  - Chunk on retrieval (no preprocessing)

- **File upload**: User uploads PDF/DOCX/TXT
  - Store file in `/opt/connectai/uploads/{agent_id}/`
  - Extract text on save
  - Store extracted text in `config.content`
  - Keep original file for reference

- **FAQ format**: User enters Q&A pairs
  - Structure: `[{"q": "...", "a": "..."}, ...]`
  - Store in `config.content` as JSON

### 2. Knowledge Retrieval (RAG)
**What happens when customer asks a question:**

```
Customer Question
    ↓
1. Fetch all knowledge blocks for agent
    ↓
2. Chunk all content into ~500 token pieces
    ↓
3. Embed question + all chunks (on-the-fly)
    ↓
4. Cosine similarity → top 3-5 chunks
    ↓
5. Inject into LLM prompt as context
    ↓
Agent Response
```

## Technology Stack (SIMPLE v0.1)

### Core RAG Pipeline
```bash
pip install langchain langchain-community sentence-transformers pypdf python-docx
```

**LangChain Components:**
- `RecursiveCharacterTextSplitter` - Smart chunking (respects paragraphs)
- `HuggingFaceEmbeddings` - Local embeddings (all-MiniLM-L6-v2, 384 dims)
- `FAISS` or in-memory search - Vector similarity (no pgvector yet)

**File Processing:**
- `PyPDF2` or `pypdf` - PDF text extraction
- `python-docx` - Word doc extraction
- Native Python - TXT files

### v0.1 Implementation (No Vector DB)
```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import FAISS

# On agent message received:
def retrieve_knowledge(agent_id: int, question: str):
    # 1. Fetch all knowledge blocks
    blocks = crud.get_blocks_by_agent(agent_id, block_type="knowledge")

    # 2. Combine all content
    all_text = "\n\n".join([b.config["content"] for b in blocks])

    # 3. Chunk
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_text(all_text)

    # 4. Create temp vector store
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vectorstore = FAISS.from_texts(chunks, embeddings)

    # 5. Similarity search
    docs = vectorstore.similarity_search(question, k=3)

    return [doc.page_content for doc in docs]
```

### API Endpoints Needed
```python
# Backend: app/api/routes/chat.py

@router.post("/api/v1/chat/{agent_id}")
async def chat_with_agent(
    agent_id: int,
    message: str,
    current_user: User = Depends(get_current_user)
):
    """
    1. Retrieve relevant knowledge chunks
    2. Build prompt with context
    3. Call Gemini Flash 2.5
    4. Return response
    """

    # RAG retrieval
    context_chunks = retrieve_knowledge(agent_id, message)

    # Build prompt
    prompt = f"""
    You are a customer service agent. Answer based on this context:

    Context:
    {"\n".join(context_chunks)}

    Customer: {message}
    Agent:
    """

    # Call LLM (Gemini)
    response = gemini_client.generate(prompt)

    return {"response": response}
```

## Performance Optimization (v0.2+)

### When to add pgvector:
- Agent has >10 knowledge blocks
- Total knowledge >50k tokens
- Response time >2 seconds

### Migration path:
1. Add `embedding` column to blocks table (vector type)
2. Pre-compute embeddings on block save
3. Use pgvector `<->` operator for search
4. Keep FAISS fallback for small agents

```sql
-- v0.2 migration
ALTER TABLE block ADD COLUMN embedding vector(384);
CREATE INDEX ON block USING ivfflat (embedding vector_cosine_ops);
```

## Edge Cases

1. **No knowledge blocks**: Return generic "I don't have info on that"
2. **Empty file**: Return error on upload
3. **Large files (>10MB)**: Reject with error
4. **Non-text PDFs (scanned)**: v0.1 = error, v0.2+ = OCR
5. **Multiple languages**: Embeddings model supports 50+ languages (works out of box)

## Success Metrics

- **Retrieval accuracy**: Top 3 chunks contain answer (manual eval, 10 test questions)
- **Response time**: <3 seconds (measure in logs)
- **User satisfaction**: "Was this helpful?" button

## Summary

**v0.1 (Ship Fast):**
- Store text/files in blocks
- On-the-fly RAG with FAISS
- Simple LLM prompt injection
- No pre-computation

**v0.2 (Optimize Later):**
- pgvector for large agents
- Pre-computed embeddings
- Hybrid search (keyword + semantic)
- Temporal workflow for async processing

**Key Philosophy**: Use LangChain + HuggingFace for 90% of the work. We only build the block→RAG bridge.
