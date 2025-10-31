"""
Payment Function Tools for OpenAI Agents SDK

These tools allow the agent to generate and send payment links
directly in the conversation.
"""
from datetime import datetime, timedelta
from typing import Literal


def send_payment_link(
    customer_name: str,
    customer_phone: str,
    amount: float,
    description: str,
    currency: str = "BRL",
    payment_method: Literal["pix", "credit_card", "both"] = "both"
) -> dict:
    """
    Generate a payment link and send it to the customer.

    This is a placeholder implementation. Replace with actual payment provider
    integration (Stripe, PayPal, Mercado Pago, etc.)

    Args:
        customer_name: Customer's full name
        customer_phone: Customer's phone number (for WhatsApp link)
        amount: Amount in the specified currency (e.g., 150.00)
        description: Description of what the payment is for
        currency: Currency code (default: BRL for Brazilian Real)
        payment_method: Accepted payment methods

    Returns:
        {
            "success": bool,
            "payment_link": str,
            "payment_id": str,
            "qr_code": str | None,
            "expires_at": str
        }

    Example:
        result = send_payment_link(
            "João Silva",
            "+55 11 98765-4321",
            150.00,
            "Dog grooming service",
            "BRL",
            "both"
        )
    """
    # TODO: Integrate with actual payment provider
    # - Stripe: https://stripe.com/docs/payment-links
    # - Mercado Pago: https://www.mercadopago.com.br/developers/pt/docs/checkout-api
    # - PayPal: https://developer.paypal.com/docs/api/invoicing/

    # Mock payment ID
    payment_id = f"PAY{datetime.now().strftime('%Y%m%d%H%M%S')}"

    # Mock payment link
    payment_link = f"https://pay.example.com/{payment_id}"

    # Mock QR code (for PIX in Brazil)
    qr_code = None
    if payment_method in ["pix", "both"]:
        qr_code = f"00020126330014BR.GOV.BCB.PIX0111{payment_id}520400005303986540{amount}5802BR5913{customer_name[:13]}6009SAO_PAULO"

    # Expiration (typically 24-48 hours)
    expires_at = (datetime.now() + timedelta(hours=24)).isoformat()

    return {
        "success": True,
        "payment_link": payment_link,
        "payment_id": payment_id,
        "qr_code": qr_code,
        "expires_at": expires_at,
        "amount": amount,
        "currency": currency,
        "description": description,
        "message": (
            f"💳 Payment link generated!\n"
            f"Amount: {currency} {amount:.2f}\n"
            f"Description: {description}\n"
            f"Link: {payment_link}\n"
            f"Expires: {expires_at}\n"
            f"\nSend this link to {customer_name} at {customer_phone}"
        )
    }
