"""
Pipeline Tools - Contact/Lead pipeline management for AI agents.

Provides LangGraph-compatible tools for:
- save_contact: Create or update a contact with collected information
- move_contact_stage: Move a contact through pipeline stages
- get_contact_info: Retrieve contact information
- add_to_pipeline: Add a contact to the pipeline board

These tools enable lead captation agents to manage the CRM pipeline.
"""
from datetime import datetime
from typing import Annotated, Optional

from langchain_core.tools import tool
from sqlmodel import Session, select, func

from app.core.db import engine
from app.models.contact import Contact
from app.models.pipeline import PipelineColumn, PipelineCard


@tool
def save_contact(
    name: Annotated[str, "Customer's full name"],
    phone: Annotated[str, "Customer's phone number (primary identifier)"] = "",
    email: Annotated[str, "Customer's email address"] = "",
    source_agent_id: Annotated[str, "Agent ID that captured this contact (provided automatically)"] = "",
    interest: Annotated[str, "What the customer is interested in"] = "",
    budget: Annotated[str, "Customer's budget or price range if mentioned"] = "",
    urgency: Annotated[str, "How urgent is their need (baixa, média, alta)"] = "",
    notes: Annotated[str, "Additional notes about the customer"] = "",
    tags: Annotated[str, "Comma-separated tags to categorize the contact"] = ""
) -> str:
    """
    Save or update a contact (lead/customer) with collected information.

    Use this tool when:
    - Customer provides their contact information
    - You've collected important details during conversation
    - Before ending a conversation with a potential lead
    - When qualifying a lead (budget, urgency, interest)

    If phone matches an existing contact, updates their information.
    Otherwise creates a new contact and adds them to the pipeline.

    Returns confirmation with contact details.
    """
    with Session(engine) as session:
        # Build data dict from provided info
        data = {}
        if interest:
            data["interest"] = interest
        if budget:
            data["budget"] = budget
        if urgency:
            data["urgency"] = urgency

        # Parse tags
        tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else None

        # Check if contact exists by phone
        existing_contact = None
        if phone:
            existing_contact = session.exec(
                select(Contact)
                .where(Contact.is_active == True)
                .where(Contact.phone == phone)
            ).first()

        if existing_contact:
            # Update existing contact
            existing_contact.name = name or existing_contact.name
            existing_contact.email = email or existing_contact.email
            existing_contact.last_interaction_at = datetime.utcnow()
            existing_contact.conversation_count += 1
            if source_agent_id:
                existing_contact.last_agent_id = source_agent_id

            # Merge data (don't overwrite existing)
            if data:
                merged_data = {**existing_contact.data, **data}
                existing_contact.data = merged_data

            if notes:
                existing_notes = existing_contact.notes or ""
                timestamp = datetime.utcnow().strftime("%d/%m %H:%M")
                existing_contact.notes = f"{existing_notes}\n\n[{timestamp}] {notes}".strip()

            if tag_list:
                existing_tags = existing_contact.tags or []
                existing_contact.tags = list(set(existing_tags + tag_list))

            existing_contact.updated_at = datetime.utcnow()
            session.add(existing_contact)
            session.commit()
            session.refresh(existing_contact)

            return f"""✅ **Contato atualizado**

👤 **{existing_contact.name}**
📱 {existing_contact.phone or 'Sem telefone'}
📧 {existing_contact.email or 'Sem email'}
💬 Conversas: {existing_contact.conversation_count}
{f'🎯 Interesse: {data.get("interest", "")}' if data.get('interest') else ''}
{f'💰 Orçamento: {data.get("budget", "")}' if data.get('budget') else ''}

Informações atualizadas com sucesso."""

        else:
            # Create new contact
            contact = Contact(
                name=name,
                phone=phone or None,
                email=email or None,
                source="agent",
                source_agent_id=source_agent_id or None,
                data=data,
                pipeline_stage="new",
                tags=tag_list,
                notes=notes or None,
                last_interaction_at=datetime.utcnow(),
                conversation_count=1,
            )
            session.add(contact)
            session.flush()  # Get the ID

            # Automatically add to pipeline (first column)
            first_column = session.exec(
                select(PipelineColumn)
                .where(PipelineColumn.is_active == True)
                .order_by(PipelineColumn.order)
            ).first()

            if first_column:
                max_order = session.exec(
                    select(func.max(PipelineCard.order))
                    .where(PipelineCard.is_active == True)
                    .where(PipelineCard.column_id == first_column.id)
                ).one() or -1

                card = PipelineCard(
                    contact_id=contact.id,
                    column_id=first_column.id,
                    order=max_order + 1,
                    priority="medium" if urgency.lower() not in ["alta", "high"] else "high",
                )
                session.add(card)

            session.commit()
            session.refresh(contact)

            return f"""✅ **Novo contato salvo**

👤 **{contact.name}**
📱 {contact.phone or 'Sem telefone'}
📧 {contact.email or 'Sem email'}
{f'🎯 Interesse: {data.get("interest", "")}' if data.get('interest') else ''}
{f'💰 Orçamento: {data.get("budget", "")}' if data.get('budget') else ''}

Contato adicionado ao pipeline de leads."""


@tool
def move_contact_stage(
    phone: Annotated[str, "Customer's phone number to identify the contact"] = "",
    contact_name: Annotated[str, "Customer's name (if phone not known)"] = "",
    new_stage: Annotated[str, "New pipeline stage: novo, em_contato, qualificado, negociacao, fechado, perdido"] = "",
    reason: Annotated[str, "Reason for the stage change"] = ""
) -> str:
    """
    Move a contact to a different pipeline stage.

    Use this tool when:
    - Lead has been qualified after conversation
    - Customer has moved forward in the sales process
    - Lead was lost or deal was closed
    - Updating lead status based on conversation outcome

    Pipeline stages:
    - novo: New lead, just captured
    - em_contato: In contact, actively conversing
    - qualificado: Qualified, has budget/need/authority
    - negociacao: Negotiating terms/price
    - fechado: Deal closed (won)
    - perdido: Lead lost

    Returns confirmation of stage change.
    """
    with Session(engine) as session:
        # Find contact
        contact = None
        if phone:
            contact = session.exec(
                select(Contact)
                .where(Contact.is_active == True)
                .where(Contact.phone == phone)
            ).first()
        elif contact_name:
            contact = session.exec(
                select(Contact)
                .where(Contact.is_active == True)
                .where(Contact.name.ilike(f"%{contact_name}%"))
                .order_by(Contact.last_interaction_at.desc())
            ).first()

        if not contact:
            return "Não encontrei o contato. Verifique o telefone ou nome e tente novamente."

        # Map stage names
        stage_map = {
            "novo": "new",
            "new": "new",
            "em_contato": "contacted",
            "contacted": "contacted",
            "qualificado": "qualified",
            "qualified": "qualified",
            "negociacao": "negotiation",
            "negotiation": "negotiation",
            "fechado": "won",
            "won": "won",
            "perdido": "lost",
            "lost": "lost"
        }

        stage_key = stage_map.get(new_stage.lower())
        if not stage_key:
            return f"Estágio '{new_stage}' não reconhecido. Use: novo, em_contato, qualificado, negociacao, fechado, perdido"

        old_stage = contact.pipeline_stage or "novo"

        # Update contact stage
        contact.pipeline_stage = stage_key
        contact.updated_at = datetime.utcnow()

        # Add note about stage change
        if reason:
            existing_notes = contact.notes or ""
            timestamp = datetime.utcnow().strftime("%d/%m %H:%M")
            contact.notes = f"{existing_notes}\n\n[{timestamp}] Movido para '{new_stage}': {reason}".strip()

        session.add(contact)

        # Find and update pipeline card column
        card = session.exec(
            select(PipelineCard)
            .where(PipelineCard.is_active == True)
            .where(PipelineCard.contact_id == contact.id)
        ).first()

        column_name = ""
        if card:
            # Find column for new stage (by name pattern matching)
            columns = session.exec(
                select(PipelineColumn)
                .where(PipelineColumn.is_active == True)
                .order_by(PipelineColumn.order)
            ).all()

            stage_column_map = {
                "new": ["novo", "new", "lead"],
                "contacted": ["contato", "contacted", "em contato"],
                "qualified": ["qualificado", "qualified"],
                "negotiation": ["negociacao", "negotiation", "negociando"],
                "won": ["fechado", "won", "ganho", "convertido"],
                "lost": ["perdido", "lost"]
            }

            target_column = None
            patterns = stage_column_map.get(stage_key, [])
            for col in columns:
                col_name_lower = col.name.lower()
                for pattern in patterns:
                    if pattern in col_name_lower:
                        target_column = col
                        break
                if target_column:
                    break

            # If no match found, use column by order
            if not target_column:
                order_map = {"new": 0, "contacted": 1, "qualified": 2, "negotiation": 3, "won": 4, "lost": 5}
                target_order = order_map.get(stage_key, 0)
                for col in columns:
                    if col.order == target_order:
                        target_column = col
                        break

            if target_column:
                card.column_id = target_column.id
                card.moved_at = datetime.utcnow()
                card.updated_at = datetime.utcnow()
                column_name = target_column.name
                session.add(card)

        session.commit()

        stage_emoji = {
            "new": "🆕",
            "contacted": "📞",
            "qualified": "✅",
            "negotiation": "💼",
            "won": "🎉",
            "lost": "😔"
        }

        return f"""{stage_emoji.get(stage_key, '📋')} **Contato movido**

👤 **{contact.name}**
📊 {old_stage} → **{new_stage}**
{f'📁 Coluna: {column_name}' if column_name else ''}
{f'📝 Motivo: {reason}' if reason else ''}"""


@tool
def get_contact_info(
    phone: Annotated[str, "Customer's phone number"] = "",
    contact_name: Annotated[str, "Customer's name (if phone not known)"] = ""
) -> str:
    """
    Retrieve information about a contact.

    Use this tool when:
    - Need to check if customer is already in the system
    - Want to see previous interaction history
    - Looking up customer details before responding

    Returns contact information if found.
    """
    with Session(engine) as session:
        contact = None
        if phone:
            contact = session.exec(
                select(Contact)
                .where(Contact.is_active == True)
                .where(Contact.phone == phone)
            ).first()
        elif contact_name:
            contact = session.exec(
                select(Contact)
                .where(Contact.is_active == True)
                .where(Contact.name.ilike(f"%{contact_name}%"))
                .order_by(Contact.last_interaction_at.desc())
            ).first()

        if not contact:
            return "Contato não encontrado no sistema. Este parece ser um novo lead."

        # Format data
        data_lines = []
        if contact.data:
            if contact.data.get("interest"):
                data_lines.append(f"🎯 Interesse: {contact.data['interest']}")
            if contact.data.get("budget"):
                data_lines.append(f"💰 Orçamento: {contact.data['budget']}")
            if contact.data.get("urgency"):
                data_lines.append(f"⏰ Urgência: {contact.data['urgency']}")

        stage_display = {
            "new": "Novo Lead 🆕",
            "contacted": "Em Contato 📞",
            "qualified": "Qualificado ✅",
            "negotiation": "Negociação 💼",
            "won": "Fechado 🎉",
            "lost": "Perdido 😔"
        }

        last_interaction = ""
        if contact.last_interaction_at:
            last_interaction = contact.last_interaction_at.strftime("%d/%m/%Y às %H:%M")

        return f"""📋 **Informações do Contato**

👤 **{contact.name}**
📱 {contact.phone or 'Sem telefone'}
📧 {contact.email or 'Sem email'}
📊 Estágio: {stage_display.get(contact.pipeline_stage, contact.pipeline_stage or 'Não definido')}
💬 Conversas: {contact.conversation_count}
📅 Última interação: {last_interaction or 'Nunca'}
{chr(10).join(data_lines) if data_lines else ''}
{f'🏷️ Tags: {", ".join(contact.tags)}' if contact.tags else ''}
{f'📝 Notas: {contact.notes}' if contact.notes else ''}"""


@tool
def qualify_lead(
    phone: Annotated[str, "Customer's phone number"],
    has_budget: Annotated[bool, "Does the customer have budget for the purchase?"] = False,
    has_authority: Annotated[bool, "Is the customer the decision maker?"] = False,
    has_need: Annotated[bool, "Does the customer have a clear need/problem?"] = False,
    has_timeline: Annotated[bool, "Does the customer have a defined timeline?"] = False,
    qualification_notes: Annotated[str, "Notes about the qualification"] = ""
) -> str:
    """
    Qualify a lead using BANT criteria (Budget, Authority, Need, Timeline).

    Use this tool when:
    - You've gathered enough information to qualify a lead
    - Determining if a lead should be prioritized
    - Recording qualification criteria

    Automatically moves qualified leads to the 'qualificado' stage.

    Returns qualification result and recommendation.
    """
    with Session(engine) as session:
        contact = session.exec(
            select(Contact)
            .where(Contact.is_active == True)
            .where(Contact.phone == phone)
        ).first()

        if not contact:
            return "Contato não encontrado. Salve o contato primeiro usando save_contact."

        # Calculate qualification score
        score = sum([has_budget, has_authority, has_need, has_timeline])
        is_qualified = score >= 3  # At least 3 of 4 criteria

        # Update contact data
        contact.data = {
            **contact.data,
            "bant_budget": has_budget,
            "bant_authority": has_authority,
            "bant_need": has_need,
            "bant_timeline": has_timeline,
            "bant_score": score,
            "is_qualified": is_qualified
        }

        if is_qualified:
            contact.pipeline_stage = "qualified"

        # Add qualification notes
        if qualification_notes:
            existing_notes = contact.notes or ""
            timestamp = datetime.utcnow().strftime("%d/%m %H:%M")
            contact.notes = f"{existing_notes}\n\n[{timestamp}] Qualificação: {qualification_notes}".strip()

        contact.updated_at = datetime.utcnow()
        session.add(contact)

        # Update pipeline card if qualified
        if is_qualified:
            card = session.exec(
                select(PipelineCard)
                .where(PipelineCard.is_active == True)
                .where(PipelineCard.contact_id == contact.id)
            ).first()

            if card:
                # Find qualified column
                qualified_col = session.exec(
                    select(PipelineColumn)
                    .where(PipelineColumn.is_active == True)
                    .where(PipelineColumn.order == 2)  # Typically the 3rd column
                ).first()

                if qualified_col:
                    card.column_id = qualified_col.id
                    card.priority = "high"
                    card.moved_at = datetime.utcnow()
                    session.add(card)

        session.commit()

        # Format result
        criteria = []
        criteria.append(f"{'✅' if has_budget else '❌'} Orçamento")
        criteria.append(f"{'✅' if has_authority else '❌'} Autoridade de decisão")
        criteria.append(f"{'✅' if has_need else '❌'} Necessidade clara")
        criteria.append(f"{'✅' if has_timeline else '❌'} Prazo definido")

        status = "**Lead QUALIFICADO** 🌟" if is_qualified else "Lead em desenvolvimento"
        recommendation = (
            "Priorizar atendimento e encaminhar para negociação."
            if is_qualified else
            "Continuar nutrindo o lead e coletando mais informações."
        )

        return f"""📊 **Qualificação BANT**

👤 **{contact.name}**
📱 {contact.phone}

{chr(10).join(criteria)}

**Score:** {score}/4
**Status:** {status}

💡 **Recomendação:** {recommendation}"""


# Export all tools
PIPELINE_TOOLS = [
    save_contact,
    move_contact_stage,
    get_contact_info,
    qualify_lead,
]
