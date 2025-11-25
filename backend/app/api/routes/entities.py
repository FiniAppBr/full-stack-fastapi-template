"""Entity API routes - CRUD for products, services, policies, etc."""

import json
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import select, func

from app.api.deps import SessionDep
from app.models.entity import Entity, EntityCreate, EntityUpdate, EntityPublic, EntitiesPublic, ENTITY_CATEGORIES
from app.models.knowledge import KnowledgeBase
from app.llm.voyage import embed_text

router = APIRouter()


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
) -> Any:
    """Get all entities, optionally filtered by category, template, agent, or search."""
    query = select(Entity).where(Entity.is_active == True)

    if category:
        query = query.where(Entity.category == category)
    if template:
        query = query.where(Entity.template == template)
    if agent_id:
        query = query.where(Entity.agent_id == agent_id)
    if search:
        query = query.where(Entity.name.ilike(f"%{search}%"))

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
    )
    session.add(entity)
    session.commit()
    session.refresh(entity)
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

    for key, value in update_data.items():
        setattr(entity, key, value)

    entity.updated_at = datetime.utcnow()

    # Mark as not processed if content changed (needs re-embedding)
    if content_changed and entity.is_processed:
        entity.is_processed = False

    session.add(entity)
    session.commit()
    session.refresh(entity)
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
