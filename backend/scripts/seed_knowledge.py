"""
Seed knowledge base with sample pet shop data.

Run with: python -m scripts.seed_knowledge
"""
import asyncio
import os
import voyageai
from sqlmodel import Session, create_engine, select
from app.models.knowledge import KnowledgeBase
from app.core.config import settings
from dotenv import load_dotenv

# Load environment variables
load_dotenv("../.env")

# Initialize Voyage AI client
voyage_client = voyageai.Client(api_key=os.getenv("VOYAGE_API_KEY"))
engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

# Sample pet shop knowledge chunks
KNOWLEDGE_DATA = [
    {
        "title": "Banho e Tosa - Preços Pequeno Porte",
        "content": "Banho e tosa para cães de pequeno porte: R$60. Inclui banho completo, tosa higiênica, corte de unhas e limpeza de ouvidos.",
        "category": "pricing",
        "agent_id": "1"
    },
    {
        "title": "Banho e Tosa - Preços Grande Porte",
        "content": "Banho e tosa para cães de grande porte: R$85. Inclui banho completo, tosa higiênica, corte de unhas e limpeza de ouvidos.",
        "category": "pricing",
        "agent_id": "1"
    },
    {
        "title": "Horário de Funcionamento",
        "content": "Funcionamos de segunda a sexta das 9h às 18h, e aos sábados das 10h às 16h. Fechado aos domingos e feriados.",
        "category": "hours",
        "agent_id": "1"
    },
    {
        "title": "Consulta Veterinária",
        "content": "Consultas veterinárias disponíveis com agendamento prévio. Valor: R$120. Atendemos emergências 24h com taxa adicional de R$80.",
        "category": "service",
        "agent_id": "1"
    },
    {
        "title": "Vacinação",
        "content": "Oferecemos todas as vacinas obrigatórias e opcionais. V10: R$70, V8: R$65, Antirrábica: R$50, Gripe canina: R$80. Cartão de vacina fornecido gratuitamente.",
        "category": "service",
        "agent_id": "1"
    },
    {
        "title": "Hotel para Pets",
        "content": "Hotel para cães e gatos com diária de R$45 (pequeno porte) e R$60 (grande porte). Inclui alimentação, passeios e monitoramento 24h.",
        "category": "service",
        "agent_id": "1"
    },
    {
        "title": "Política de Agendamento",
        "content": "Agendamentos podem ser feitos por telefone, WhatsApp ou presencialmente. Pedimos 24h de antecedência. Cancelamentos com menos de 4h de antecedência têm taxa de 50%.",
        "category": "policy",
        "agent_id": "1"
    },
    {
        "title": "Ração e Petiscos",
        "content": "Vendemos rações premium das marcas Golden, Royal Canin e Farmina. Desconto de 10% na compra de 3 ou mais sacos. Petiscos naturais a partir de R$8.",
        "category": "product",
        "agent_id": "1"
    },
    {
        "title": "Política de Pagamento",
        "content": "Aceitamos dinheiro, cartão de crédito/débito (todas as bandeiras), Pix e parcelamento em até 3x sem juros. Cheques não são aceitos.",
        "category": "policy",
        "agent_id": "1"
    },
    {
        "title": "Atendimento a Pets Agressivos",
        "content": "Atendemos pets com comportamento agressivo com agendamento especial. É necessário informar antecipadamente. Taxa adicional de R$30 por segurança.",
        "category": "policy",
        "agent_id": "1"
    },
    {
        "title": "Tosa Especial para Raças",
        "content": "Oferecemos tosa especializada para raças como Poodle, Yorkshire, Shih Tzu e Maltês. Tosa de raça: R$95 (pequeno porte) e R$130 (grande porte).",
        "category": "service",
        "agent_id": "1"
    },
    {
        "title": "Localização e Estacionamento",
        "content": "Estamos localizados na Rua das Flores, 123, Centro. Temos estacionamento gratuito para clientes com 5 vagas. Próximo ao Banco do Brasil.",
        "category": "faq",
        "agent_id": "1"
    },
    {
        "title": "Banho a Seco",
        "content": "Oferecemos banho a seco para pets idosos ou com restrições de saúde. Valor: R$40 (pequeno porte) e R$55 (grande porte). Sem necessidade de água.",
        "category": "service",
        "agent_id": "1"
    },
    {
        "title": "Castração",
        "content": "Cirurgias de castração realizadas por veterinário credenciado. Fêmeas: R$350, Machos: R$250. Inclui pré e pós-operatório.",
        "category": "service",
        "agent_id": "1"
    },
    {
        "title": "Adestramento Básico",
        "content": "Aulas de adestramento básico com profissional certificado. Pacote de 8 aulas: R$480. Ensina comandos básicos e socialização.",
        "category": "service",
        "agent_id": "1"
    },
]


async def seed_knowledge():
    """Seed the knowledge base with sample data."""

    with Session(engine) as session:
        # Check if already seeded
        existing = session.exec(select(KnowledgeBase)).first()
        if existing:
            print("⚠️  Knowledge base already contains data. Delete existing data first if you want to reseed.")
            print(f"Found {len(session.exec(select(KnowledgeBase)).all())} existing entries.")
            return

        print("🌱 Seeding knowledge base...")

        for idx, item in enumerate(KNOWLEDGE_DATA, 1):
            print(f"  [{idx}/{len(KNOWLEDGE_DATA)}] Embedding: {item['title']}")

            # Generate embedding using Voyage AI
            embedding_response = voyage_client.embed(
                texts=[item["content"]],
                model="voyage-3.5",
                input_type="document"  # These are documents, not queries
            )
            embedding = embedding_response.embeddings[0]

            # Insert using raw SQL to handle pgvector properly
            from sqlalchemy import text
            stmt = text("""
                INSERT INTO knowledge_base (content, category, agent_id, title, embedding, is_active, created_at, updated_at)
                VALUES (:content, :category, :agent_id, :title, CAST(:embedding AS vector), true, NOW(), NOW())
            """)
            session.execute(stmt, {
                "content": item["content"],
                "category": item["category"],
                "agent_id": item["agent_id"],
                "title": item["title"],
                "embedding": str(embedding)
            })

        session.commit()
        print(f"\n✅ Successfully seeded {len(KNOWLEDGE_DATA)} knowledge chunks!")
        print("🔍 Test with queries like:")
        print("  - Quanto custa banho para cachorro pequeno?")
        print("  - Qual o horário de funcionamento?")
        print("  - Vocês fazem castração?")


if __name__ == "__main__":
    asyncio.run(seed_knowledge())
