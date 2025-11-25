"""
Knowledge Base API - CRUD for RAG chunks.

Provides:
- Full CRUD for knowledge chunks
- Document upload and auto-chunking
- Search and filtering
- Bulk operations
"""

import io
import re
from datetime import datetime
from typing import Any, Optional, List

from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel
from sqlmodel import Session, select, col, func

from app.core.db import engine
from app.models.knowledge import KnowledgeBase
from app.llm.voyage import embed_text


router = APIRouter(prefix="/knowledge", tags=["knowledge"])


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class ChunkCreate(BaseModel):
    """Create a new chunk."""
    content: str
    title: Optional[str] = None
    category: str = "general"
    agent_id: str = "nina"


class ChunkUpdate(BaseModel):
    """Update an existing chunk."""
    content: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class ChunkPublic(BaseModel):
    """Public chunk response."""
    id: int
    content: str
    title: Optional[str]
    category: str
    agent_id: str
    token_count: int
    is_active: bool
    has_embedding: bool
    created_at: datetime
    updated_at: datetime


class ChunksPublic(BaseModel):
    """List of chunks response."""
    data: List[ChunkPublic]
    count: int
    total_tokens: int


class ChunkStats(BaseModel):
    """Knowledge base statistics."""
    total_chunks: int
    active_chunks: int
    total_tokens: int
    chunks_with_embeddings: int
    categories: List[dict]


class DocumentChunkResult(BaseModel):
    """Result of document chunking."""
    filename: str
    chunks_created: int
    total_tokens: int
    chunk_ids: List[int]


# =============================================================================
# HELPERS
# =============================================================================

def estimate_tokens(text: str) -> int:
    """Estimate token count (roughly 4 chars per token for Portuguese)."""
    return len(text) // 4


def chunk_to_public(chunk: KnowledgeBase) -> ChunkPublic:
    """Convert DB chunk to public response."""
    return ChunkPublic(
        id=chunk.id,
        content=chunk.content,
        title=chunk.title,
        category=chunk.category,
        agent_id=chunk.agent_id,
        token_count=chunk.token_count,
        is_active=chunk.is_active,
        has_embedding=chunk.embedding is not None,
        created_at=chunk.created_at or datetime.utcnow(),
        updated_at=chunk.updated_at or datetime.utcnow(),
    )


def generate_embedding(text: str) -> Optional[List[float]]:
    """Generate embedding for a single text."""
    try:
        embeddings, _ = embed_text([text], input_type="document")
        return embeddings[0] if embeddings else None
    except Exception as e:
        print(f"Embedding error: {e}")
        return None


def chunk_text(text: str, max_tokens: int = 150, overlap: int = 20) -> List[dict]:
    """
    Chunk text into smaller pieces.

    Strategy:
    1. Split by double newlines (paragraphs)
    2. If paragraph > max_tokens, split by sentences
    3. Group small paragraphs together up to max_tokens
    """
    paragraphs = text.split('\n\n')
    chunks = []
    current_chunk = []
    current_tokens = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        para_tokens = estimate_tokens(para)

        # If paragraph is too big, split by sentences
        if para_tokens > max_tokens:
            sentences = re.split(r'(?<=[.!?])\s+', para)
            for sent in sentences:
                sent_tokens = estimate_tokens(sent)
                if current_tokens + sent_tokens <= max_tokens:
                    current_chunk.append(sent)
                    current_tokens += sent_tokens
                else:
                    if current_chunk:
                        chunks.append({
                            'content': ' '.join(current_chunk),
                            'tokens': current_tokens
                        })
                    current_chunk = [sent]
                    current_tokens = sent_tokens
        # Normal paragraph - add if fits
        elif current_tokens + para_tokens <= max_tokens:
            current_chunk.append(para)
            current_tokens += para_tokens
        else:
            # Save current and start new
            if current_chunk:
                chunks.append({
                    'content': '\n\n'.join(current_chunk),
                    'tokens': current_tokens
                })
            current_chunk = [para]
            current_tokens = para_tokens

    # Don't forget the last chunk
    if current_chunk:
        chunks.append({
            'content': '\n\n'.join(current_chunk),
            'tokens': current_tokens
        })

    return chunks


# =============================================================================
# CRUD ENDPOINTS
# =============================================================================

@router.get("", response_model=ChunksPublic)
def list_chunks(
    agent_id: str = Query(default="nina", description="Filter by agent"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
    search: Optional[str] = Query(default=None, description="Search in title/content"),
    active_only: bool = Query(default=True, description="Only show active chunks"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=200),
) -> Any:
    """List knowledge chunks with filtering."""
    with Session(engine) as session:
        # Base query
        query = select(KnowledgeBase).where(KnowledgeBase.agent_id == agent_id)

        if active_only:
            query = query.where(KnowledgeBase.is_active == True)

        if category:
            query = query.where(KnowledgeBase.category == category)

        results = session.exec(query).all()

        # Filter in Python for text search
        filtered = []
        for chunk in results:
            # Text search
            if search:
                search_lower = search.lower()
                title_match = chunk.title and search_lower in chunk.title.lower()
                content_match = search_lower in chunk.content.lower()
                if not (title_match or content_match):
                    continue

            filtered.append(chunk)

        # Pagination
        total = len(filtered)
        paginated = filtered[skip:skip + limit]

        return ChunksPublic(
            data=[chunk_to_public(c) for c in paginated],
            count=total,
            total_tokens=sum(c.token_count for c in filtered)
        )


@router.get("/stats", response_model=ChunkStats)
def get_stats(agent_id: str = Query(default="nina")) -> Any:
    """Get knowledge base statistics."""
    with Session(engine) as session:
        chunks = session.exec(
            select(KnowledgeBase).where(KnowledgeBase.agent_id == agent_id)
        ).all()

        # Count categories
        category_counts = {}
        for chunk in chunks:
            cat = chunk.category or "unknown"
            category_counts[cat] = category_counts.get(cat, 0) + 1

        return ChunkStats(
            total_chunks=len(chunks),
            active_chunks=sum(1 for c in chunks if c.is_active),
            total_tokens=sum(c.token_count for c in chunks),
            chunks_with_embeddings=sum(1 for c in chunks if c.embedding is not None),
            categories=sorted(
                [{"category": c, "count": n} for c, n in category_counts.items()],
                key=lambda x: -x["count"]
            )
        )


@router.get("/{chunk_id}", response_model=ChunkPublic)
def get_chunk(chunk_id: int) -> Any:
    """Get a specific chunk by ID."""
    with Session(engine) as session:
        chunk = session.get(KnowledgeBase, chunk_id)
        if not chunk:
            raise HTTPException(status_code=404, detail="Chunk not found")
        return chunk_to_public(chunk)


@router.post("", response_model=ChunkPublic)
def create_chunk(chunk_in: ChunkCreate) -> Any:
    """Create a new knowledge chunk."""
    with Session(engine) as session:
        # Estimate tokens
        token_count = estimate_tokens(chunk_in.content)

        # Generate embedding
        embedding = generate_embedding(chunk_in.content)

        chunk = KnowledgeBase(
            content=chunk_in.content,
            title=chunk_in.title,
            category=chunk_in.category,
            agent_id=chunk_in.agent_id,
            token_count=token_count,
            embedding=embedding,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        session.add(chunk)
        session.commit()
        session.refresh(chunk)

        return chunk_to_public(chunk)


@router.patch("/{chunk_id}", response_model=ChunkPublic)
def update_chunk(chunk_id: int, chunk_in: ChunkUpdate) -> Any:
    """Update an existing chunk."""
    with Session(engine) as session:
        chunk = session.get(KnowledgeBase, chunk_id)
        if not chunk:
            raise HTTPException(status_code=404, detail="Chunk not found")

        # Update fields
        update_data = chunk_in.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(chunk, field, value)

        # Recalculate tokens if content changed
        if "content" in update_data:
            chunk.token_count = estimate_tokens(chunk.content)
            # Regenerate embedding
            chunk.embedding = generate_embedding(chunk.content)

        chunk.updated_at = datetime.utcnow()

        session.add(chunk)
        session.commit()
        session.refresh(chunk)

        return chunk_to_public(chunk)


@router.delete("/{chunk_id}")
def delete_chunk(chunk_id: int, hard: bool = Query(default=False)) -> Any:
    """Delete a chunk (soft delete by default)."""
    with Session(engine) as session:
        chunk = session.get(KnowledgeBase, chunk_id)
        if not chunk:
            raise HTTPException(status_code=404, detail="Chunk not found")

        if hard:
            session.delete(chunk)
        else:
            chunk.is_active = False
            chunk.updated_at = datetime.utcnow()
            session.add(chunk)

        session.commit()
        return {"ok": True, "deleted": chunk_id, "hard": hard}


# =============================================================================
# BULK OPERATIONS
# =============================================================================

@router.post("/bulk", response_model=dict)
def create_bulk_chunks(
    chunks: List[ChunkCreate],
    generate_embeddings: bool = Query(default=True),
) -> Any:
    """Create multiple chunks at once."""
    with Session(engine) as session:
        created_ids = []

        # Prepare all texts for batch embedding
        if generate_embeddings:
            texts = [c.content for c in chunks]
            try:
                embeddings, _ = embed_text(texts, input_type="document")
            except Exception as e:
                print(f"Batch embedding error: {e}")
                embeddings = [None] * len(texts)
        else:
            embeddings = [None] * len(chunks)

        for chunk_in, embedding in zip(chunks, embeddings):
            chunk = KnowledgeBase(
                content=chunk_in.content,
                title=chunk_in.title,
                category=chunk_in.category,
                agent_id=chunk_in.agent_id,
                token_count=estimate_tokens(chunk_in.content),
                embedding=embedding,
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(chunk)
            session.flush()
            created_ids.append(chunk.id)

        session.commit()

        return {
            "ok": True,
            "created": len(created_ids),
            "chunk_ids": created_ids
        }


@router.delete("/bulk")
def delete_bulk_chunks(
    chunk_ids: List[int],
    hard: bool = Query(default=False),
) -> Any:
    """Delete multiple chunks at once."""
    with Session(engine) as session:
        deleted = 0
        for chunk_id in chunk_ids:
            chunk = session.get(KnowledgeBase, chunk_id)
            if chunk:
                if hard:
                    session.delete(chunk)
                else:
                    chunk.is_active = False
                    chunk.updated_at = datetime.utcnow()
                    session.add(chunk)
                deleted += 1

        session.commit()
        return {"ok": True, "deleted": deleted}


# =============================================================================
# DOCUMENT UPLOAD & CHUNKING
# =============================================================================

@router.post("/upload", response_model=DocumentChunkResult)
async def upload_document(
    file: UploadFile = File(...),
    agent_id: str = Form(default="nina"),
    category: str = Form(default="document"),
    max_chunk_tokens: int = Form(default=150),
) -> Any:
    """
    Upload a document and auto-chunk it.

    Supports: .txt, .md files
    Returns: List of created chunk IDs
    """
    # Validate file type
    filename = file.filename or "document.txt"
    if not filename.endswith(('.txt', '.md')):
        raise HTTPException(
            status_code=400,
            detail="Only .txt and .md files are supported"
        )

    # Read content
    content = await file.read()
    try:
        text = content.decode('utf-8')
    except UnicodeDecodeError:
        text = content.decode('latin-1')

    # Chunk the text
    text_chunks = chunk_text(text, max_tokens=max_chunk_tokens)

    if not text_chunks:
        raise HTTPException(status_code=400, detail="No content found in document")

    # Generate embeddings in batch
    texts = [c['content'] for c in text_chunks]
    try:
        embeddings, _ = embed_text(texts, input_type="document")
    except Exception as e:
        print(f"Embedding error: {e}")
        embeddings = [None] * len(texts)

    # Create chunks in database
    chunk_ids = []
    total_tokens = 0

    with Session(engine) as session:
        for i, (chunk_data, embedding) in enumerate(zip(text_chunks, embeddings)):
            # Generate title from first line or content preview
            first_line = chunk_data['content'].split('\n')[0][:60]
            title = f"{filename} - Part {i+1}: {first_line}..."

            chunk = KnowledgeBase(
                content=chunk_data['content'],
                title=title,
                category=category,
                agent_id=agent_id,
                token_count=chunk_data['tokens'],
                embedding=embedding,
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(chunk)
            session.flush()
            chunk_ids.append(chunk.id)
            total_tokens += chunk_data['tokens']

        session.commit()

    return DocumentChunkResult(
        filename=filename,
        chunks_created=len(chunk_ids),
        total_tokens=total_tokens,
        chunk_ids=chunk_ids
    )


# =============================================================================
# EMBEDDING OPERATIONS
# =============================================================================

@router.post("/{chunk_id}/embed")
def regenerate_embedding(chunk_id: int) -> Any:
    """Regenerate embedding for a specific chunk."""
    with Session(engine) as session:
        chunk = session.get(KnowledgeBase, chunk_id)
        if not chunk:
            raise HTTPException(status_code=404, detail="Chunk not found")

        embedding = generate_embedding(chunk.content)
        chunk.embedding = embedding
        chunk.updated_at = datetime.utcnow()

        session.add(chunk)
        session.commit()

        return {"ok": True, "chunk_id": chunk_id, "has_embedding": embedding is not None}


@router.post("/embed-all")
def regenerate_all_embeddings(
    agent_id: str = Query(default="nina"),
    only_missing: bool = Query(default=True),
) -> Any:
    """Regenerate embeddings for all chunks (or only those missing)."""
    with Session(engine) as session:
        query = select(KnowledgeBase).where(
            KnowledgeBase.agent_id == agent_id,
            KnowledgeBase.is_active == True
        )

        chunks = session.exec(query).all()

        # Filter if only missing
        if only_missing:
            chunks = [c for c in chunks if c.embedding is None]

        if not chunks:
            return {"ok": True, "updated": 0, "message": "No chunks to update"}

        # Batch embed
        texts = [c.content for c in chunks]
        try:
            embeddings, _ = embed_text(texts, input_type="document")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Embedding error: {e}")

        # Update chunks
        for chunk, embedding in zip(chunks, embeddings):
            chunk.embedding = embedding
            chunk.updated_at = datetime.utcnow()
            session.add(chunk)

        session.commit()

        return {"ok": True, "updated": len(chunks)}
