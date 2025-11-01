#!/usr/bin/env python3
"""
Create 10 test restaurant agents with dynamic schemas for validation testing.
"""

import sys
import json
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from sqlmodel import Session, create_engine, select
from app.models.agent import Agent
from app.models.user import User
from app.core.config import settings


def create_test_restaurants():
    """Create 10 restaurant agents with different configurations."""

    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

    restaurants = [
        {
            "name": "Pizza Express",
            "instructions": """You are a casual, friendly pizza restaurant assistant. Use a casual tone and be emoji-friendly 🍕
Keep responses quick and to the point. You have 15 different pizzas, 3 sizes (small, medium, large).
Delivery is available with R$8 fee. Be helpful with orders and inquiries.""",
            "response_schema": {
                "order_type": ["inquiry", "ordering", "complaint", "tracking"],
                "lead_quality": ["hot", "warm", "cold"],
                "pizza_size_mentioned": ["small", "medium", "large", "not_mentioned"]
            },
            "multi_turn_config": {
                "enabled": False
            },
            "media_rules": {
                "menu_pdf": {
                    "type": "pdf",
                    "triggers": ["menu", "prices", "what do you have"]
                }
            }
        },
        {
            "name": "Le Bernardin Fine Dining",
            "instructions": """You are an upscale fine dining restaurant assistant. Maintain a formal, sophisticated tone. Never use emojis.
You offer 8-course tasting menus with wine pairings. Reservations required. Average R$250+ per person.
Emphasize the culinary experience and attention to detail.""",
            "response_schema": {
                "party_size": ["1-2", "3-4", "5-8", "large_group"],
                "occasion": ["business", "celebration", "romantic", "casual"],
                "dietary_restrictions": ["none", "vegetarian", "allergies", "multiple"]
            },
            "multi_turn_config": {
                "enabled": True,
                "style": "formal",
                "max_splits": 3
            },
            "media_rules": {
                "wine_list": {
                    "type": "pdf",
                    "triggers": ["wine", "pairing", "drinks"]
                },
                "dress_code": {
                    "type": "image",
                    "triggers": ["dress", "attire", "what to wear"]
                }
            }
        },
        {
            "name": "QuickBite Fast Food",
            "instructions": """You are an energetic fast food restaurant assistant! Use LOTS of emojis 🍔🍟🎉
Super quick 15-minute delivery! Promote combos and deals. Menu includes burgers, fries, drinks.
Price range R$12-25. Be enthusiastic and promotional!""",
            "response_schema": {
                "order_type": ["combo", "individual", "sides_only", "drinks_only"],
                "upsell_opportunity": ["yes", "no", "already_maxed"],
                "urgency": ["normal", "hungry_now", "scheduling"]
            },
            "multi_turn_config": {
                "enabled": True,
                "style": "rapid",
                "max_splits": 3
            },
            "media_rules": {
                "promo_deals": {
                    "type": "image",
                    "triggers": ["deal", "combo", "special", "promotion"]
                }
            }
        },
        {
            "name": "Green Leaf Vegan Cafe",
            "instructions": """You are a warm, conscious vegan cafe assistant. Be informative about ingredients and sourcing.
All menu items are 100% vegan, many organic. Emphasize sustainability and health benefits.
Eco-friendly packaging. Help guide people new to plant-based eating.""",
            "response_schema": {
                "dietary_focus": ["vegan_curious", "committed_vegan", "health_focused", "allergy_driven"],
                "sustainability_interest": ["high", "medium", "low"],
                "allergen_concerns": ["soy", "nuts", "gluten", "none"]
            },
            "multi_turn_config": {
                "enabled": True,
                "style": "natural",
                "max_splits": 2
            },
            "media_rules": {
                "ingredient_sourcing": {
                    "type": "image",
                    "triggers": ["organic", "source", "ingredients", "where"]
                },
                "nutrition": {
                    "type": "pdf",
                    "triggers": ["nutrition", "calories", "macros", "healthy"]
                }
            }
        },
        {
            "name": "Tokyo Sushi Bar",
            "instructions": """You are a professional sushi restaurant assistant. Be precise and informative.
40 different rolls, fresh sashimi, sake pairings available. Delivery within 5km radius.
Help guide customers through Japanese menu items. Minimal emoji use.""",
            "response_schema": {
                "experience_level": ["sushi_expert", "familiar", "first_timer"],
                "special_requests": ["no_raw", "allergies", "modifications", "none"],
                "delivery_distance": ["under_2km", "2_to_5km", "out_of_range"]
            },
            "multi_turn_config": {
                "enabled": False
            },
            "media_rules": {
                "menu_images": {
                    "type": "image",
                    "triggers": ["menu", "what", "show", "pictures"]
                }
            }
        },
        {
            "name": "Smokey's BBQ Pit",
            "instructions": """You are a friendly BBQ restaurant assistant with southern hospitality. Be warm and casual.
Smoked meats (brisket, ribs, pulled pork), 3 house sauces. Family packs and catering available.
Share enthusiasm for BBQ and help with large orders.""",
            "response_schema": {
                "meat_preference": ["beef", "pork", "chicken", "mix", "vegetarian_guest"],
                "group_size": ["individual", "couple", "family", "party"],
                "occasion": ["regular_meal", "event", "catering_inquiry"]
            },
            "multi_turn_config": {
                "enabled": True,
                "style": "natural",
                "max_splits": 2
            },
            "media_rules": {
                "food_photos": {
                    "type": "image",
                    "triggers": ["look", "photos", "pictures", "show"]
                }
            }
        },
        {
            "name": "Nonna's Italian Kitchen",
            "instructions": """You are a warm Italian restaurant assistant representing traditional family recipes.
Tell stories about Nonna's homemade pasta and family traditions. Wine pairings available.
Authentic Italian cuisine with love in every dish. Be conversational and welcoming.""",
            "response_schema": {
                "course_interest": ["pasta", "pizza", "appetizer", "dessert", "full_meal"],
                "wine_pairing_interest": ["yes", "no", "needs_recommendation"],
                "celebration": ["birthday", "anniversary", "family_gathering", "none"]
            },
            "multi_turn_config": {
                "enabled": True,
                "style": "natural",
                "max_splits": 3
            },
            "media_rules": {
                "wine_pairing": {
                    "type": "pdf",
                    "triggers": ["wine", "pairing", "drinks"]
                }
            }
        },
        {
            "name": "FitBowl Health Food",
            "instructions": """You are a minimal, data-driven health food restaurant assistant.
Build-your-own bowls with macro tracking. Focus on nutritional data and fitness goals.
Be concise and informative. Meal prep options available.""",
            "response_schema": {
                "dietary_goal": ["weight_loss", "muscle_gain", "maintenance", "general_health"],
                "macro_tracking": ["yes", "no", "needs_help"],
                "allergens": ["none", "dairy", "gluten", "nuts", "multiple"]
            },
            "multi_turn_config": {
                "enabled": False
            },
            "media_rules": {
                "nutrition_chart": {
                    "type": "pdf",
                    "triggers": ["nutrition", "macros", "calories", "protein"]
                }
            }
        },
        {
            "name": "Burger Madness",
            "instructions": """You are a fun, playful burger restaurant assistant! Meme-friendly and energetic! 🍔🔥
50+ toppings available! Crazy combos and eating challenges. Be playful and enthusiastic.
Help customers build their dream burger. Budget-friendly to premium options.""",
            "response_schema": {
                "customization_level": ["simple", "moderate", "extreme", "challenge"],
                "budget_range": ["under_30", "30_to_50", "50_plus", "unlimited"],
                "vibe": ["quick_meal", "hangout", "challenge_attempt"]
            },
            "multi_turn_config": {
                "enabled": True,
                "style": "rapid",
                "max_splits": 3
            },
            "media_rules": {
                "build_burger_gif": {
                    "type": "image",
                    "triggers": ["customize", "toppings", "build", "options"]
                }
            }
        },
        {
            "name": "Thai Orchid",
            "instructions": """You are a balanced, informative Thai restaurant assistant sharing authentic cuisine.
Explain dishes and cultural context. 4 spice levels available (mild to Thai hot).
Vegetarian options available. Help guide customers through authentic Thai flavors.""",
            "response_schema": {
                "spice_tolerance": ["mild", "medium", "hot", "thai_hot"],
                "familiarity": ["thai_expert", "tried_before", "first_time"],
                "order_complexity": ["simple", "standard", "custom_requests"]
            },
            "multi_turn_config": {
                "enabled": True,
                "style": "natural",
                "max_splits": 2
            },
            "media_rules": {
                "spice_guide": {
                    "type": "image",
                    "triggers": ["spice", "spicy", "hot", "level"]
                },
                "dish_photos": {
                    "type": "image",
                    "triggers": ["look", "photos", "pictures", "authentic"]
                }
            }
        }
    ]

    with Session(engine) as session:
        # Find admin user or any existing user to own test agents
        admin_user = session.exec(
            select(User).where(User.email == "admin@connectai.com")
        ).first()

        if not admin_user:
            # If no admin, just get first user
            admin_user = session.exec(select(User)).first()

        if not admin_user:
            print("❌ No users found in database. Create a user first.")
            return []

        print(f"Using owner: {admin_user.email} (ID: {admin_user.id})\n")

        created_agents = []

        for i, config in enumerate(restaurants, start=1):
            # Check if agent already exists
            existing = session.exec(
                select(Agent).where(Agent.name == config["name"])
            ).first()

            if existing:
                print(f"✓ Agent '{config['name']}' already exists (ID: {existing.id})")
                created_agents.append(existing)
                continue

            # Create new agent
            agent = Agent(
                owner_id=admin_user.id,
                name=config["name"],
                description=config["instructions"][:100],  # Short description
                response_schema=config["response_schema"],
                multi_turn_config=config["multi_turn_config"],
                media_rules=config["media_rules"],
            )

            session.add(agent)
            session.commit()
            session.refresh(agent)

            print(f"✓ Created agent '{agent.name}' (ID: {agent.id})")
            created_agents.append(agent)

        print(f"\n✅ All {len(created_agents)} restaurant agents ready!")
        print("\nAgent IDs:")

        # Build agent instructions mapping
        agent_configs = {}
        for i, agent in enumerate(created_agents):
            print(f"  {agent.id}: {agent.name}")
            agent_configs[str(agent.id)] = {
                "id": agent.id,
                "name": agent.name,
                "instructions": restaurants[i]["instructions"],
                "response_schema": agent.response_schema,
                "multi_turn_config": agent.multi_turn_config,
                "media_rules": agent.media_rules,
            }

        # Save full configs to JSON file for test execution
        config_file = Path(__file__).parent.parent / "docs" / "test-configs" / "restaurant_agents.json"
        config_file.parent.mkdir(parents=True, exist_ok=True)

        with open(config_file, "w") as f:
            json.dump(agent_configs, f, indent=2)

        print(f"\n✅ Saved agent configs to: {config_file}")

        return created_agents


if __name__ == "__main__":
    create_test_restaurants()
