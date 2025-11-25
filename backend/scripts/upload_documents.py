"""
Upload documents as entities and create chunks.

Usage:
    python -m scripts.upload_documents /path/to/file.txt
    python -m scripts.upload_documents /path/to/directory/

This script:
1. Creates an Entity with category="documents" for each file
2. Chunks the text semantically
3. Creates KnowledgeBase entries with agent_id="entity:{id}"
4. Generates embeddings for each chunk
"""

import re
import sys
from datetime import datetime
from pathlib import Path
from sqlmodel import Session

from app.core.db import engine
from app.models import Entity, KnowledgeBase
from app.llm.voyage import embed_text


def estimate_tokens(text: str) -> int:
    """Estimate token count (roughly 4 chars per token for Portuguese)."""
    return len(text) // 4


def format_file_size(size_bytes: int) -> str:
    """Format file size to human readable."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"


def chunk_text(text: str, max_tokens: int = 150, min_tokens: int = 20) -> list[dict]:
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
                    if current_chunk and current_tokens >= min_tokens:
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
            if current_chunk and current_tokens >= min_tokens:
                chunks.append({
                    'content': '\n\n'.join(current_chunk),
                    'tokens': current_tokens
                })
            current_chunk = [para]
            current_tokens = para_tokens

    # Don't forget the last chunk
    if current_chunk and current_tokens >= min_tokens:
        chunks.append({
            'content': '\n\n'.join(current_chunk),
            'tokens': current_tokens
        })

    return chunks


def upload_document(filepath: Path) -> dict:
    """
    Upload a single document file.

    Returns:
        dict with entity_id, chunks_created, total_tokens
    """
    print(f"\n📄 Processing: {filepath.name}")

    # Read file content
    try:
        content = filepath.read_text(encoding='utf-8')
    except Exception as e:
        print(f"  ❌ Failed to read file: {e}")
        return None

    file_size = filepath.stat().st_size
    print(f"  Size: {format_file_size(file_size)}")

    # Create chunks
    chunks = chunk_text(content, max_tokens=150, min_tokens=20)
    print(f"  Chunks: {len(chunks)}")

    if not chunks:
        print("  ⚠️ No chunks created (file too small?)")
        return None

    # Calculate total tokens
    total_tokens = sum(c['tokens'] for c in chunks)
    print(f"  Total tokens: {total_tokens}")

    with Session(engine) as session:
        # Create entity
        now = datetime.utcnow()
        entity = Entity(
            name=filepath.name,
            category="documents",
            template="text_file",
            data={
                "file_name": filepath.name,
                "file_size": format_file_size(file_size),
                "chunk_count": len(chunks)
            },
            is_processed=True,
            processed_at=now,
            created_at=now,
            updated_at=now
        )
        session.add(entity)
        session.flush()  # Get entity ID

        entity_id = entity.id
        agent_id = f"entity:{entity_id}"
        print(f"  Entity ID: {entity_id}")

        # Generate embeddings for all chunks
        print(f"  Generating embeddings...")
        texts = [c['content'] for c in chunks]
        try:
            embeddings, _ = embed_text(texts, input_type="document")
        except Exception as e:
            print(f"  ⚠️ Embedding error: {e}")
            embeddings = [None] * len(texts)

        # Create knowledge base entries
        chunk_ids = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            kb = KnowledgeBase(
                agent_id=agent_id,
                content=chunk['content'],
                title=f"{filepath.name} - Part {i + 1}",
                token_count=chunk['tokens'],
                embedding=embedding,
                category="document",
                is_active=True,
                created_at=now,
                updated_at=now
            )
            session.add(kb)
            session.flush()
            chunk_ids.append(kb.id)

        # Update entity with chunk_ids
        entity.chunk_ids = chunk_ids
        session.add(entity)
        session.commit()

        print(f"  ✅ Created {len(chunk_ids)} chunks")

        return {
            "entity_id": entity_id,
            "chunks_created": len(chunk_ids),
            "total_tokens": total_tokens
        }


def main():
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.upload_documents <file_or_directory>")
        print("")
        print("Examples:")
        print("  python -m scripts.upload_documents /path/to/file.txt")
        print("  python -m scripts.upload_documents /path/to/directory/")
        sys.exit(1)

    path = Path(sys.argv[1])

    if not path.exists():
        print(f"❌ Path does not exist: {path}")
        sys.exit(1)

    # Collect files to process
    if path.is_file():
        files = [path]
    else:
        # Get all .txt and .md files in directory
        files = list(path.glob("*.txt")) + list(path.glob("*.md"))

    if not files:
        print(f"❌ No .txt or .md files found in: {path}")
        sys.exit(1)

    print(f"📁 Found {len(files)} file(s) to process")

    results = []
    for filepath in files:
        result = upload_document(filepath)
        if result:
            results.append(result)

    # Summary
    print("\n" + "=" * 50)
    print("📊 Summary")
    print("=" * 50)
    print(f"Files processed: {len(results)}/{len(files)}")
    print(f"Total chunks: {sum(r['chunks_created'] for r in results)}")
    print(f"Total tokens: {sum(r['total_tokens'] for r in results)}")


if __name__ == "__main__":
    main()
