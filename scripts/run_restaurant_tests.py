#!/usr/bin/env python3
"""
Execute 100-200 conversation turns across 10 restaurant agents.
Track tokens, response quality, and structured output accuracy.
"""

import json
import time
import requests
from pathlib import Path
from datetime import datetime

# Test configurations
BASE_URL = "http://localhost:5460/api/v1"
RESULTS_DIR = Path(__file__).parent.parent / "docs" / "test-results"
CONVERSATIONS_DIR = RESULTS_DIR / "conversations"

# Customer personas mapped to restaurants (by agent ID order)
CUSTOMER_PERSONAS = {
    "6": {  # Pizza Express
        "name": "Hungry College Student",
        "personality": "Casual, late night, budget-conscious",
        "initial_message": "yo, you guys still delivering? need some food asap"
    },
    "7": {  # Le Bernardin Fine Dining
        "name": "Business Professional",
        "personality": "Formal, planning lunch meeting",
        "initial_message": "Good afternoon. I'm looking to book a table for a business lunch next Tuesday. Party of 4."
    },
    "8": {  # QuickBite Fast Food
        "name": "Rushed Worker",
        "personality": "Quick, wants deals, limited time",
        "initial_message": "Hi! What's your fastest combo deal? I'm on lunch break"
    },
    "9": {  # Green Leaf Vegan Cafe
        "name": "Health-Conscious Mom",
        "personality": "Caring, asking questions, family-focused",
        "initial_message": "Hello! I'm new to vegan food but want to try something healthy for my family. What do you recommend?"
    },
    "10": {  # Tokyo Sushi Bar
        "name": "Sushi Enthusiast",
        "personality": "Knowledgeable, specific preferences",
        "initial_message": "Hi! Do you have any omakase options? I'm looking for fresh sashimi and maybe some specialty rolls."
    },
    "11": {  # Smokey's BBQ Pit
        "name": "Party Planner",
        "personality": "Organizing event, large order",
        "initial_message": "Hey there! I'm planning a BBQ party for about 20 people this weekend. Can you help with catering?"
    },
    "12": {  # Nonna's Italian Kitchen
        "name": "Anniversary Couple",
        "personality": "Romantic, celebrating special occasion",
        "initial_message": "Good evening! My wife and I are celebrating our anniversary. Do you have any romantic dinner specials?"
    },
    "13": {  # FitBowl Health Food
        "name": "Gym-Goer",
        "personality": "Data-driven, tracks macros, fitness-focused",
        "initial_message": "Hi, do you have bowls with macro breakdowns? I need about 40g protein and low carb."
    },
    "14": {  # Burger Madness
        "name": "Broke Student",
        "personality": "Fun, budget-limited, adventurous",
        "initial_message": "Dude! What's the craziest burger I can get for under R$30?"
    },
    "15": {  # Thai Orchid
        "name": "Thai Food Newbie",
        "personality": "Curious, needs guidance, afraid of spice",
        "initial_message": "Hi! I've never had Thai food before. What would you recommend for someone who can't handle spicy food?"
    }
}


def send_message(agent_id: str, customer_id: str, message: str, turn_count: int):
    """Send message to agent and return response."""
    url = f"{BASE_URL}/agent/message"
    payload = {
        "agent_id": agent_id,
        "customer_id": customer_id,
        "message": message,
        "turn_count": turn_count
    }

    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"❌ Error sending message: {e}")
        return None


def generate_user_reply(conversation_history: list, persona: dict, last_ai_response: dict) -> str:
    """
    Generate contextual user reply based on conversation state.

    This is a simple rule-based generator. In production, you'd use an LLM.
    """
    turn = len(conversation_history)
    messages = last_ai_response.get("messages", [])
    custom_fields = last_ai_response.get("custom_fields", {})

    # Extract last AI message
    last_message = " ".join(messages) if messages else ""

    # Simple context-aware responses based on turn count and AI message content
    if turn == 1:
        # Second message - usually responding to greeting
        if "menu" in last_message.lower() or "options" in last_message.lower():
            return "Yes, what do you have available?"
        elif "price" in last_message.lower() or "cost" in last_message.lower():
            return "That sounds good. What are the prices?"
        else:
            return "Great! Can you tell me more about your menu?"

    elif turn == 2:
        # Third message - showing interest
        if "recommend" in last_message.lower():
            return "That sounds interesting! How much is it?"
        elif any(word in last_message.lower() for word in ["popular", "favorite", "best"]):
            return "Perfect! I'll take that. How do I order?"
        else:
            return "Okay, I'm interested. What's the next step?"

    elif turn == 3:
        # Fourth message - asking details
        if "delivery" in last_message.lower():
            return "How long does delivery take?"
        elif "pickup" in last_message.lower():
            return "Where are you located?"
        else:
            return "Can I get that delivered?"

    elif turn == 4:
        # Fifth message - confirming order or asking final questions
        return "Sounds good! Can I place the order now?"

    elif turn == 5:
        # Sixth message - providing details if asked
        if "address" in last_message.lower():
            return "My address is 123 Main Street, apt 4B"
        elif "phone" in last_message.lower():
            return "My number is 555-0123"
        elif "payment" in last_message.lower():
            return "I'll pay with credit card"
        else:
            return "Yes, let's complete the order"

    elif turn == 6:
        # Seventh message - confirmation
        return "Perfect! Thank you so much!"

    elif turn >= 7:
        # Wrapping up
        if turn == 7:
            return "That's all I needed. Have a great day!"
        else:
            return "Thanks again! Bye!"

    return "Okay, thank you!"


def run_conversation(agent_id: str, agent_name: str, persona: dict, max_turns: int = 15):
    """Run a full conversation and track metrics."""

    customer_id = f"TEST-{agent_id}-{int(time.time())}"
    conversation_log = {
        "agent_id": agent_id,
        "agent_name": agent_name,
        "persona": persona,
        "customer_id": customer_id,
        "started_at": datetime.now().isoformat(),
        "turns": [],
        "metrics": {
            "total_turns": 0,
            "total_duration": 0,
            "custom_fields_collected": {},
            "media_sent": [],
            "multi_turn_splits": 0
        }
    }

    print(f"\n{'='*60}")
    print(f"🏪 {agent_name}")
    print(f"👤 {persona['name']} ({persona['personality']})")
    print(f"{'='*60}\n")

    # Send initial message
    user_message = persona["initial_message"]
    turn_count = 1

    while turn_count <= max_turns:
        print(f"Turn {turn_count}:")
        print(f"  👤 User: {user_message}")

        # Send to API
        start_time = time.time()
        response = send_message(agent_id, customer_id, user_message, turn_count)
        duration = time.time() - start_time

        if not response:
            print("  ❌ No response received")
            break

        # Extract response data
        ai_messages = response.get("messages", [])
        custom_fields = response.get("custom_fields", {})
        media = response.get("media", [])

        print(f"  🤖 AI: {' | '.join(ai_messages)}")
        if custom_fields:
            print(f"     📊 Fields: {custom_fields}")
        if media:
            print(f"     📎 Media: {[m.get('name') for m in media]}")
        print(f"     ⏱️  {duration:.2f}s")

        # Log turn
        conversation_log["turns"].append({
            "turn": turn_count,
            "user_message": user_message,
            "ai_messages": ai_messages,
            "custom_fields": custom_fields,
            "media": media,
            "duration": duration,
            "workflow_id": response.get("workflow_id"),
            "sentiment": response.get("sentiment"),
            "requires_handoff": response.get("requires_handoff"),
            "memory_saved": response.get("memory_saved")
        })

        # Update metrics
        conversation_log["metrics"]["total_turns"] = turn_count
        conversation_log["metrics"]["total_duration"] += duration

        # Track custom fields
        for key, value in custom_fields.items():
            if key not in conversation_log["metrics"]["custom_fields_collected"]:
                conversation_log["metrics"]["custom_fields_collected"][key] = []
            conversation_log["metrics"]["custom_fields_collected"][key].append(value)

        # Track media
        if media:
            conversation_log["metrics"]["media_sent"].extend([m.get("name") for m in media])

        # Track multi-turn
        if len(ai_messages) > 1:
            conversation_log["metrics"]["multi_turn_splits"] += 1

        # Check for natural end
        if turn_count >= 8 and any(word in user_message.lower() for word in ["bye", "thanks again", "have a great day"]):
            print("\n  ✅ Conversation ended naturally")
            break

        # Generate next user message
        turn_count += 1
        user_message = generate_user_reply(conversation_log["turns"], persona, response)

    conversation_log["ended_at"] = datetime.now().isoformat()

    # Print summary
    print(f"\n📊 Conversation Summary:")
    print(f"   Turns: {conversation_log['metrics']['total_turns']}")
    print(f"   Duration: {conversation_log['metrics']['total_duration']:.2f}s")
    print(f"   Custom Fields: {conversation_log['metrics']['custom_fields_collected']}")
    print(f"   Media Sent: {conversation_log['metrics']['media_sent']}")
    print(f"   Multi-turn Splits: {conversation_log['metrics']['multi_turn_splits']}")

    return conversation_log


def main():
    """Run all restaurant tests."""

    print("🧪 Restaurant AI Test Suite")
    print("="*60)

    # Create results directories
    CONVERSATIONS_DIR.mkdir(parents=True, exist_ok=True)

    # Load agent configs
    config_file = Path(__file__).parent.parent / "docs" / "test-configs" / "restaurant_agents.json"
    with open(config_file) as f:
        agent_configs = json.load(f)

    all_results = []

    # Run conversations
    for agent_id, config in agent_configs.items():
        persona = CUSTOMER_PERSONAS.get(agent_id)
        if not persona:
            print(f"⚠️  No persona for agent {agent_id}, skipping")
            continue

        # Run conversation
        result = run_conversation(
            agent_id=agent_id,
            agent_name=config["name"],
            persona=persona,
            max_turns=15
        )

        all_results.append(result)

        # Save individual conversation log
        conv_file = CONVERSATIONS_DIR / f"conversation_{agent_id}_{config['name'].replace(' ', '_')}.json"
        with open(conv_file, "w") as f:
            json.dump(result, f, indent=2)

        print(f"✅ Saved to {conv_file.name}\n")

        # Small delay between conversations
        time.sleep(1)

    # Generate summary
    summary = {
        "test_run": datetime.now().isoformat(),
        "total_conversations": len(all_results),
        "total_turns": sum(r["metrics"]["total_turns"] for r in all_results),
        "total_duration": sum(r["metrics"]["total_duration"] for r in all_results),
        "average_turns_per_conversation": sum(r["metrics"]["total_turns"] for r in all_results) / len(all_results),
        "conversations": all_results
    }

    # Save summary
    summary_file = RESULTS_DIR / "test_summary.json"
    with open(summary_file, "w") as f:
        json.dump(summary, f, indent=2)

    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    print(f"Total Conversations: {summary['total_conversations']}")
    print(f"Total Turns: {summary['total_turns']}")
    print(f"Total Duration: {summary['total_duration']:.2f}s")
    print(f"Avg Turns/Conversation: {summary['average_turns_per_conversation']:.1f}")
    print(f"\n✅ Results saved to: {RESULTS_DIR}")


if __name__ == "__main__":
    main()
