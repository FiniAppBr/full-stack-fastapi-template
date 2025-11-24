# Interactive Tutorial System - Product Specification

## Vision

Allow clients to **train their AI sales agent by example** through an interactive tutorial where they respond to simulated customer conversations. The system captures their natural sales style and automatically generates few-shot examples, personality descriptions, and guardrails.

## Problem

Current approach requires:
- Writing YAML/Python config manually
- Guessing appropriate few-shot examples
- Trial-and-error to match desired personality
- Technical knowledge to configure agents

**Users want:** "Show the AI how I sell, and it should learn from that."

---

## Solution: Learn By Doing

### 📚 Core Concept

1. **Client plays sales rep** in simulated conversations
2. **AI plays customer** with various personalities/objections
3. **System captures** client's responses as training data
4. **Auto-generate** agent configuration from captured examples

---

## User Flow

### **Step 1: Tutorial Mode** (Interactive Conversation Builder)

```
┌─────────────────────────────────────────────────────────┐
│  Create Your Sales Agent - Tutorial                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Situation: [Dropdown: Greeting ▼]                     │
│                                                          │
│  🤖 Customer (AI):                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ oi, vi o anúncio de vocês                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  💬 Your Response:                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [Text input - type how you'd respond]           │   │
│  │                                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  [Send & Continue] [Save Situation] [Skip]             │
│                                                          │
│  Progress: 3 / 12 situations completed                  │
└─────────────────────────────────────────────────────────┘
```

#### Pre-Defined Situations

System provides 12-15 common situations:

**Discovery:**
- `greeting` - Initial contact
- `warm_intro` - Customer mentions seeing ad/referral
- `skill_level_discovery` - Asking about experience level
- `use_case_discovery` - Understanding their goals

**Objections:**
- `money_objection` - "Too expensive"
- `time_objection` - "Don't have time"
- `confidence_objection` - "Don't think I can do it"
- `method_objection` - "Prefer in-person"
- `trust_objection` - "Does it really work?"

**Closing:**
- `interest_shown` - Customer expresses interest
- `direct_price_question` - "How much does it cost?"
- `ready_to_buy` - "I want to buy"
- `payment_question` - "What payment methods?"

#### Customer AI Simulator

Each situation has a customer personality:

```python
class CustomerSimulator:
    profiles = {
        "curious": "Asks many questions, wants details",
        "skeptical": "Doubts claims, needs proof",
        "price_sensitive": "Focuses on cost, looks for deals",
        "enthusiastic": "Excited, easy to engage",
        "busy": "Short on time, wants quick answers"
    }
    
    def generate_response(situation, user_message, profile):
        """AI generates realistic customer replies based on profile."""
```

#### Dynamic Conversation Flow

```
User types response
     ↓
[Next Turn] button
     ↓
AI Customer generates follow-up
     ↓
User responds again
     ↓
Repeat 2-3 turns
     ↓
[Save Situation] - Captures full interaction
```

---

### **Step 2: Review & Refine**

```
┌─────────────────────────────────────────────────────────┐
│  Review Your Conversation Patterns                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ✅ Greeting (3 turns)                                  │
│     Preview: "oi! você já conhece nosso produto..."     │
│     [Edit] [Delete]                                     │
│                                                          │
│  ✅ Money Objection (4 turns)                           │
│     Preview: "entendo, dá pra parcelar em 12x..."       │
│     [Edit] [Delete]                                     │
│                                                          │
│  ✅ Time Objection (3 turns)                            │
│     Preview: "super normal essa preocupação..."         │
│     [Edit] [Delete]                                     │
│                                                          │
│  ⚠️  Direct Price Question - Not completed              │
│     [Complete Now]                                      │
│                                                          │
│  [Add Custom Situation] [Continue to Product Info]     │
└─────────────────────────────────────────────────────────┘
```

---

### **Step 3: Product Configuration**

```
┌─────────────────────────────────────────────────────────┐
│  Product & Company Information                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Product Name: [                                    ]   │
│  Company Name: [                                    ]   │
│  Price: [        ] Payment Options: [12x installments]  │
│                                                          │
│  Product Description:                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [Rich text editor for product details]          │   │
│  │                                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Upload Knowledge Documents:                             │
│  [📎 Upload Files] [📄 Paste Text]                     │
│                                                          │
│  - product_details.pdf (2.3 MB)                         │
│  - faq.txt (145 KB)                                     │
│  - sales_script.docx (890 KB)                           │
│                                                          │
│  [Continue to Preview]                                  │
└─────────────────────────────────────────────────────────┘
```

---

### **Step 4: AI Analysis & Generation**

```
┌─────────────────────────────────────────────────────────┐
│  🤖 Generating Your Agent...                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ✓ Analyzing your conversation style                    │
│  ✓ Extracting personality traits                        │
│  ✓ Generating few-shot examples (12 examples)           │
│  ✓ Processing knowledge documents (3 files)             │
│  ✓ Creating embeddings (1,847 chunks)                   │
│  ⏳ Compiling agent configuration...                    │
│                                                          │
│  This will take about 30 seconds...                     │
└─────────────────────────────────────────────────────────┘
```

#### What Gets Generated

```python
# 1. PERSONALITY EXTRACTION
personality = extract_personality(saved_interactions)
# Analyzes:
# - Capitalization patterns (formal vs casual)
# - Sentence length distribution
# - Use of verbal tics (né, viu, sabe)
# - Emoji frequency
# - Question-ending frequency

# 2. FEW-SHOT EXAMPLES
examples = generate_examples(saved_interactions)
# Creates ConversationExample objects:
# - User's actual messages as assistant responses
# - AI customer messages as user inputs
# - Automatically tags with situation, intent, traits

# 3. GUARDRAILS
guardrails = extract_guardrails(saved_interactions)
# Detects patterns:
# - Words/phrases user consistently uses
# - Words/phrases user never uses
# - Response structure preferences
# - Conditional behaviors

# 4. KNOWLEDGE BASE
chunks = process_documents(uploaded_files)
# - Semantic chunking (80-120 tokens)
# - Embedding generation
# - Label extraction
```

---

### **Step 5: Test & Refine**

```
┌─────────────────────────────────────────────────────────┐
│  Test Your Agent                                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Chat Interface:                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ You: oi                                          │   │
│  │                                                  │   │
│  │ Agent: oi! você já conhece nosso produto ou tá  │   │
│  │        vendo agora?                              │   │
│  │                                                  │   │
│  │ You: nunca vi                                    │   │
│  │                                                  │   │
│  │ Agent: massa! deixa eu te explicar...           │   │
│  │                                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  📊 Behind the Scenes:                                  │
│  - Intent: greeting → discovery                         │
│  - Example used: greeting_to_discovery                  │
│  - Chunks retrieved: 3 (avg score: 0.65)                │
│                                                          │
│  [Not quite right? Refine]  [Looks good! Deploy]       │
└─────────────────────────────────────────────────────────┘
```

---

### **Step 6: Deploy**

```
┌─────────────────────────────────────────────────────────┐
│  🎉 Your Agent is Ready!                                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Agent Name: Nina                                        │
│  Personality: Casual, friendly, helpful                  │
│  Examples: 12 situations trained                         │
│  Knowledge: 1,847 chunks from 3 documents                │
│                                                          │
│  📋 Integration Options:                                │
│                                                          │
│  WhatsApp:                                               │
│  [Connect WhatsApp Business API]                        │
│                                                          │
│  Web Widget:                                             │
│  <script src="..."></script>                            │
│  [Copy Code]                                            │
│                                                          │
│  API:                                                    │
│  POST /api/v1/agents/nina/chat                          │
│  [View Docs]                                            │
│                                                          │
│  [Go to Dashboard]                                      │
└─────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Database Schema

```python
# 1. Situation Templates (Pre-defined)
class SituationTemplate(BaseModel):
    id: str  # "greeting", "money_objection", etc.
    name: str  # "Greeting - First Contact"
    description: str  # "Customer initiates conversation"
    category: str  # "discovery", "objection", "closing"
    customer_profile: str  # "curious", "skeptical", etc.
    initial_message: str  # AI customer's opening line
    expected_turns: int  # How many back-and-forths
    difficulty: str  # "easy", "medium", "hard"

# 2. User's Saved Interactions
class SavedInteraction(BaseModel):
    id: str
    agent_id: str
    situation_id: str  # Links to SituationTemplate
    conversation: list[TurnMessage]
    created_at: datetime
    metadata: dict  # Customer profile used, difficulty, etc.

class TurnMessage(BaseModel):
    role: str  # "user" (customer) or "assistant" (user's response)
    content: str
    timestamp: datetime

# 3. Generated Agent Config
class GeneratedAgent(BaseModel):
    agent_id: str
    personality_description: str  # Auto-generated
    examples: list[ConversationExample]  # Auto-generated
    guardrails: Guardrails  # Auto-generated
    product_info: dict
    knowledge_chunks: int  # Count of RAG chunks
    status: str  # "draft", "testing", "live"
```

### AI Components

#### 1. Customer Simulator

```python
class CustomerSimulator:
    """Generates realistic customer responses in tutorial mode."""
    
    def __init__(self, profile: str, situation: SituationTemplate):
        self.profile = profile  # curious, skeptical, etc.
        self.situation = situation
        self.conversation_history = []
        
    async def generate_response(self, user_message: str) -> str:
        """Generate customer reply based on profile and context."""
        prompt = f"""
        You are a {self.profile} customer in a {self.situation.name} scenario.
        
        Conversation so far:
        {format_history(self.conversation_history)}
        
        Salesperson just said: "{user_message}"
        
        Respond naturally as the customer. Stay in character.
        Keep responses brief (1-2 sentences typical for WhatsApp).
        """
        
        response = await llm.generate(prompt)
        self.conversation_history.append({
            "sales": user_message,
            "customer": response
        })
        return response
```

#### 2. Personality Extractor

```python
class PersonalityExtractor:
    """Analyzes user's responses to extract personality traits."""
    
    def analyze(self, interactions: list[SavedInteraction]) -> str:
        """Generate personality description from user's style."""
        
        # Analyze patterns
        patterns = {
            "lowercase_start_rate": self._check_lowercase_starts(interactions),
            "avg_sentence_length": self._avg_sentence_length(interactions),
            "question_ending_rate": self._question_ending_rate(interactions),
            "verbal_tics": self._extract_verbal_tics(interactions),
            "emoji_frequency": self._emoji_frequency(interactions),
            "formality_score": self._assess_formality(interactions),
        }
        
        # Generate description
        prompt = f"""
        Based on these conversation patterns, write a personality description:
        
        {json.dumps(patterns, indent=2)}
        
        Format:
        [Agent Name] is [adjectives describing tone].
        
        Natural characteristics:
        - [Communication style traits]
        - [Structural patterns]
        
        MAS sempre:
        - [Non-negotiable behaviors]
        """
        
        return llm.generate(prompt)
```

#### 3. Example Generator

```python
class ExampleGenerator:
    """Converts saved interactions into few-shot examples."""
    
    def generate(self, interactions: list[SavedInteraction]) -> list[ConversationExample]:
        examples = []
        
        for interaction in interactions:
            # Extract user's responses (skip AI customer messages)
            assistant_messages = [
                msg for msg in interaction.conversation 
                if msg.role == "assistant"  # User playing sales rep
            ]
            
            # Create ConversationExample
            example = ConversationExample(
                id=f"custom_{interaction.situation_id}",
                scenario=interaction.situation.name,
                demonstrates=self._infer_demonstrates(assistant_messages),
                context=interaction.situation.description,
                messages=interaction.conversation,
                match_intents=self._infer_intents(interaction.situation),
            )
            
            examples.append(example)
        
        return examples
```

---

## Benefits

### For Clients

✅ **No technical knowledge required** - Just have conversations  
✅ **Fast setup** - 15-20 minutes vs hours of config  
✅ **Authentic personality** - AI learns from real examples  
✅ **Precise control** - Shows exactly how you want agent to respond  
✅ **Iterative refinement** - Test and adjust easily

### For Us

✅ **Scalable onboarding** - Automated config generation  
✅ **Reduced support** - Less "how do I configure X?" tickets  
✅ **Better data** - Real user examples vs synthetic  
✅ **Product differentiation** - Unique feature in market  
✅ **Faster time-to-value** - Clients go live in minutes

---

## Roadmap

### Phase 1: MVP (3-4 weeks)
- [ ] 12 pre-defined situation templates
- [ ] Basic customer simulator (single profile: "neutral")
- [ ] Capture and save user responses
- [ ] Simple example generation (direct conversion)
- [ ] Manual review before deployment

### Phase 2: Enhanced (4-6 weeks)
- [ ] 5 customer profiles (curious, skeptical, busy, enthusiastic, price-sensitive)
- [ ] Personality extraction algorithm
- [ ] Guardrail auto-generation
- [ ] A/B testing framework (compare generated vs template agents)

### Phase 3: Advanced (6-8 weeks)
- [ ] Custom situation builder (users create own scenarios)
- [ ] Multi-language support
- [ ] Advanced analytics (which examples improve conversion)
- [ ] Agent collaboration (multiple agents learning from each other)

---

## Success Metrics

- **Time to first agent:** < 20 minutes (vs 2+ hours manual)
- **User satisfaction:** 4.5+ stars for "ease of setup"
- **Agent quality:** 80%+ match to user's intended personality
- **Adoption rate:** 70%+ of new users complete tutorial
- **Conversion lift:** 15%+ improvement vs template agents

---

## Technical Notes

### Example Selection Priority

When multiple examples exist for same situation:
1. Use user's custom example (from tutorial)
2. Fall back to base example if no custom exists
3. Combine: custom + base for broader coverage

### Personality Conflicts

If auto-generated personality conflicts with base guardrails:
- **Base guardrails win** (never end conversation, always advance)
- **Personality adds flavor** (casual vs formal, verbal tics)
- **User can override** in refinement step

### Knowledge Base Integration

Tutorial examples + uploaded docs = complete agent:
```
Agent Config = Tutorial Examples + Product Docs + Base Patterns
```

---

## Open Questions

1. Should we allow users to edit AI customer responses? (Pro: more control, Con: breaks simulation realism)
2. How many situations minimum before allowing deploy? (Suggest 8-10)
3. Should we show "personality score" during tutorial? (e.g., "Your style: 85% casual, 60% question-driven")
4. Pricing model: Charge per agent created? Per situation trained? Flat fee?

---

*Document Version: 1.0*  
*Last Updated: 2025-11-24*  
*Author: Product Team*
