"""
Document processing utilities - extract text, chunk, embed, store.
Extracted from Temporal activities for use with API endpoints.
"""
import os
import json
import base64
from pathlib import Path
from typing import Dict, Any
from sqlmodel import Session, text
from openai import OpenAI
import voyageai

from app.core.db import engine


def get_voyage_client():
    """Get Voyage AI client."""
    return voyageai.Client(api_key=os.getenv("VOYAGE_API_KEY"))


def extract_text_with_vision(file_path: str) -> str:
    """
    Extract text from image using vision LLM (Gemini 2.0 Flash free, fallback to GPT-4o-mini).
    """
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY")
    )

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
                            "text": "Extract all text content from this image. Provide the text in a clear, structured format suitable for a knowledge base."
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/png;base64,{image_data}"}
                        }
                    ]
                }
            ],
            timeout=30
        )
        return response.choices[0].message.content
    except Exception as e:
        # Fallback to GPT-4o-mini
        print(f"Gemini failed, using GPT-4o-mini fallback: {e}")
        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract all text content from this image. Provide the text in a clear, structured format suitable for a knowledge base."
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/png;base64,{image_data}"}
                        }
                    ]
                }
            ],
            timeout=30
        )
        return response.choices[0].message.content


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
        Dictionary with processing stats
    """
    try:
        # 1. Extract text
        file_ext = Path(file_path).suffix.lower()
        is_image = file_ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff']

        if is_image:
            full_text = extract_text_with_vision(file_path)
        else:
            from docling.document_converter import DocumentConverter
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

        # 2. Chunk by paragraphs
        paragraphs = [p.strip() for p in full_text.split('\n\n') if p.strip()]
        chunks = []
        current_chunk = ""

        for para in paragraphs:
            if len(current_chunk) + len(para) < chunk_size:
                current_chunk += "\n\n" + para if current_chunk else para
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = para

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

        # 3. Generate embeddings
        client = get_voyage_client()
        embedding_response = client.embed(
            texts=chunks,
            model="voyage-3",
            input_type="document"
        )
        embeddings = embedding_response.embeddings
        total_tokens = embedding_response.total_tokens

        # 4. Store chunks in knowledge_base
        filename = Path(file_path).name

        with Session(engine) as session:
            for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                insert_query = text("""
                    INSERT INTO knowledge_base (
                        agent_id, block_id, content, category, title,
                        embedding, metadata_json, is_active, created_at, updated_at
                    ) VALUES (
                        :agent_id, :block_id, :content, :category, :title,
                        :embedding, :metadata_json, true, NOW(), NOW()
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

        # 5. Update block status
        with Session(engine) as session:
            update_query = text("""
                UPDATE blocks
                SET is_active = true,
                    metadata_ = jsonb_build_object(
                        'status', 'completed',
                        'chunks_created', :chunks_created,
                        'total_tokens', :total_tokens
                    )
                WHERE id = :block_id
            """)
            session.execute(update_query, {
                "block_id": block_id,
                "chunks_created": len(chunks),
                "total_tokens": total_tokens
            })
            session.commit()

        return {
            "chunks_created": len(chunks),
            "total_tokens": total_tokens,
            "status": "success"
        }

    except Exception as e:
        # Update block status to error
        try:
            with Session(engine) as session:
                update_query = text("""
                    UPDATE blocks
                    SET metadata_ = jsonb_build_object('status', 'error', 'error', :error_msg)
                    WHERE id = :block_id
                """)
                session.execute(update_query, {"block_id": block_id, "error_msg": str(e)})
                session.commit()
        except:
            pass

        return {
            "chunks_created": 0,
            "total_tokens": 0,
            "status": "error",
            "error": str(e)
        }
