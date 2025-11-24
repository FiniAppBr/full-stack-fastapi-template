"""
Semantic chunking for Nina knowledge base.

Chunks by topic/conversation unit, not arbitrary token limits.
"""
import re
from datetime import datetime
from pathlib import Path
from sqlmodel import Session, select, delete
from app.core.db import engine
from app.models import KnowledgeBase
from app.llm.voyage import embed_text


def parse_sales_knowledge(filepath: str) -> list[dict]:
    """Parse knowledge-sales.txt into semantic chunks."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    chunks = []

    # 1. Parse INCLUSO section
    incluso_match = re.search(r'INCLUSO no Aulas de Violão.*?\n\n.*?(?=Objeções|\Z)', content, re.DOTALL)
    if incluso_match:
        incluso_text = incluso_match.group(0).strip()
        # Split on bullet points
        items = re.split(r'\n•\s+', incluso_text)
        if items:
            # First item contains header
            header = items[0].split('\n')[0]
            rest = '\n'.join(items[0].split('\n')[1:])
            if rest.strip():
                items[0] = rest

            # Create chunks for groups of items
            chunk_text = f"{header}\n\n" + '\n'.join([f"• {item.strip()}" for item in items if item.strip()])
            chunks.append({
                'title': 'O que está incluído no curso',
                'content': chunk_text,
                'labels': ['curso', 'conteudo']
            })

    # 2. Parse Objections (numbered: "1. Objeção: ... Resposta: ...")
    objection_pattern = r'(\d+)\.\s*Objeção:\s*(.+?)\nResposta:\s*(.+?)(?=\n\n\d+\.\s*Objeção:|\n\n\n|$)'
    objections = re.findall(objection_pattern, content, re.DOTALL)

    for num, question, answer in objections:
        question = question.strip()
        answer = answer.strip()

        # Detect objection type from content
        labels = ['objecao']
        if any(word in question.lower() for word in ['tempo', 'ocupado']):
            labels.append('time')
        elif any(word in question.lower() for word in ['caro', 'dinheiro', 'investimento', 'parcelar']):
            labels.append('money')
        elif any(word in question.lower() for word in ['dom', 'talento', 'conseguir']):
            labels.append('confidence')
        elif any(word in question.lower() for word in ['online', 'presencial']):
            labels.append('method')
        elif any(word in question.lower() for word in ['violão', 'instrumento', 'equipamento']):
            labels.append('equipment')

        chunks.append({
            'title': f'Objeção: {question[:60]}...',
            'content': f'Objeção: {question}\n\nResposta: {answer}',
            'labels': labels
        })

    # 3. Parse conversation sections (CONEXÃO, DESCOBERTA, etc.)
    section_pattern = r'\d+\.\s+([A-Z][A-ZÁÉÍÓÚÃÕÂÊÔÇ\s]+)\n+\s*(.*?)(?=\n\d+\.\s+[A-Z][A-Z]|\Z)'
    sections = re.findall(section_pattern, content, re.DOTALL)

    for section_title, section_content in sections:
        section_title = section_title.strip()

        # Determine label based on section
        if 'CONEXÃO' in section_title or 'CONEXAO' in section_title:
            label = 'opener'
        elif 'DESCOBERTA' in section_title:
            label = 'discovery'
        elif 'VALIDAR' in section_title or 'INCENTIVAR' in section_title:
            label = 'validation'
        elif 'CAMINHO' in section_title or 'MÉTODO' in section_title:
            label = 'method'
        elif 'PROVA' in section_title:
            label = 'social_proof'
        elif 'INTENÇÃO' in section_title or 'INTENCAO' in section_title:
            label = 'intent_check'
        elif 'LINK' in section_title:
            label = 'closing'
        elif 'FOLLOW' in section_title:
            label = 'followup'
        elif 'VALOR' in section_title:
            label = 'value'
        else:
            label = 'general'

        # Split on numbered items within section
        items = re.split(r'\n\s+\d+\.\s+', section_content)
        items = [item.strip() for item in items if item.strip() and len(item.strip()) >= 20]

        # Group items to target 80-120 tokens per chunk
        grouped_chunks = []
        current_group = []
        current_tokens = 0

        for item in items:
            item_tokens = count_tokens(item)

            # If single item > 120 tokens, keep it alone
            if item_tokens > 120:
                if current_group:
                    grouped_chunks.append(current_group)
                    current_group = []
                    current_tokens = 0
                grouped_chunks.append([item])
            # If adding item keeps us under 120, add it
            elif current_tokens + item_tokens <= 120:
                current_group.append(item)
                current_tokens += item_tokens
            # If we're over 80 tokens, finalize chunk and start new
            elif current_tokens >= 80:
                grouped_chunks.append(current_group)
                current_group = [item]
                current_tokens = item_tokens
            # If under 80 but would exceed 120, start new chunk
            else:
                current_group.append(item)
                current_tokens += item_tokens

        # Add remaining group
        if current_group:
            grouped_chunks.append(current_group)

        # Create chunks from groups
        for i, group in enumerate(grouped_chunks):
            content = '\n\n'.join(group)

            # Title from first item preview
            first_item_preview = group[0][:60].replace('\n', ' ').strip()
            if len(group) > 1:
                title = f'{section_title} - Grupo {i+1} ({len(group)} itens)'
            else:
                title = f'{section_title} - {first_item_preview}...'

            chunks.append({
                'title': title,
                'content': content,
                'labels': [label]
            })

    # Final filter: remove chunks with < 20 tokens
    chunks = [c for c in chunks if count_tokens(c['content']) > 20]

    return chunks


def parse_course_knowledge(filepath: str) -> list[dict]:
    """Parse knowledge-course.txt into semantic chunks."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    chunks = []
    current_chunk = []
    current_title = None

    for line in lines:
        line = line.strip()

        # Detect section headers (lines with patterns like "**Header**" or all caps)
        if line.startswith('**') and line.endswith('**'):
            # Save previous chunk
            if current_chunk:
                chunks.append({
                    'title': current_title or 'Informação do curso',
                    'content': '\n'.join(current_chunk),
                    'labels': ['curso', 'faq']
                })

            # Start new chunk
            current_title = line.strip('*').strip()
            current_chunk = [line]

        elif line.isupper() and len(line) > 10:
            # All caps header
            if current_chunk:
                chunks.append({
                    'title': current_title or 'Informação do curso',
                    'content': '\n'.join(current_chunk),
                    'labels': ['curso', 'faq']
                })

            current_title = line
            current_chunk = [line]

        elif line:
            current_chunk.append(line)

        elif current_chunk:
            # Empty line - check if chunk is in target range (80-120 tokens)
            chunk_text = '\n'.join(current_chunk)
            chunk_tokens = count_tokens(chunk_text)

            # Break if we're at 80+ tokens OR exceeding 150 tokens
            if chunk_tokens >= 80 or chunk_tokens > 150:
                # Only save if chunk has meaningful content (>20 tokens)
                if chunk_tokens > 20:
                    chunks.append({
                        'title': current_title or 'Informação do curso',
                        'content': chunk_text,
                        'labels': ['curso', 'faq']
                    })
                current_chunk = []
                current_title = None

    # Save last chunk
    if current_chunk:
        chunk_text = '\n'.join(current_chunk)
        if count_tokens(chunk_text) > 20:  # Filter out tiny chunks
            chunks.append({
                'title': current_title or 'Informação do curso',
                'content': chunk_text,
                'labels': ['curso', 'faq']
            })

    # Final filter: remove chunks with < 20 tokens
    chunks = [c for c in chunks if count_tokens(c['content']) > 20]

    return chunks


def count_tokens(text: str) -> int:
    """Rough token estimation."""
    return len(text.split()) + len(text) // 20


def split_oversized_chunk(chunk: dict, max_tokens: int = 150) -> list[dict]:
    """Split a chunk that exceeds max_tokens into smaller chunks."""
    content = chunk['content']
    tokens = count_tokens(content)

    if tokens <= max_tokens:
        return [chunk]

    # Split by double newlines (paragraphs) first
    paragraphs = content.split('\n\n')

    result_chunks = []
    current_chunk = []
    current_tokens = 0

    for para in paragraphs:
        para_tokens = count_tokens(para)

        # If single paragraph > max_tokens, split by sentences
        if para_tokens > max_tokens:
            sentences = para.split('. ')
            for sent in sentences:
                sent_tokens = count_tokens(sent)
                if current_tokens + sent_tokens <= max_tokens:
                    current_chunk.append(sent)
                    current_tokens += sent_tokens
                else:
                    if current_chunk:
                        result_chunks.append('\n\n'.join(current_chunk))
                    current_chunk = [sent]
                    current_tokens = sent_tokens
        # Normal paragraph
        elif current_tokens + para_tokens <= max_tokens:
            current_chunk.append(para)
            current_tokens += para_tokens
        else:
            if current_chunk:
                result_chunks.append('\n\n'.join(current_chunk))
            current_chunk = [para]
            current_tokens = para_tokens

    # Add remaining
    if current_chunk:
        result_chunks.append('\n\n'.join(current_chunk))

    # Create chunk dicts
    split_chunks = []
    for i, content_part in enumerate(result_chunks):
        if count_tokens(content_part) > 20:  # Only keep meaningful chunks
            title = f"{chunk['title']} (parte {i+1})" if len(result_chunks) > 1 else chunk['title']
            split_chunks.append({
                'title': title,
                'content': content_part,
                'labels': chunk['labels']
            })

    return split_chunks if split_chunks else [chunk]


def rechunk_nina():
    """Rechunk Nina knowledge base."""
    print("Starting semantic rechunking...")

    # Parse both files
    sales_path = Path("/opt/connectai/docs/fingerstyle/knowledge-sales.txt")
    course_path = Path("/opt/connectai/docs/fingerstyle/knowledge-course.txt")

    all_chunks = []

    if sales_path.exists():
        print(f"\nParsing {sales_path}...")
        sales_chunks = parse_sales_knowledge(str(sales_path))
        all_chunks.extend(sales_chunks)
        print(f"  Extracted {len(sales_chunks)} chunks")

    if course_path.exists():
        print(f"\nParsing {course_path}...")
        course_chunks = parse_course_knowledge(str(course_path))
        all_chunks.extend(course_chunks)
        print(f"  Extracted {len(course_chunks)} chunks")

    print(f"\nTotal chunks: {len(all_chunks)}")

    # Post-process: split oversized chunks (>150 tokens)
    print("\nSplitting oversized chunks...")
    final_chunks = []
    for chunk in all_chunks:
        split_chunks = split_oversized_chunk(chunk, max_tokens=150)
        final_chunks.extend(split_chunks)

    if len(final_chunks) != len(all_chunks):
        print(f"  Split {len(all_chunks)} chunks into {len(final_chunks)} chunks")

    all_chunks = final_chunks

    # Delete existing chunks
    with Session(engine) as session:
        print("\nDeleting existing chunks...")
        stmt = delete(KnowledgeBase).where(KnowledgeBase.agent_id == "nina")
        result = session.exec(stmt)
        session.commit()
        print(f"  Deleted {result.rowcount} old chunks")

    # Insert new chunks
    print("\nInserting new chunks...")
    batch_size = 50

    for i in range(0, len(all_chunks), batch_size):
        batch = all_chunks[i:i+batch_size]

        # Generate embeddings for batch
        texts = [chunk['content'] for chunk in batch]
        print(f"  Embedding batch {i//batch_size + 1}/{(len(all_chunks) + batch_size - 1)//batch_size}...")

        try:
            embeddings, _ = embed_text(texts, input_type="document")
        except Exception as e:
            print(f"    Embedding error: {e}")
            embeddings = [None] * len(texts)

        # Insert to database
        with Session(engine) as session:
            for chunk, embedding in zip(batch, embeddings):
                token_count = count_tokens(chunk['content'])

                now = datetime.utcnow()
                kb = KnowledgeBase(
                    agent_id="nina",
                    content=chunk['content'],
                    title=chunk['title'],
                    labels=chunk['labels'],
                    token_count=token_count,
                    embedding=embedding,
                    category="sales",
                    is_active=True,
                    created_at=now,
                    updated_at=now
                )
                session.add(kb)

            session.commit()
            print(f"    Inserted {len(batch)} chunks")

    print("\n✅ Rechunking complete!")

    # Print stats
    with Session(engine) as session:
        stmt = select(KnowledgeBase).where(KnowledgeBase.agent_id == "nina")
        chunks = session.exec(stmt).all()

        tokens = [c.token_count for c in chunks]
        print(f"\nFinal stats:")
        print(f"  Total chunks: {len(chunks)}")
        print(f"  Avg tokens: {sum(tokens)//len(tokens)}")
        print(f"  Min tokens: {min(tokens)}")
        print(f"  Max tokens: {max(tokens)}")


if __name__ == "__main__":
    rechunk_nina()
