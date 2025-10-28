"""
Test script for the Assistant AI
Run this after starting the worker
"""
import asyncio
from app.services.agent_service import agent_service


async def test_conversation():
    """Test a simple conversation"""

    print("🧪 Testing Assistant AI workflow...")
    print("-" * 50)

    test_message = "Quanto custa o banho para cachorro pequeno?"
    print(f"📝 Message: {test_message}")
    print()

    try:
        result = await agent_service.send_message(
            customer_id="test-customer-123",
            message=test_message,
            agent_id="test-agent-456"
        )

        print("✅ Response received!")
        print(f"🤖 Response: {result.response}")
        print(f"🎯 Intent: {result.intent}")
        print(f"📊 Confidence: {result.confidence:.2f}")
        print()
        print("Test successful! 🎉")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_conversation())
