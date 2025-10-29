"""
Knowledge retrieval and document processing activities for RAG using pgvector semantic search.
"""
import os
import json
import base64
from pathlib import Path
from typing import List, Dict, Any
from temporalio import activity
from sqlmodel import Session, create_engine, select, text
from docling.document_converter import DocumentConverter
from openai import OpenAI
import voyageai

# Voyage AI client will be initialized lazily in the activity
def get_voyage_client():
    return voyageai.Client(api_key=os.getenv("VOYAGE_API_KEY"))

# Vision LLM helper function
def extract_text_with_vision(file_path: str) -> str:
    """
    Extract text from image using vision LLM (Gemini 2.0 Flash free, fallback to GPT-4o-mini)
    Cost: FREE for Gemini (1500/day), or ~$0.0004 per image for GPT-4o-mini
    """
    # Initialize OpenRouter client
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY")
    )

    # Read and encode image
    with open(file_path, 'rb') as f:
        image_data = base64.b64encode(f.read()).decode('utf-8')

    # Try Gemini 2.0 Flash first (FREE)
    try:
        response = client.chat.completions.create(
            model="google/gemini-2.0-flash-exp:free",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract all text content from this image. Provide the text in a clear, structured format suitable for a knowledge base. Include any important context about what the document contains."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{image_data}"
                            }
                        }
                    ]
                }
            ],
            timeout=30
        )
        return response.choices[0].message.content
    except Exception as e:
        # Fallback to GPT-4o-mini if Gemini fails
        print(f"Gemini failed, using GPT-4o-mini fallback: {e}")
        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract all text content from this image. Provide the text in a clear, structured format suitable for a knowledge base. Include any important context about what the document contains."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{image_data}"
                            }
                        }
                    ]
                }
            ],
            timeout=30
        )
        return response.choices[0].message.content

# Build database URL from environment variables
DB_USER = os.getenv("POSTGRES_USER", "connectai")
DB_PASS = os.getenv("POSTGRES_PASSWORD")
DB_HOST = os.getenv("POSTGRES_SERVER", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "connectai")
DATABASE_URI = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Database engine
engine = create_engine(DATABASE_URI)


@activity.defn
async def search_knowledge(
    query: str,
    agent_id: str,
    limit: int = 5,
    similarity_threshold: float = 0.7
) -> Dict[str, Any]:
    """
    Semantic search over knowledge base using pgvector cosine similarity.

    Args:
        query: User's question or search query
        agent_id: Filter results to this agent/business
        limit: Maximum number of results to return
        similarity_threshold: Minimum similarity score (0.0-1.0)

    Returns:
        Dictionary with:
        - chunks: List of knowledge chunks sorted by relevance
        - embedding_tokens: Actual token count from Voyage API
    """
    # Generate embedding for the query using Voyage AI
    client = get_voyage_client()
    embedding_response = client.embed(
        texts=[query],
        model="voyage-3.5",
        input_type="query"  # Specify this is a query (vs document)
    )
    query_embedding = embedding_response.embeddings[0]
    embedding_tokens = embedding_response.total_tokens  # Get actual token count

    with Session(engine) as session:
        # Perform vector similarity search using pgvector's <=> operator
        # Note: <=> returns distance (lower is better), we convert to similarity
        query_text = text("""
            SELECT
                id,
                content,
                category,
                title,
                metadata_json,
                1 - (embedding <=> :query_embedding) as similarity
            FROM knowledge_base
            WHERE agent_id = :agent_id
              AND is_active = true
              AND (1 - (embedding <=> :query_embedding)) >= :threshold
            ORDER BY embedding <=> :query_embedding
            LIMIT :limit
        """)

        results = session.execute(
            query_text,
            {
                "query_embedding": str(query_embedding),
                "agent_id": agent_id,
                "threshold": similarity_threshold,
                "limit": limit
            }
        ).fetchall()

        # Format results
        knowledge_chunks = []
        for row in results:
            knowledge_chunks.append({
                "id": row.id,
                "content": row.content,
                "category": row.category,
                "title": row.title,
                "similarity": float(row.similarity),
                "metadata": row.metadata_json
            })

        return {
            "chunks": knowledge_chunks,
            "embedding_tokens": embedding_tokens
        }


@activity.defn
async def process_document(
    file_path: str,
    block_id: int,
    agent_id: int,
    category: str = "general",
    chunk_size: int = 500
) -> Dict[str, Any]:
    """
    Process uploaded document: extract text, chunk, generate embeddings, store in knowledge base.

    Args:
        file_path: Path to uploaded file
        block_id: ID of the block that stores this file
        agent_id: Agent/business ID
        category: Knowledge category (e.g., 'pricing', 'services', 'policies')
        chunk_size: Approximate character count per chunk

    Returns:
        Dictionary with processing stats:
        - chunks_created: Number of knowledge chunks created
        - total_tokens: Total embedding tokens used
        - status: 'success' or 'error'
        - error: Error message if failed
    """
    try:
        # 1. Extract text - route to appropriate service
        file_ext = Path(file_path).suffix.lower()
        is_image = file_ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff']

        if is_image:
            # Use vision LLM for images (Gemini 2.0 Flash free, GPT-4o-mini fallback)
            full_text = extract_text_with_vision(file_path)
        else:
            # Use Docling for PDFs and Office docs (local, fast for text)
            converter = DocumentConverter()
            result = converter.convert(file_path)
            full_text = result.document.export_to_markdown()

        if not full_text or len(full_text.strip()) < 10:
            return {
                "chunks_created": 0,
                "total_tokens": 0,
                "status": "error",
                "error": "No text content extracted from document"
            }

        # 2. Simple chunking by paragraphs (keeping it simple for MVP)
        # Split on double newlines, filter empty chunks, limit size
        paragraphs = [p.strip() for p in full_text.split('\n\n') if p.strip()]

        # Merge small paragraphs, split large ones
        chunks = []
        current_chunk = ""

        for para in paragraphs:
            if len(current_chunk) + len(para) < chunk_size:
                current_chunk += "\n\n" + para if current_chunk else para
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = para

                # Split very large paragraphs
                if len(para) > chunk_size * 2:
                    sentences = para.split('. ')
                    temp = ""
                    for sent in sentences:
                        if len(temp) + len(sent) < chunk_size:
                            temp += sent + ". "
                        else:
                            if temp:
                                chunks.append(temp.strip())
                            temp = sent + ". "
                    current_chunk = temp.strip()

        if current_chunk:
            chunks.append(current_chunk)

        if not chunks:
            return {
                "chunks_created": 0,
                "total_tokens": 0,
                "status": "error",
                "error": "No chunks created from document"
            }

        # 3. Generate embeddings for all chunks using Voyage AI
        client = get_voyage_client()
        embedding_response = client.embed(
            texts=chunks,
            model="voyage-3.5",
            input_type="document"  # Specify this is document content
        )
        embeddings = embedding_response.embeddings
        total_tokens = embedding_response.total_tokens

        # 4. Store chunks in knowledge_base
        filename = Path(file_path).name

        with Session(engine) as session:
            for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                # Insert into knowledge_base
                insert_query = text("""
                    INSERT INTO knowledge_base (
                        agent_id,
                        block_id,
                        content,
                        category,
                        title,
                        embedding,
                        metadata_json,
                        is_active
                    ) VALUES (
                        :agent_id,
                        :block_id,
                        :content,
                        :category,
                        :title,
                        :embedding,
                        :metadata_json,
                        true
                    )
                """)

                session.execute(insert_query, {
                    "agent_id": agent_id,
                    "block_id": block_id,
                    "content": chunk,
                    "category": category,
                    "title": f"{filename} - Part {idx + 1}",
                    "embedding": str(embedding),
                    "metadata_json": json.dumps({
                        "source_file": filename,
                        "chunk_index": idx,
                        "chunk_count": len(chunks)
                    })
                })

            session.commit()

        # 5. Update block status to 'completed' and activate
        with Session(engine) as session:
            update_query = text("""
                UPDATE blocks
                SET is_active = true,
                    metadata_ = jsonb_set(
                        metadata_,
                        '{status}',
                        '"completed"'
                    )
                WHERE id = :block_id
            """)
            session.execute(update_query, {"block_id": block_id})
            session.commit()

        return {
            "chunks_created": len(chunks),
            "total_tokens": total_tokens,
            "status": "success"
        }

    except Exception as e:
        # Update block status to 'error'
        try:
            with Session(engine) as session:
                update_query = text("""
                    UPDATE blocks
                    SET metadata_ = jsonb_set(
                        jsonb_set(
                            metadata_,
                            '{status}',
                            '"error"'
                        ),
                        '{error}',
                        :error_json
                    )
                    WHERE id = :block_id
                """)
                session.execute(update_query, {
                    "block_id": block_id,
                    "error_json": json.dumps(str(e))
                })
                session.commit()
        except:
            pass  # If we can't update the block, at least return the error

        return {
            "chunks_created": 0,
            "total_tokens": 0,
            "status": "error",
            "error": str(e)
        }
