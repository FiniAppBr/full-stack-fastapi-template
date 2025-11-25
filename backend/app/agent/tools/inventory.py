"""
Inventory Tools - Stock management for AI agents.

Provides LangGraph-compatible tools for:
- check_stock: Check product availability
- reserve_stock: Reserve stock for a customer
- release_stock: Release reserved stock

These tools work with entities that have the 'stockable' capability.
"""
from datetime import datetime
from typing import Annotated

from langchain_core.tools import tool
from sqlmodel import Session, select
from sqlalchemy import text

from app.core.db import engine
from app.models.entity import Entity
from app.models.operations import Inventory


def _find_stockable_entity(session: Session, product_name: str = "", product_id: int = 0) -> tuple:
    """Find an entity, optionally checking for stockable capability."""
    entity = None
    is_stockable = False

    if product_id:
        entity = session.get(Entity, product_id)
        is_stockable = entity and "stockable" in (entity.capabilities or [])
    elif product_name:
        # First, try to find by name in products category
        entity = session.exec(
            select(Entity)
            .where(Entity.is_active == True)
            .where(Entity.name.ilike(f"%{product_name}%"))
            .where(Entity.category == "products")
        ).first()

        if entity:
            is_stockable = "stockable" in (entity.capabilities or [])

    return entity, is_stockable


@tool
def check_stock(
    product_name: Annotated[str, "Name of the product to check (partial match supported)"] = "",
    product_id: Annotated[int, "Product entity ID (if known)"] = 0
) -> str:
    """
    Check stock availability for a product.

    Use this tool when:
    - Customer asks about product availability ("tem em estoque?", "tem disponível?")
    - Before confirming a purchase
    - Customer asks "you have X in stock?"

    Returns current stock level and availability status.
    """
    with Session(engine) as session:
        # Find product
        entity, is_stockable = _find_stockable_entity(session, product_name, product_id)

        if entity and not is_stockable:
            return f"O produto **{entity.name}** não é controlado por estoque. É um produto digital ou serviço."

        if not entity:
            return "Produto não encontrado. Verifique o nome e tente novamente."

        # Get inventory
        inventory = session.exec(
            select(Inventory)
            .where(Inventory.entity_id == entity.id)
        ).first()

        if not inventory:
            return f"**{entity.name}** não possui controle de estoque configurado."

        available = inventory.quantity - inventory.reserved_quantity
        price = entity.data.get("price", 0) if entity.data else 0
        price_display = f"R$ {price:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

        # Status emoji
        if available <= 0:
            status = "❌ **Esgotado**"
            message = "Infelizmente não temos em estoque no momento. Deseja ser avisado quando chegar?"
        elif available <= inventory.low_stock_threshold:
            status = "⚠️ **Últimas unidades**"
            message = f"Aproveite, restam apenas **{available}** unidades!"
        else:
            status = "✅ **Disponível**"
            message = f"Temos **{available}** unidades disponíveis."

        return f"""📦 **{entity.name}**

{status}
{message}

💰 Preço: {price_display}
{f'📋 SKU: {inventory.sku}' if inventory.sku else ''}

Posso reservar para você?"""


@tool
def reserve_stock(
    product_name: Annotated[str, "Name of the product to reserve"],
    quantity: Annotated[int, "Quantity to reserve"] = 1,
    customer_name: Annotated[str, "Customer name for the reservation"] = "",
    customer_phone: Annotated[str, "Customer phone for the reservation"] = ""
) -> str:
    """
    Reserve stock for a customer.

    Use this tool when:
    - Customer confirms they want to buy a product
    - Need to hold inventory while customer completes payment
    - Customer asks to reserve/hold a product

    Returns reservation confirmation.
    """
    with Session(engine) as session:
        # Find product
        entity, is_stockable = _find_stockable_entity(session, product_name)

        if not entity or not is_stockable:
            return f"Produto '{product_name}' não encontrado ou não é estocável."

        # Get inventory
        inventory = session.exec(
            select(Inventory)
            .where(Inventory.entity_id == entity.id)
        ).first()

        if not inventory:
            return f"**{entity.name}** não possui controle de estoque."

        available = inventory.quantity - inventory.reserved_quantity

        if available < quantity:
            if available <= 0:
                return f"Desculpe, **{entity.name}** está esgotado. Não foi possível reservar."
            else:
                return f"Desculpe, só temos **{available}** unidades de **{entity.name}** disponíveis. Deseja reservar essa quantidade?"

        # Reserve stock
        inventory.reserved_quantity += quantity
        inventory.updated_at = datetime.utcnow()
        session.add(inventory)
        session.commit()

        price = entity.data.get("price", 0) if entity.data else 0
        total = price * quantity
        total_display = f"R$ {total:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

        customer_info = ""
        if customer_name:
            customer_info = f"\n👤 Reservado para: **{customer_name}**"
            if customer_phone:
                customer_info += f" ({customer_phone})"

        return f"""✅ **Reserva confirmada!**

📦 **{entity.name}** x {quantity}
💰 Total: {total_display}{customer_info}

⏰ Reserva válida por 24 horas.

Como deseja pagar? PIX, cartão ou boleto?"""


@tool
def release_stock(
    product_name: Annotated[str, "Name of the product to release"],
    quantity: Annotated[int, "Quantity to release from reservation"] = 1,
    reason: Annotated[str, "Reason for releasing (cancelled, expired, completed)"] = "cancelled"
) -> str:
    """
    Release reserved stock back to available.

    Use this tool when:
    - Customer cancels a reservation
    - Reservation expires without payment
    - Order is cancelled

    Returns confirmation of release.
    """
    with Session(engine) as session:
        # Find product
        entity = session.exec(
            select(Entity)
            .where(Entity.is_active == True)
            .where(Entity.name.ilike(f"%{product_name}%"))
        ).first()

        if not entity:
            return f"Produto '{product_name}' não encontrado."

        # Get inventory
        inventory = session.exec(
            select(Inventory)
            .where(Inventory.entity_id == entity.id)
        ).first()

        if not inventory:
            return f"**{entity.name}** não possui controle de estoque."

        if inventory.reserved_quantity < quantity:
            return f"Não há {quantity} unidades reservadas de **{entity.name}** para liberar."

        # Release stock
        inventory.reserved_quantity -= quantity
        inventory.updated_at = datetime.utcnow()
        session.add(inventory)
        session.commit()

        reason_display = {
            "cancelled": "Reserva cancelada",
            "expired": "Reserva expirada",
            "completed": "Pedido concluído"
        }.get(reason, reason)

        available = inventory.quantity - inventory.reserved_quantity

        return f"""📦 **Estoque liberado**

**{entity.name}** x {quantity}
📋 Motivo: {reason_display}
✅ Disponível agora: {available} unidades"""


@tool
def update_stock(
    product_name: Annotated[str, "Name of the product"],
    quantity_change: Annotated[int, "Quantity to add (positive) or subtract (negative)"],
    reason: Annotated[str, "Reason for stock change (restock, sale, adjustment, return)"] = "adjustment"
) -> str:
    """
    Update stock quantity (add or remove).

    Use this tool when:
    - Recording a sale (negative quantity)
    - Recording a restock (positive quantity)
    - Making inventory adjustments

    Returns new stock level.
    """
    with Session(engine) as session:
        # Find product
        entity = session.exec(
            select(Entity)
            .where(Entity.is_active == True)
            .where(Entity.name.ilike(f"%{product_name}%"))
        ).first()

        if not entity:
            return f"Produto '{product_name}' não encontrado."

        # Get inventory
        inventory = session.exec(
            select(Inventory)
            .where(Inventory.entity_id == entity.id)
        ).first()

        if not inventory:
            return f"**{entity.name}** não possui controle de estoque."

        old_qty = inventory.quantity
        new_qty = old_qty + quantity_change

        if new_qty < 0:
            return f"Não é possível reduzir o estoque. Quantidade atual: {old_qty}, tentativa de remover: {abs(quantity_change)}"

        inventory.quantity = new_qty
        inventory.updated_at = datetime.utcnow()

        if quantity_change > 0:
            inventory.last_restocked_at = datetime.utcnow()
        elif quantity_change < 0:
            inventory.last_sold_at = datetime.utcnow()

        session.add(inventory)
        session.commit()

        reason_emoji = {
            "restock": "📥",
            "sale": "💰",
            "adjustment": "📋",
            "return": "↩️"
        }.get(reason, "📋")

        change_display = f"+{quantity_change}" if quantity_change > 0 else str(quantity_change)
        available = inventory.quantity - inventory.reserved_quantity

        status = ""
        if available <= 0:
            status = "\n⚠️ Produto esgotado!"
        elif available <= inventory.low_stock_threshold:
            status = "\n⚠️ Estoque baixo - considere repor!"

        return f"""{reason_emoji} **Estoque atualizado**

**{entity.name}**
{change_display} unidades ({old_qty} → {new_qty})
✅ Disponível: {available}{status}"""


# Export all tools
INVENTORY_TOOLS = [
    check_stock,
    reserve_stock,
    release_stock,
    update_stock,
]
