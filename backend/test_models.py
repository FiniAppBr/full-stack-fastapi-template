"""Quick test script to verify models work."""

import asyncio
from sqlmodel import Session, create_engine, select

from app.core.config import settings
from app.models import Agent, Block, User

# Create engine
engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))


def test_insert_data():
    """Test inserting an agent with blocks."""
    with Session(engine) as session:
        # Get the first user (should exist from initial_data.py)
        statement = select(User).limit(1)
        user = session.exec(statement).first()

        if not user:
            print("❌ No user found. Run initial_data.py first.")
            return

        print(f"✅ Found user: {user.email}")

        # Create an agent
        agent = Agent(
            owner_id=user.id,
            name="Test Restaurant Assistant",
            description="Handles reservations and menu questions",
            is_active=True,
            is_published=False,
        )
        session.add(agent)
        session.commit()
        session.refresh(agent)
        print(f"✅ Created agent: {agent.name} (ID: {agent.id})")

        # Create a knowledge block
        knowledge_block = Block(
            agent_id=agent.id,
            block_type="knowledge",
            name="Menu",
            description="Restaurant menu items",
            content="Pasta: $12, Pizza: $15, Salad: $8",
            content_type="text",
        )
        session.add(knowledge_block)

        # Create a personality block
        personality_block = Block(
            agent_id=agent.id,
            block_type="personality",
            name="Friendly Tone",
            description="Warm and welcoming communication style",
            tone="friendly",
            languages="en,pt",
            use_emojis=True,
            emoji_frequency="moderate",
        )
        session.add(personality_block)

        # Create an action block
        action_block = Block(
            agent_id=agent.id,
            block_type="action",
            name="Book Reservation",
            description="Handle table reservations",
            action_type="appointment",
            config={"calendar_id": "primary", "duration_minutes": 90},
            requires_confirmation=True,
        )
        session.add(action_block)

        session.commit()
        print(f"✅ Created 3 blocks for agent")

        # Query back all blocks for this agent
        statement = select(Block).where(Block.agent_id == agent.id)
        blocks = session.exec(statement).all()

        print(f"\n📦 Retrieved {len(blocks)} blocks:")
        for block in blocks:
            print(f"  - {block.block_type}: {block.name}")
            if block.block_type == "knowledge":
                print(f"    Content: {block.content}")
            elif block.block_type == "personality":
                print(f"    Tone: {block.tone}, Emojis: {block.use_emojis}")
            elif block.block_type == "action":
                print(f"    Action: {block.action_type}, Config: {block.config}")

        print("\n✅ All tests passed! Models work correctly.")


if __name__ == "__main__":
    test_insert_data()
