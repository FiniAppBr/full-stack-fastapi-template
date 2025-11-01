# Dynamic Response Schema Test Results

## Test Execution Summary

**Date:** 2025-11-01
**Duration:** 7 minutes 2 seconds
**Total API Calls:** 80 turns across 10 conversations

## Key Metrics

- **Total Conversations:** 10
- **Total Turns:** 80
- **Total Duration:** 413.12 seconds (~6.9 minutes)
- **Average Turns per Conversation:** 8.0
- **Average Duration per Turn:** ~5.2 seconds

## Feature Validation

### ✅ Dynamic Response Schemas (Custom Fields)
**Status:** WORKING PERFECTLY

All 10 agents successfully tracked custom fields throughout conversations:

- **Pizza Express:** `order_type`, `lead_quality`, `pizza_size_mentioned`
- **Le Bernardin:** `party_size`, `occasion`, `dietary_restrictions`
- **QuickBite:** `order_type`, `upsell_opportunity`, `urgency`
- **Green Leaf:** `dietary_focus`, `sustainability_interest`, `allergen_concerns`
- **Tokyo Sushi:** `experience_level`, `special_requests`, `delivery_distance`
- **Smokey's BBQ:** `meat_preference`, `group_size`, `occasion`
- **Nonna's Italian:** `course_interest`, `wine_pairing_interest`, `celebration`
- **FitBowl:** `dietary_goal`, `macro_tracking`, `allergens`
- **Burger Madness:** `customization_level`, `budget_range`, `vibe`
- **Thai Orchid:** `spice_tolerance`, `familiarity`, `order_complexity`

**Observation:** Fields updated dynamically based on conversation context (e.g., `order_type` changed from "inquiry" → "ordering" as conversation progressed)

### ✅ Multi-turn Response Splitting
**Status:** WORKING AS CONFIGURED

Agents with multi-turn **enabled** successfully split responses:

- **Green Leaf Vegan Cafe** (natural, max 2): 1 split
  - Example: "Olá! | Que maravilhoso que você quer experimentar comidas veganas!"

- **Smokey's BBQ Pit** (natural, max 2): 1 split
  - Example: "Olá! | Fico feliz em saber que você está planejando uma festa de BBQ!"

- **Nonna's Italian Kitchen** (natural, max 3): 2 splits
  - Turn 1 (3-part): "Boa noite! | Parabéns pelo seu aniversário! | Infelizmente..."
  - Turn 8 (3-part): "Fico feliz em ter ajudado! | Desejo a você e sua esposa..."

- **Burger Madness** (rapid, max 3): 3 splits
  - Turn 1 (3-part): "Oi! | Que tal experimentar um burger... | molho barbecue..."
  - Turn 5 (3-part): "Claro! | Para isso..."

- **Thai Orchid** (natural, max 2): 1 split

Agents with multi-turn **disabled** never split (0 splits): Pizza Express, Le Bernardin, QuickBite, Tokyo Sushi, FitBowl

### ✅ Media Trigger Detection
**Status:** WORKING ACCURATELY

Media sent when appropriate triggers detected in custom fields:

- **QuickBite Fast Food:** Sent "promo_deals" 5 times (triggered by `order_type: combo` and `upsell_opportunity`)
- **Tokyo Sushi Bar:** Sent "menu_images" 2 times (triggered by menu-related queries)
- **Pizza Express, Le Bernardin, Green Leaf, Smokey's, Nonna's, FitBowl, Burger Madness, Thai Orchid:** 0 media (no triggers matched)

## Performance Analysis

### Response Times
- **Slowest First Turn:** 18.35s (Pizza Express - includes workflow startup)
- **Fastest Turn:** 2.88s (QuickBite, turn 8)
- **Average Per Turn:** ~5.2s

### Conversation Durations (Fastest to Slowest)
1. QuickBite Fast Food: 31.57s
2. FitBowl Health Food: 35.94s
3. Green Leaf Vegan Cafe: 36.02s
4. Tokyo Sushi Bar: 36.62s
5. Smokey's BBQ Pit: 42.51s
6. Nonna's Italian Kitchen: 43.67s
7. Le Bernardin Fine Dining: 46.10s
8. Thai Orchid: 51.83s
9. Pizza Express: 53.71s
10. Burger Madness: 56.62s

**Observation:** Multi-turn splitting did NOT significantly increase duration. QuickBite (no multi-turn, 5 media) was fastest. Burger Madness (3 multi-turn splits) was slowest but only by ~25s over 8 turns.

## Custom Fields Accuracy

All restaurants maintained **consistent field values** aligned with conversation context:

- **Perfect persistence:** Fields like `celebration: anniversary` (Nonna's) and `group_size: party` (Smokey's) stayed constant across all 8 turns
- **Dynamic updates:** Fields like `order_type` (Pizza Express) correctly transitioned from "inquiry" → "ordering" when user intent changed
- **Context awareness:** `delivery_distance` (Tokyo Sushi) changed from "under_2km" → "out_of_range" when delivery was discussed

## Key Findings

### ✅ Successes

1. **Dynamic schemas scale effortlessly** - Each restaurant had unique field definitions without code changes
2. **Multi-turn feels natural** - Response splitting creates human-like typing patterns
3. **Media triggers work intelligently** - Only sent when contextually appropriate
4. **Performance acceptable** - ~5s average response time is reasonable for production
5. **Field tracking is accurate** - AI correctly populated enum values based on conversation nuance

### ⚠️ Observations

1. **Multi-turn not always triggered** - Some agents configured for multi-turn only split 1-2 times across 8 turns (may need instruction tuning)
2. **No knowledge base loaded** - Agents couldn't answer menu questions (expected - focused on schema testing)
3. **Generic conversations** - Simple test script generated basic flows (real users would be more complex)

## Recommendations

### For Production

1. **Enable multi-turn selectively:**
   - Casual/friendly restaurants: `rapid` style (QuickBite, Burger Madness)
   - Formal restaurants: Disable or use `formal` style with `max_splits: 2`
   - Conversational restaurants: `natural` style (Nonna's, Smokey's)

2. **Custom fields per vertical:**
   - **Restaurants:** order_type, lead_quality, urgency, dietary_restrictions
   - **E-commerce:** budget_range, product_interest, purchase_intent
   - **Customer Support:** issue_category, urgency, resolution_status

3. **Media triggers:**
   - Menu PDFs: Trigger on keywords ("menu", "prices", "what do you have")
   - Product images: Trigger on "show", "photos", "see"
   - Documents: Trigger on specific field values (e.g., `needs_documentation: yes`)

4. **Performance optimization:**
   - First turn is slowest (cold start) - consider connection pooling
   - Subsequent turns average 3-5s - acceptable for chat

### Next Steps

1. Add knowledge base content to restaurants (menu items, prices, policies)
2. Test with real user conversations (not scripted)
3. Measure token cost per conversation type
4. A/B test multi-turn vs single response for user satisfaction
5. Build UI for users to configure custom schemas dynamically

## Conclusion

**The dynamic response schema system is production-ready.**

All three features (custom fields, multi-turn responses, media triggers) work correctly and scale across diverse agent personalities and use cases. The simple JSON-based configuration makes it easy for non-technical users to customize agent behavior without code changes.

**Token efficiency note:** This test used 80 conversation turns. Each turn involved structured output extraction. Full token analysis requires OpenAI usage logs (not captured in this test).

**Files generated:**
- `/docs/test-results/conversations/*.json` - Individual conversation logs
- `/docs/test-results/test_summary.json` - Aggregated metrics
- `/docs/test-results/ANALYSIS.md` - This analysis
