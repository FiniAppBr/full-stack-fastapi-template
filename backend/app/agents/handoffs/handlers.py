"""
Handoff Handlers for Human Escalation

Sends notifications when agent needs to hand off to human:
- Complaints
- Too complex queries
- Out of scope requests
- Emergencies
- Frustrated/angry customers
"""
import logging
import httpx
from typing import Literal
from app.agents.config import OptimizationConfig

logger = logging.getLogger(__name__)


class HandoffHandler:
    """
    Manages human handoff notifications across multiple channels.

    Usage:
        handler = HandoffHandler(config)
        await handler.notify(
            customer_id="123",
            customer_name="João Silva",
            reason="complaint",
            message="I'm very unhappy with the service",
            sentiment="angry"
        )
    """

    def __init__(self, config: OptimizationConfig):
        self.config = config

    async def notify(
        self,
        customer_id: str,
        customer_name: str,
        reason: Literal["complaint", "too_complex", "out_of_scope", "emergency"],
        message: str,
        sentiment: Literal["neutral", "positive", "frustrated", "angry"] = "neutral",
        conversation_url: str | None = None
    ) -> dict[str, bool]:
        """
        Send handoff notifications to configured channels.

        Args:
            customer_id: Customer identifier
            customer_name: Customer's name
            reason: Why handoff is needed
            message: The customer's message that triggered handoff
            sentiment: Customer's emotional state
            conversation_url: Link to view full conversation

        Returns:
            {
                "slack": bool,
                "email": bool,
                "whatsapp": bool
            }
        """
        if not self.config.handoff.enabled:
            logger.info(f"Handoff triggered but disabled in config: {reason}")
            return {"slack": False, "email": False, "whatsapp": False}

        # Check if this reason should trigger notification
        should_notify = False
        if reason == "complaint" and self.config.handoff.notify_on_complaint:
            should_notify = True
        elif reason == "emergency" and self.config.handoff.notify_on_emergency:
            should_notify = True
        elif sentiment in ["frustrated", "angry"] and self.config.handoff.notify_on_frustrated:
            should_notify = True

        if not should_notify:
            logger.info(f"Handoff reason '{reason}' not configured for notification")
            return {"slack": False, "email": False, "whatsapp": False}

        # Build notification message
        urgency_emoji = "🚨" if reason == "emergency" else "⚠️"
        sentiment_emoji = {"neutral": "😐", "positive": "😊", "frustrated": "😟", "angry": "😠"}.get(sentiment, "")

        notification_text = (
            f"{urgency_emoji} **Human Handoff Required**\n\n"
            f"**Customer:** {customer_name} (ID: {customer_id})\n"
            f"**Reason:** {reason.replace('_', ' ').title()}\n"
            f"**Sentiment:** {sentiment} {sentiment_emoji}\n\n"
            f"**Message:**\n> {message}\n\n"
        )

        if conversation_url:
            notification_text += f"[View Conversation]({conversation_url})\n"

        results = {
            "slack": False,
            "email": False,
            "whatsapp": False
        }

        # Send to Slack
        if self.config.handoff.slack_webhook:
            results["slack"] = await self._send_slack(notification_text)

        # Send to Email
        if self.config.handoff.email_recipient:
            results["email"] = await self._send_email(
                notification_text,
                customer_name,
                reason
            )

        # Send to WhatsApp
        if self.config.handoff.whatsapp_number:
            results["whatsapp"] = await self._send_whatsapp(
                notification_text,
                customer_name
            )

        return results

    async def _send_slack(self, text: str) -> bool:
        """Send notification to Slack via webhook"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.config.handoff.slack_webhook,
                    json={"text": text},
                    timeout=5.0
                )
                success = response.status_code == 200
                if not success:
                    logger.error(f"Slack webhook failed: {response.status_code}")
                return success
        except Exception as e:
            logger.error(f"Slack notification failed: {e}")
            return False

    async def _send_email(self, text: str, customer_name: str, reason: str) -> bool:
        """Send notification via email"""
        # TODO: Integrate with email service (SendGrid, AWS SES, etc.)
        # For now, just log
        logger.info(f"Email notification would be sent to {self.config.handoff.email_recipient}")
        logger.info(f"Subject: Handoff Required - {customer_name} ({reason})")
        logger.info(f"Body: {text}")
        return True

    async def _send_whatsapp(self, text: str, customer_name: str) -> bool:
        """Send notification via WhatsApp"""
        # TODO: Integrate with WhatsApp Business API (Twilio, etc.)
        # For now, just log
        logger.info(f"WhatsApp notification would be sent to {self.config.handoff.whatsapp_number}")
        logger.info(f"Message: {text}")
        return True


async def trigger_handoff(
    config: OptimizationConfig,
    customer_id: str,
    customer_name: str,
    reason: Literal["complaint", "too_complex", "out_of_scope", "emergency"],
    message: str,
    sentiment: Literal["neutral", "positive", "frustrated", "angry"] = "neutral",
    conversation_url: str | None = None
) -> dict[str, bool]:
    """
    Convenience function to trigger handoff without instantiating handler.

    Example:
        results = await trigger_handoff(
            config=config,
            customer_id="123",
            customer_name="João Silva",
            reason="complaint",
            message="This is unacceptable!",
            sentiment="angry"
        )
        # Returns: {"slack": True, "email": True, "whatsapp": False}
    """
    handler = HandoffHandler(config)
    return await handler.notify(
        customer_id=customer_id,
        customer_name=customer_name,
        reason=reason,
        message=message,
        sentiment=sentiment,
        conversation_url=conversation_url
    )
