#!/usr/bin/env python3
"""
Load Nina knowledge chunks into the database.

Parses knowledge-course.txt and knowledge-sales.txt into labeled chunks
with embeddings for the v2 Context System.

Usage:
    cd /opt/connectai/backend
    source .venv/bin/activate
    python scripts/load_nina_chunks.py

    # Preview without inserting:
    python scripts/load_nina_chunks.py --dry-run

    # Clear existing Nina chunks first:
    python scripts/load_nina_chunks.py --clear
"""

import sys
import os
import re
import argparse
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv("/opt/connectai/.env")

from sqlmodel import Session, select
from app.core.db import engine
from app.models.knowledge import KnowledgeBase
from app.llm.voyage import embed_text


NINA_AGENT_ID = "nina"  # Agent ID for Nina chunks

# Label mappings for objection types (Portuguese)
OBJECTION_LABELS = {
    "não sei se vou conseguir": ["objecao", "objecao:talento"],
    "não tenho dom": ["objecao", "objecao:talento"],
    "não leva jeito": ["objecao", "objecao:talento"],
    "já tentei": ["objecao", "objecao:talento"],
    "não tenho tempo": ["objecao", "objecao:tempo"],
    "tempo pra estudar": ["objecao", "objecao:tempo"],
    "não tenho violão": ["objecao", "objecao:equipamento"],
    "violão é simples": ["objecao", "objecao:equipamento"],
    "caro": ["objecao", "objecao:dinheiro"],
    "investimento": ["objecao", "objecao:dinheiro"],
    "não tenho cartão": ["objecao", "objecao:dinheiro"],
    "pix": ["objecao", "objecao:dinheiro"],
    "boleto": ["objecao", "objecao:dinheiro"],
    "avançado demais": ["objecao", "objecao:metodo"],
    "difícil": ["objecao", "objecao:metodo"],
    "fingerstyle parece": ["objecao", "objecao:metodo"],
    "medo de pagar": ["objecao", "objecao:confianca"],
    "confiável": ["objecao", "objecao:confianca"],
    "não conheço": ["objecao", "objecao:confianca"],
    "reembolso": ["objecao", "objecao:confianca"],
    "não gostar": ["objecao", "objecao:confianca"],
    "igreja": ["caso_uso:igreja"],
    "gospel": ["caso_uso:igreja"],
    "culto": ["caso_uso:igreja"],
    "célula": ["caso_uso:igreja"],
    "adorar": ["caso_uso:igreja"],
    "secular": ["caso_uso:hobby"],
}


def estimate_tokens(text: str) -> int:
    """Estimate token count (roughly 4 chars per token)."""
    return len(text) // 4


def detect_labels(text: str, title: str = "") -> list[str]:
    """Detect appropriate labels for a chunk based on content."""
    labels = []
    text_lower = (text + " " + title).lower()

    # Check for objection patterns
    for pattern, pattern_labels in OBJECTION_LABELS.items():
        if pattern in text_lower:
            labels.extend(pattern_labels)

    # Check for pricing content
    if any(w in text_lower for w in ["r$", "reais", "parcel", "à vista", "acesso vitalício"]):
        labels.append("preco")

    # Check for method/course content
    if any(w in text_lower for w in ["módulo", "aula", "videoaula", "exercício"]):
        labels.append("metodo")
        labels.append("curso")

    # Check for proof/social proof
    if any(w in text_lower for w in ["50 mil", "50.000", "milhão", "depoimento", "aluno"]):
        labels.append("prova")

    # Check for FAQ
    if "?" in text or title.lower().startswith("como") or title.lower().startswith("o que"):
        labels.append("faq")

    # Dedupe
    return list(set(labels))


def parse_objections(content: str) -> list[dict]:
    """Parse objection-response pairs from knowledge-sales.txt."""
    chunks = []

    # Pattern: "N. Objeção: ... Resposta: ..."
    pattern = r'(\d+)\.\s*Objeção:\s*(.+?)\s*Resposta:\s*(.+?)(?=\n\d+\.\s*Objeção:|\Z)'
    matches = re.findall(pattern, content, re.DOTALL | re.IGNORECASE)

    for num, objection, response in matches:
        title = f"Objeção: {objection.strip()[:50]}..."
        full_content = f"Objeção: {objection.strip()}\n\nResposta: {response.strip()}"

        labels = detect_labels(full_content, title)
        if "objection" not in labels:
            labels.append("objection")

        chunks.append({
            "title": title,
            "content": full_content,
            "category": "objection",
            "labels": labels,
            "trait_filter": None,
            "token_count": estimate_tokens(full_content)
        })

    return chunks


def parse_faq(content: str) -> list[dict]:
    """Parse FAQ-style content from knowledge-course.txt."""
    chunks = []

    # Pattern: "N. **Question** Answer" or "N. Question? Answer"
    lines = content.split('\n')
    current_chunk = None

    # Simple pattern: numbered items
    pattern = r'^(\d+)\.\s*\*?\*?(.+?)\*?\*?\s*$'

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Check for numbered question
        match = re.match(r'^(\d+)\.\s*(.+)$', line)
        if match:
            # Save previous chunk
            if current_chunk and current_chunk.get("content"):
                chunks.append(current_chunk)

            num, title = match.groups()
            current_chunk = {
                "title": title[:100],
                "content": "",
                "category": "faq",
                "labels": [],
                "trait_filter": None,
            }
        elif current_chunk is not None and line:
            # Accumulate content
            if current_chunk["content"]:
                current_chunk["content"] += "\n" + line
            else:
                current_chunk["content"] = line

        i += 1

    # Save last chunk
    if current_chunk and current_chunk.get("content"):
        chunks.append(current_chunk)

    # Post-process: detect labels and token counts
    for chunk in chunks:
        chunk["labels"] = detect_labels(chunk["content"], chunk["title"])
        chunk["token_count"] = estimate_tokens(chunk["content"])

    return chunks


def parse_modules(content: str) -> list[dict]:
    """Parse module/curriculum content."""
    chunks = []

    # Pattern: "Módulo N ... • lesson • lesson"
    pattern = r'(Módulo \d+)\s*\n\d+ / \d+\s*\n(.+?)(?=Módulo \d+|\Z)'
    matches = re.findall(pattern, content, re.DOTALL)

    for module_title, module_content in matches:
        # Clean up content
        lessons = [l.strip() for l in module_content.split('•') if l.strip()]
        if lessons:
            title = lessons[0][:100]  # First item is module name
            full_content = f"{module_title}: {title}\n\nConteúdo:\n" + "\n".join(f"• {l}" for l in lessons[1:])

            chunks.append({
                "title": f"{module_title} - {title}",
                "content": full_content,
                "category": "course",
                "labels": ["course", "method", "stage:apresentacao"],
                "trait_filter": None,
                "token_count": estimate_tokens(full_content)
            })

    return chunks


def create_stage_chunks() -> list[dict]:
    """Create manual chunks for each conversation stage (Portuguese labels)."""
    return [
        # Conexão stage
        {
            "title": "Conexão - Abertura",
            "content": "Que bom que você chamou! Fico feliz quando alguém quer continuar depois de ver os vídeos do Rafa. Me conta rapidinho: o que fez você querer dar o próximo passo agora?",
            "category": "stage",
            "labels": ["stage:conexao", "rapport"],
            "trait_filter": None,
            "token_count": 50
        },
        {
            "title": "Conexão - Rapport",
            "content": "Massa demais! Se você chamou é porque o violão tá chamando também. Qual foi a última vez que você pegou o violão pra tocar?",
            "category": "stage",
            "labels": ["stage:conexao", "rapport"],
            "trait_filter": None,
            "token_count": 40
        },
        # Descoberta stage
        {
            "title": "Descoberta - Zero",
            "content": "Isso é ótimo, começar do zero evita vícios. Quando aprende desde o começo com a mão certa, você evolui muito mais rápido.",
            "category": "stage",
            "labels": ["stage:descoberta", "encorajamento"],
            "trait_filter": {"skill_level": "zero"},
            "token_count": 35
        },
        {
            "title": "Descoberta - Intermediário",
            "content": "Boa! Com base já criada, agora o foco é deixar o som mais limpo, bonito e expressivo. É aí que o violão fica gostoso de ouvir.",
            "category": "stage",
            "labels": ["stage:descoberta", "encorajamento"],
            "trait_filter": {"skill_level": "intermediate"},
            "token_count": 35
        },
        # Validação stage
        {
            "title": "Validação - Encorajamento",
            "content": "Olha, pelo que você me contou, o curso encaixa certinho pra você. É passo a passo, sem pressão, e você evolui no seu ritmo.",
            "category": "stage",
            "labels": ["stage:validacao", "encorajamento"],
            "trait_filter": None,
            "token_count": 35
        },
        # Igreja specific
        {
            "title": "Igreja - Use case",
            "content": "Perfeito, muita gente entra justamente por isso. Tem repertório, dedilhados e arranjos que ajudam muito quem toca em culto, célula e momentos de adoração.",
            "category": "use_case",
            "labels": ["caso_uso:igreja", "stage:descoberta"],
            "trait_filter": {"use_case": "igreja"},
            "token_count": 40
        },
        # Pricing (gated)
        {
            "title": "Preço e Pagamento",
            "content": "O investimento é de R$297 à vista ou 12x de R$29,67. Você tem acesso vitalício, todas as atualizações e suporte no grupo de estudos.",
            "category": "pricing",
            "labels": ["preco", "pagamento", "stage:fechamento"],
            "trait_filter": None,
            "token_count": 40
        },
        # Method/Proof
        {
            "title": "Sobre o Método",
            "content": "São 280 videoaulas completas, organizadas do zero absoluto até fingerstyle avançado. Você segue a ordem e vai evoluindo sem ficar perdido.",
            "category": "method",
            "labels": ["metodo", "prova", "stage:apresentacao"],
            "trait_filter": None,
            "token_count": 35
        },
        {
            "title": "Prova Social",
            "content": "O curso já formou mais de 50 mil alunos. Muitos começaram do zero e hoje tocam na igreja, em casa, fazem vídeos. O método funciona porque é passo a passo.",
            "category": "proof",
            "labels": ["prova", "stage:apresentacao"],
            "trait_filter": None,
            "token_count": 40
        },
        # Handoff
        {
            "title": "Transferência Humano",
            "content": "Entendi, vou te transferir para o suporte que pode te ajudar melhor com isso. Um momento!",
            "category": "transferencia",
            "labels": ["transferencia"],
            "trait_filter": None,
            "token_count": 20
        },
    ]


def load_knowledge_file(filepath: str) -> str:
    """Load a knowledge file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()


def generate_embeddings(chunks: list[dict], batch_size: int = 50) -> list[dict]:
    """Generate embeddings for chunks in batches."""
    print(f"Generating embeddings for {len(chunks)} chunks...")

    texts = [c["content"] for c in chunks]

    # Process in batches
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        print(f"  Batch {i // batch_size + 1}/{(len(texts) - 1) // batch_size + 1}...")
        embeddings, _ = embed_text(batch, input_type="document")
        all_embeddings.extend(embeddings)

    # Add embeddings to chunks
    for i, chunk in enumerate(chunks):
        chunk["embedding"] = all_embeddings[i]

    return chunks


def insert_chunks(chunks: list[dict], dry_run: bool = False):
    """Insert chunks into database."""
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Inserting {len(chunks)} chunks...")

    if dry_run:
        for i, chunk in enumerate(chunks[:5]):
            print(f"  {i+1}. {chunk['title'][:50]}")
            print(f"      Labels: {chunk['labels']}")
            print(f"      Tokens: {chunk['token_count']}")
        if len(chunks) > 5:
            print(f"  ... and {len(chunks) - 5} more")
        return

    with Session(engine) as session:
        for chunk in chunks:
            kb = KnowledgeBase(
                content=chunk["content"],
                category=chunk["category"],
                agent_id=NINA_AGENT_ID,
                title=chunk["title"],
                labels=chunk["labels"],
                trait_filter=chunk.get("trait_filter"),
                token_count=chunk["token_count"],
                embedding=chunk.get("embedding"),  # Already a list from Voyage
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                is_active=True
            )
            session.add(kb)

        session.commit()
        print(f"Inserted {len(chunks)} chunks successfully!")


def clear_nina_chunks():
    """Remove all existing Nina chunks."""
    print("Clearing existing Nina chunks...")
    with Session(engine) as session:
        result = session.exec(
            select(KnowledgeBase).where(KnowledgeBase.agent_id == NINA_AGENT_ID)
        )
        chunks = result.all()
        for chunk in chunks:
            session.delete(chunk)
        session.commit()
        print(f"Deleted {len(chunks)} chunks")


def main():
    parser = argparse.ArgumentParser(description="Load Nina knowledge chunks")
    parser.add_argument("--dry-run", action="store_true", help="Preview without inserting")
    parser.add_argument("--clear", action="store_true", help="Clear existing chunks first")
    parser.add_argument("--no-embeddings", action="store_true", help="Skip embedding generation")
    args = parser.parse_args()

    print("=" * 60)
    print("NINA CHUNK LOADER")
    print("=" * 60)

    if args.clear:
        clear_nina_chunks()

    # Load and parse knowledge files
    all_chunks = []

    # 1. Manual stage chunks (highest priority)
    print("\n1. Creating stage chunks...")
    stage_chunks = create_stage_chunks()
    all_chunks.extend(stage_chunks)
    print(f"   Created {len(stage_chunks)} stage chunks")

    # 2. Parse objections from knowledge-sales.txt
    print("\n2. Parsing objections from knowledge-sales.txt...")
    try:
        sales_content = load_knowledge_file("/opt/connectai/docs/fingerstyle/knowledge-sales.txt")
        objection_chunks = parse_objections(sales_content)
        all_chunks.extend(objection_chunks)
        print(f"   Parsed {len(objection_chunks)} objection chunks")
    except Exception as e:
        print(f"   Error: {e}")

    # 3. Parse FAQ from knowledge-course.txt
    print("\n3. Parsing FAQ from knowledge-course.txt...")
    try:
        course_content = load_knowledge_file("/opt/connectai/docs/fingerstyle/knowledge-course.txt")
        faq_chunks = parse_faq(course_content)
        all_chunks.extend(faq_chunks)
        print(f"   Parsed {len(faq_chunks)} FAQ chunks")

        # Also parse modules
        module_chunks = parse_modules(course_content)
        all_chunks.extend(module_chunks)
        print(f"   Parsed {len(module_chunks)} module chunks")
    except Exception as e:
        print(f"   Error: {e}")

    print(f"\nTotal chunks: {len(all_chunks)}")
    print(f"Total estimated tokens: {sum(c['token_count'] for c in all_chunks)}")

    # Generate embeddings
    if not args.no_embeddings and not args.dry_run:
        all_chunks = generate_embeddings(all_chunks)

    # Insert into database
    insert_chunks(all_chunks, dry_run=args.dry_run)

    print("\nDone!")


if __name__ == "__main__":
    main()
