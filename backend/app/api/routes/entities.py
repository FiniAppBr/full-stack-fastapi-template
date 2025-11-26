"""Entity API routes - CRUD for products, services, policies, etc."""

import re
import json
from datetime import datetime
from typing import Any, Optional, List

from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel
from sqlmodel import select, func
from sqlalchemy import text

from app.api.deps import SessionDep
from app.models.entity import Entity, EntityCreate, EntityUpdate, EntityPublic, EntitiesPublic, ENTITY_CATEGORIES
from app.models.knowledge import KnowledgeBase
from app.models.operations import BookingConfig, Inventory
from app.llm.voyage import embed_text

router = APIRouter()


# =============================================================================
# AUTO-CREATE OPERATIONAL RECORDS
# =============================================================================

def _ensure_operational_records(session: SessionDep, entity: Entity, capabilities: list[str]) -> None:
    """Auto-create operational records when capabilities are added."""
    if not capabilities:
        return

    # Create BookingConfig for bookable entities
    if "bookable" in capabilities:
        existing = session.exec(
            select(BookingConfig).where(BookingConfig.entity_id == entity.id)
        ).first()
        if not existing:
            config = BookingConfig(entity_id=entity.id)
            session.add(config)

    # Create Inventory for stockable entities
    if "stockable" in capabilities:
        existing = session.exec(
            select(Inventory).where(Inventory.entity_id == entity.id)
        ).first()
        if not existing:
            inventory = Inventory(entity_id=entity.id)
            session.add(inventory)


# =============================================================================
# PORTUGUESE FIELD LABELS (for RAG chunks)
# =============================================================================

FIELD_LABELS_PT = {
    # Commercial
    "price": "Preço",
    "price_monthly": "Preço Mensal",
    "price_yearly": "Preço Anual",
    "original_price": "Preço Original",
    "savings_percent": "Economia (%)",
    "checkout_url": "URL de Checkout",
    "booking_url": "URL de Agendamento",
    "payment_methods": "Formas de Pagamento",
    "installments": "Parcelamento",
    "pix_discount": "Desconto PIX",
    "billing_info": "Info de Cobrança",
    "features": "Funcionalidades",
    "modules": "Módulos",
    "bonus_items": "Bônus Inclusos",
    "items_included": "Itens Inclusos",
    "format": "Formato",
    "pages": "Número de Páginas",
    "sku": "SKU / Código",
    "stock_quantity": "Quantidade em Estoque",
    "weight_kg": "Peso (kg)",
    "dimensions": "Dimensões (cm)",
    "shipping_time": "Prazo de Envio",
    "shipping_methods": "Métodos de Envio",
    "tracking": "Rastreamento",
    # Time & Dates
    "duration_hours": "Duração (horas)",
    "duration_minutes": "Duração (minutos)",
    "timeline": "Cronograma",
    "guarantee_days": "Dias de Garantia",
    "trial_days": "Dias de Teste",
    "deadline_days": "Prazo (dias)",
    "notice_period": "Prazo de Aviso",
    "process_time": "Tempo de Processamento",
    "event_date": "Data do Evento",
    "registration_deadline": "Prazo de Inscrição",
    "business_hours": "Horário Comercial",
    "weekdays_hours": "Segunda a Sexta",
    "saturday_hours": "Sábado",
    "sunday_hours": "Domingo",
    "holiday_hours": "Feriados",
    "availability": "Disponibilidade",
    "support_hours": "Horário de Suporte",
    "timezone": "Fuso Horário",
    # People & Contact
    "person_name": "Nome da Pessoa",
    "role": "Cargo",
    "department": "Departamento",
    "expertise": "Especialidade",
    "credentials": "Credenciais",
    "experience_years": "Anos de Experiência",
    "bio": "Bio / Descrição",
    "email": "Email",
    "phone": "Telefone",
    "contact_person": "Pessoa de Contato",
    "support_contact": "Contato de Suporte",
    "contact_if_persists": "Contato se Persistir",
    "social_links": "Redes Sociais",
    "photo_url": "URL da Foto",
    "company_name": "Nome da Empresa",
    "partnership_type": "Tipo de Parceria",
    "commission_rate": "Taxa de Comissão",
    # Location
    "address": "Endereço",
    "city": "Cidade",
    "location": "Local",
    "maps_url": "Link do Maps",
    "directions": "Como Chegar",
    "regions": "Regiões",
    "cities": "Cidades",
    "delivery_fee": "Taxa de Entrega",
    "minimum_order": "Pedido Mínimo",
    "free_shipping_minimum": "Frete Grátis Acima de",
    "parking": "Estacionamento",
    "amenities": "Comodidades",
    "capacity": "Capacidade",
    # Content & Text
    "question": "Pergunta",
    "answer": "Resposta",
    "problem": "Problema",
    "solution": "Solução",
    "objection": "Objeção",
    "response": "Resposta à Objeção",
    "conditions": "Condições",
    "exceptions": "Exceções",
    "refund_process": "Processo de Reembolso",
    "cancellation_process": "Processo de Cancelamento",
    "rescheduling_policy": "Política de Reagendamento",
    "steps": "Passos",
    "resources": "Recursos",
    "proof_points": "Provas / Argumentos",
    "talking_points": "Pontos de Discussão",
    "do_examples": "Exemplos Positivos",
    "dont_examples": "Exemplos Negativos",
    "integrations": "Integrações",
    "related_product": "Produto Relacionado",
    "related_link": "Link Relacionado",
    "faq_category": "Categoria FAQ",
    "cta": "Chamada para Ação",
    # Brand & Identity
    "tone": "Tom",
    "personality": "Personalidade",
    "mission": "Missão",
    "vision": "Visão",
    "values": "Valores",
    "differentiators": "Diferenciais",
    "competitor_name": "Nome do Concorrente",
    "their_weaknesses": "Fraquezas Deles",
    "our_strengths": "Nossas Forças",
    "customer_name": "Nome do Cliente",
    "testimonial_quote": "Depoimento",
    "result_achieved": "Resultado Alcançado",
    "context": "Contexto",
    # Support
    "support_channels": "Canais de Suporte",
    "response_time": "Tempo de Resposta",
    "priority_support": "Suporte Prioritário",
    "cancellation_fee": "Taxa de Cancelamento",
    "refund_method": "Método de Reembolso",
    "confirmation_method": "Método de Confirmação",
    "delivery_method": "Método de Entrega",
    # Audience
    "target_audience": "Público-Alvo",
    "modality": "Modalidade",
    "billing_cycle": "Ciclo de Cobrança",
    "support_level": "Nível de Suporte",
    # Product-specific
    "full_name": "Nome Completo",
    "short_name": "Nome Curto",
    "description": "Descrição",
    "name": "Nome",
}


# =============================================================================
# ENTITY PROCESSING (Convert entities to RAG chunks)
# =============================================================================

def _get_label_pt(key: str) -> str:
    """Get Portuguese label for a field key, fallback to title-cased key."""
    return FIELD_LABELS_PT.get(key, key.replace("_", " ").title())


def _entity_to_text(entity: Entity) -> str:
    """Convert entity data to searchable text for RAG (Portuguese labels)."""
    parts = [f"# {entity.name}"]

    if entity.description:
        parts.append(entity.description)

    # Convert JSON data to readable text with Portuguese labels
    def flatten_data(data: dict, prefix: str = "") -> list[str]:
        lines = []
        for key, value in data.items():
            label = _get_label_pt(key)
            if isinstance(value, dict):
                lines.append(f"\n## {label}")
                lines.extend(flatten_data(value, prefix + "  "))
            elif isinstance(value, list):
                if value and isinstance(value[0], dict):
                    lines.append(f"\n## {label}")
                    for i, item in enumerate(value):
                        if isinstance(item, dict):
                            item_name = item.get("name", item.get("title", f"Item {i+1}"))
                            lines.append(f"- {item_name}")
                            for k, v in item.items():
                                if k not in ["name", "title"] and v:
                                    lines.append(f"  - {_get_label_pt(k)}: {v}")
                        else:
                            lines.append(f"- {item}")
                else:
                    lines.append(f"- {label}: {', '.join(str(v) for v in value)}")
            elif value is not None and value != "":
                lines.append(f"- {label}: {value}")
        return lines

    if entity.data:
        parts.extend(flatten_data(entity.data))

    return "\n".join(parts)


def _estimate_tokens(text: str) -> int:
    """Estimate token count (roughly 4 chars per token)."""
    return len(text) // 4


class ProcessResponse(BaseModel):
    """Response for entity processing."""
    entity_id: int
    entity_name: str
    chunks_created: int
    chunk_ids: list[int]
    total_tokens: int


class BulkProcessResponse(BaseModel):
    """Response for bulk entity processing."""
    processed: int
    failed: int
    results: list[ProcessResponse]
    errors: list[str]


@router.get("/stats")
def get_entity_stats(session: SessionDep) -> Any:
    """Get entity counts by category for dashboard."""
    stats = {}
    for category in ENTITY_CATEGORIES:
        count = session.exec(
            select(func.count(Entity.id))
            .where(Entity.is_active == True)
            .where(Entity.category == category)
        ).one()
        stats[category] = count

    # Total count
    total = session.exec(
        select(func.count(Entity.id)).where(Entity.is_active == True)
    ).one()
    stats["total"] = total

    return stats


@router.get("/recent", response_model=EntitiesPublic)
def get_recent_entities(
    session: SessionDep,
    limit: int = 5,
) -> Any:
    """Get most recently updated entities."""
    query = (
        select(Entity)
        .where(Entity.is_active == True)
        .order_by(Entity.updated_at.desc())
        .limit(limit)
    )
    entities = session.exec(query).all()
    return EntitiesPublic(data=entities, count=len(entities))


@router.get("", response_model=EntitiesPublic)
def get_entities(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = Query(None, description="Filter by entity category"),
    template: Optional[str] = Query(None, description="Filter by template ID"),
    agent_id: Optional[str] = Query(None, description="Filter by agent ID"),
    search: Optional[str] = Query(None, description="Search by name"),
    capability: Optional[str] = Query(None, description="Filter by capability: bookable, schedulable, stockable"),
) -> Any:
    """Get all entities, optionally filtered by category, template, agent, capability, or search."""
    query = select(Entity).where(Entity.is_active == True)

    if category:
        query = query.where(Entity.category == category)
    if template:
        query = query.where(Entity.template == template)
    if agent_id:
        query = query.where(Entity.agent_id == agent_id)
    if search:
        query = query.where(Entity.name.ilike(f"%{search}%"))
    if capability:
        # Filter by capability in JSON array using PostgreSQL @> operator
        query = query.where(text(f"capabilities::jsonb @> '\"{capability}\"'"))

    # Order by most recent first
    query = query.order_by(Entity.updated_at.desc())
    query = query.offset(skip).limit(limit)
    entities = session.exec(query).all()

    # Get total count for pagination
    count_query = select(func.count(Entity.id)).where(Entity.is_active == True)
    if category:
        count_query = count_query.where(Entity.category == category)
    if template:
        count_query = count_query.where(Entity.template == template)
    if agent_id:
        count_query = count_query.where(Entity.agent_id == agent_id)
    if search:
        count_query = count_query.where(Entity.name.ilike(f"%{search}%"))
    if capability:
        count_query = count_query.where(text(f"capabilities::jsonb @> '\"{capability}\"'"))
    total = session.exec(count_query).one()

    return EntitiesPublic(data=entities, count=total)


@router.post("", response_model=EntityPublic, status_code=201)
def create_entity(*, session: SessionDep, entity_in: EntityCreate) -> Any:
    """Create a new entity."""
    entity = Entity(
        name=entity_in.name,
        category=entity_in.category,
        template=entity_in.template,
        data=entity_in.data,
        description=entity_in.description,
        agent_id=entity_in.agent_id,
        capabilities=entity_in.capabilities or [],
    )
    session.add(entity)
    session.commit()
    session.refresh(entity)

    # Auto-create operational records for capabilities
    if entity.capabilities:
        _ensure_operational_records(session, entity, entity.capabilities)
        session.commit()

    return entity


@router.get("/{entity_id}", response_model=EntityPublic)
def get_entity(session: SessionDep, entity_id: int) -> Any:
    """Get entity by ID."""
    entity = session.get(Entity, entity_id)
    if not entity or not entity.is_active:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity


@router.patch("/{entity_id}", response_model=EntityPublic)
def update_entity(
    *, session: SessionDep, entity_id: int, entity_in: EntityUpdate
) -> Any:
    """Update an entity."""
    entity = session.get(Entity, entity_id)
    if not entity or not entity.is_active:
        raise HTTPException(status_code=404, detail="Entity not found")

    update_data = entity_in.model_dump(exclude_unset=True)

    # Check if any content fields changed (not just metadata)
    content_fields = {"name", "description", "data", "category", "template"}
    content_changed = any(key in content_fields for key in update_data.keys())

    # Track capability changes for auto-creating operational records
    old_capabilities = set(entity.capabilities or [])
    new_capabilities = set(update_data.get("capabilities", []) or []) if "capabilities" in update_data else old_capabilities
    added_capabilities = new_capabilities - old_capabilities

    for key, value in update_data.items():
        setattr(entity, key, value)

    entity.updated_at = datetime.utcnow()

    # Mark as not processed if content changed (needs re-embedding)
    if content_changed and entity.is_processed:
        entity.is_processed = False

    session.add(entity)
    session.commit()
    session.refresh(entity)

    # Auto-create operational records for newly added capabilities
    if added_capabilities:
        _ensure_operational_records(session, entity, list(added_capabilities))
        session.commit()

    return entity


@router.delete("/{entity_id}", status_code=204)
def delete_entity(session: SessionDep, entity_id: int) -> None:
    """Soft delete an entity."""
    entity = session.get(Entity, entity_id)
    if not entity or not entity.is_active:
        raise HTTPException(status_code=404, detail="Entity not found")

    entity.is_active = False
    entity.updated_at = datetime.utcnow()
    session.add(entity)
    session.commit()


@router.patch("/{entity_id}/linked-agents")
def update_entity_linked_agents(
    session: SessionDep,
    entity_id: int,
    agent_ids: list[int],
) -> Any:
    """
    Update which agents have access to this entity.

    This modifies NeoAgent.linked_entities for each specified agent.
    """
    from app.models.neo_agent import NeoAgent

    entity = session.get(Entity, entity_id)
    if not entity or not entity.is_active:
        raise HTTPException(status_code=404, detail="Entity not found")

    # Get all agents
    all_agents = session.exec(select(NeoAgent)).all()

    # Convert entity_id to string for DB storage (column is VARCHAR[])
    entity_id_str = str(entity_id)

    updated_agents = []
    for agent in all_agents:
        # Convert all existing links to strings for comparison
        current_links = set(str(x) for x in (agent.linked_entities or []))
        agent_should_have_entity = agent.id in agent_ids

        if agent_should_have_entity and entity_id_str not in current_links:
            # Add entity to agent's links
            current_links.add(entity_id_str)
            agent.linked_entities = list(current_links)
            agent.updated_at = datetime.utcnow()
            session.add(agent)
            updated_agents.append(agent.id)
        elif not agent_should_have_entity and entity_id_str in current_links:
            # Remove entity from agent's links
            current_links.discard(entity_id_str)
            agent.linked_entities = list(current_links)
            agent.updated_at = datetime.utcnow()
            session.add(agent)
            updated_agents.append(agent.id)

    session.commit()

    return {
        "ok": True,
        "entity_id": entity_id,
        "linked_to_agents": agent_ids,
        "agents_updated": updated_agents
    }


@router.get("/{entity_id}/linked-agents")
def get_entity_linked_agents(session: SessionDep, entity_id: int) -> Any:
    """Get list of agent IDs that have this entity linked."""
    from app.models.neo_agent import NeoAgent

    entity = session.get(Entity, entity_id)
    if not entity or not entity.is_active:
        raise HTTPException(status_code=404, detail="Entity not found")

    # Find all agents that have this entity in their linked_entities
    # Compare as strings since DB column is VARCHAR[]
    entity_id_str = str(entity_id)
    all_agents = session.exec(select(NeoAgent)).all()
    linked_agent_ids = [
        agent.id for agent in all_agents
        if agent.linked_entities and entity_id_str in [str(x) for x in agent.linked_entities]
    ]

    return {
        "entity_id": entity_id,
        "linked_agents": linked_agent_ids
    }


@router.get("/categories/list", response_model=list[str])
def get_entity_categories() -> Any:
    """Get list of all valid entity categories."""
    return ENTITY_CATEGORIES


# =============================================================================
# PROCESSING ENDPOINTS
# =============================================================================

@router.post("/{entity_id}/process", response_model=ProcessResponse)
def process_entity(session: SessionDep, entity_id: int) -> Any:
    """
    Process a single entity into knowledge chunks for RAG.

    This converts the entity's structured data into searchable text,
    generates embeddings, and stores as knowledge chunks.

    The entity's linked agents will be able to find this information via RAG.
    """
    entity = session.get(Entity, entity_id)
    if not entity or not entity.is_active:
        raise HTTPException(status_code=404, detail="Entity not found")

    # Delete existing chunks for this entity (re-processing)
    if entity.chunk_ids:
        for chunk_id in entity.chunk_ids:
            chunk = session.get(KnowledgeBase, chunk_id)
            if chunk:
                session.delete(chunk)
        session.commit()

    # Convert entity to text
    content = _entity_to_text(entity)
    token_count = _estimate_tokens(content)

    # Generate embedding
    try:
        embeddings, _ = embed_text([content], input_type="document")
        embedding = embeddings[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")

    # Create knowledge chunk tagged with entity_id
    # Agents will search by their linked_entities, not by agent_id
    # Include capabilities in metadata for tool binding
    metadata = {
        "entity_id": entity.id,
        "capabilities": entity.capabilities or [],
        "template": entity.template,
    }
    chunk = KnowledgeBase(
        content=content,
        title=entity.name,
        category=entity.category,
        agent_id=f"entity:{entity.id}",  # Tag with entity ID for linking
        token_count=token_count,
        embedding=embedding,
        metadata_json=json.dumps(metadata),
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(chunk)
    session.commit()
    session.refresh(chunk)

    # Update entity with chunk reference and processing state
    entity.chunk_ids = [chunk.id]
    entity.is_processed = True
    entity.processed_at = datetime.utcnow()
    entity.updated_at = datetime.utcnow()
    session.add(entity)
    session.commit()

    return ProcessResponse(
        entity_id=entity.id,
        entity_name=entity.name,
        chunks_created=1,
        chunk_ids=[chunk.id],
        total_tokens=token_count
    )


@router.post("/process-all", response_model=BulkProcessResponse)
def process_all_entities(
    session: SessionDep,
    force: bool = Query(False, description="Force re-processing of already processed entities"),
    agent_id: Optional[str] = Query(None, description="Only process entities for specific agent"),
) -> Any:
    """
    Process all unprocessed entities into knowledge chunks.

    Use force=true to re-process entities that have already been processed.
    Use agent_id to only process entities for a specific agent.
    """
    # Build query for entities to process
    query = select(Entity).where(Entity.is_active == True)

    if not force:
        query = query.where(Entity.is_processed == False)

    if agent_id:
        query = query.where(Entity.agent_id == agent_id)

    entities = session.exec(query).all()

    results = []
    errors = []
    processed = 0
    failed = 0

    for entity in entities:
        try:
            # Delete existing chunks if re-processing
            if entity.chunk_ids:
                for chunk_id in entity.chunk_ids:
                    chunk = session.get(KnowledgeBase, chunk_id)
                    if chunk:
                        session.delete(chunk)

            # Convert entity to text
            content = _entity_to_text(entity)
            token_count = _estimate_tokens(content)

            # Generate embedding
            embeddings, _ = embed_text([content], input_type="document")
            embedding = embeddings[0]

            # Create knowledge chunk tagged with entity_id
            chunk = KnowledgeBase(
                content=content,
                title=entity.name,
                category=entity.category,
                agent_id=f"entity:{entity.id}",  # Tag with entity ID for linking
                token_count=token_count,
                embedding=embedding,
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(chunk)
            session.flush()  # Get the chunk ID

            # Update entity
            entity.chunk_ids = [chunk.id]
            entity.is_processed = True
            entity.processed_at = datetime.utcnow()
            entity.updated_at = datetime.utcnow()
            session.add(entity)

            results.append(ProcessResponse(
                entity_id=entity.id,
                entity_name=entity.name,
                chunks_created=1,
                chunk_ids=[chunk.id],
                total_tokens=token_count
            ))
            processed += 1

        except Exception as e:
            errors.append(f"Entity {entity.id} ({entity.name}): {str(e)}")
            failed += 1

    session.commit()

    return BulkProcessResponse(
        processed=processed,
        failed=failed,
        results=results,
        errors=errors
    )


# =============================================================================
# DOCUMENT UPLOAD (creates entity + chunks)
# =============================================================================

def _estimate_tokens(text: str) -> int:
    """Estimate token count (roughly 4 chars per token for Portuguese)."""
    return len(text) // 4


def _chunk_text(text: str, max_tokens: int = 150) -> List[dict]:
    """Chunk text into smaller pieces by paragraphs/sentences."""
    paragraphs = text.split('\n\n')
    chunks = []
    current_chunk = []
    current_tokens = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        para_tokens = _estimate_tokens(para)

        # If paragraph is too big, split by sentences
        if para_tokens > max_tokens:
            sentences = re.split(r'(?<=[.!?])\s+', para)
            for sent in sentences:
                sent_tokens = _estimate_tokens(sent)
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
        elif current_tokens + para_tokens <= max_tokens:
            current_chunk.append(para)
            current_tokens += para_tokens
        else:
            if current_chunk:
                chunks.append({
                    'content': '\n\n'.join(current_chunk),
                    'tokens': current_tokens
                })
            current_chunk = [para]
            current_tokens = para_tokens

    if current_chunk:
        chunks.append({
            'content': '\n\n'.join(current_chunk),
            'tokens': current_tokens
        })

    return chunks


class DocumentUploadResponse(BaseModel):
    """Response for document upload."""
    entity_id: int
    entity_name: str
    chunks_created: int
    chunk_ids: List[int]
    total_tokens: int


SUPPORTED_EXTENSIONS = ('.txt', '.md', '.pdf', '.docx', '.doc', '.pptx', '.xlsx', '.html', '.htm')


def _extract_text_with_docling(file_path: str) -> str:
    """Extract text from document using docling."""
    from docling.document_converter import DocumentConverter

    converter = DocumentConverter()
    result = converter.convert(file_path)
    return result.document.export_to_markdown()


@router.post("/upload-document", response_model=DocumentUploadResponse)
async def upload_document(
    session: SessionDep,
    file: UploadFile = File(...),
    max_chunk_tokens: int = Form(default=150),
) -> Any:
    """
    Upload a document file and create an entity with processed chunks.

    1. Creates a 'documents' category entity
    2. Extracts text (using docling for PDF/DOCX/etc)
    3. Chunks the text content
    4. Generates embeddings
    5. Creates KnowledgeBase entries

    Supports: .txt, .md, .pdf, .docx, .doc, .pptx, .xlsx, .html
    """
    import tempfile
    import os

    # Validate file type
    filename = file.filename or "document.txt"
    file_ext = os.path.splitext(filename)[1].lower()

    if file_ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported: {', '.join(SUPPORTED_EXTENSIONS)}"
        )

    # Read content
    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="File is empty")

    # Extract text based on file type
    if file_ext in ('.txt', '.md'):
        # Plain text files - decode directly
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            text = content.decode('latin-1')
    else:
        # Use docling for PDF, DOCX, etc
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            text = _extract_text_with_docling(tmp_path)
        except Exception as e:
            os.unlink(tmp_path)
            raise HTTPException(
                status_code=400,
                detail=f"Failed to extract text from document: {str(e)}"
            )
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    if not text.strip():
        raise HTTPException(status_code=400, detail="No text content found in document")

    # Chunk the text
    text_chunks = _chunk_text(text, max_tokens=max_chunk_tokens)

    if not text_chunks:
        raise HTTPException(status_code=400, detail="No content found in document")

    # Calculate file size
    file_size_bytes = len(content)
    if file_size_bytes < 1024:
        file_size_str = f"{file_size_bytes} B"
    elif file_size_bytes < 1024 * 1024:
        file_size_str = f"{file_size_bytes / 1024:.1f} KB"
    else:
        file_size_str = f"{file_size_bytes / (1024 * 1024):.1f} MB"

    # Create entity
    entity = Entity(
        name=filename,
        category="documents",
        template="text_file",
        data={
            "file_name": filename,
            "file_size": file_size_str,
            "chunk_count": len(text_chunks),
        },
        is_active=True,
        is_processed=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(entity)
    session.flush()  # Get entity ID

    # Generate embeddings in batch
    texts = [c['content'] for c in text_chunks]
    try:
        embeddings, _ = embed_text(texts, input_type="document")
    except Exception as e:
        print(f"Embedding error: {e}")
        embeddings = [None] * len(texts)

    # Create chunks
    chunk_ids = []
    total_tokens = 0

    for i, (chunk_data, embedding) in enumerate(zip(text_chunks, embeddings)):
        title = f"{filename} - Part {i+1}"

        chunk = KnowledgeBase(
            content=chunk_data['content'],
            title=title,
            category="documents",
            agent_id=f"entity:{entity.id}",
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

    # Update entity with chunk info
    entity.chunk_ids = chunk_ids
    entity.is_processed = True
    entity.processed_at = datetime.utcnow()
    session.add(entity)

    session.commit()

    return DocumentUploadResponse(
        entity_id=entity.id,
        entity_name=filename,
        chunks_created=len(chunk_ids),
        chunk_ids=chunk_ids,
        total_tokens=total_tokens
    )
