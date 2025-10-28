# ConnectAI Product Simulation - 6 Real World Scenarios

**Format**: Each simulation shows:
1. Builder AI conversation (setup)
2. Blocks generated in database
3. Real customer conversations with the agent
4. What happens behind the scenes

---

## SIMULATION 1: Pet Grooming Salon - "Paws & Claws"

### Setup Phase (5 minutes)

**User creates new agent**

**Builder AI**: Hi! I'm here to help you build your AI assistant. Tell me about your business - what do you do and what would you like your AI to handle?

**Sofia (owner)**: We're a pet grooming salon, dogs and cats. I'm tired of answering the same questions all day - prices, availability, what services we offer. Want the AI to handle that and book appointments.

**Builder AI**: Perfect! Pet grooming is great for AI automation. Let's start with your services and prices - do you have a price list I can use? You can drag a file here or just tell me.

**Sofia**: *[drags services.xlsx into chat]*

**Builder AI**: ✓ Got it! I see:
- Small dog bath: R$60
- Small dog full groom: R$90
- Medium dog bath: R$80
- Medium dog full groom: R$120
- Large dog bath: R$100
- Large dog full groom: R$180
- Cat grooming: R$150
- Nail trim only: R$30

Added to your knowledge base!

For appointments, what system do you use? Google Calendar, Acuity, or something else?

**Sofia**: We use Google Calendar

**Builder AI**: Great! Let me connect that.

*[Google Calendar OAuth flow - Sofia clicks "Allow"]*

✓ Calendar connected! Your AI can now check availability and book grooming appointments.

Since you work with pets, I'm guessing you want a friendly, warm tone? And probably okay with emojis like 🐾❤️?

**Sofia**: Yes! Super friendly. People are trusting us with their babies, you know? Be warm and reassuring.

**Builder AI**: ✓ Perfect. Set to friendly mode with pet emojis.

One thing - should your AI ask for the pet's name and breed? That way we can personalize the conversation and prepare properly.

**Sofia**: Yes! And also ask about temperament. Some dogs are nervous or have had bad experiences at groomers before. If they mention aggression or biting history, I need to talk to them first personally.

**Builder AI**: ✓ Smart. Your AI will:
- Ask for pet name, breed, and temperament
- If customer mentions aggression/biting, immediately connect them with you
- Otherwise handle the booking

One more - I notice you do cats. Anything special about cat grooming I should mention?

**Sofia**: Oh yeah - cats are more expensive because they're harder to handle. And we need to know if the cat has ever been groomed before. First-time cats need extra time.

**Builder AI**: ✓ Added cat-specific handling:
- Explain higher price for cats
- Ask if first-time grooming
- Mention we have experience with anxious cats

Anything else? Or should we test your AI?

**Sofia**: That's it! Let's test.

**Builder AI**: Perfect! Your AI is ready. Here's what it can do:
- Answer pricing questions
- Book grooming appointments
- Ask about pet details (name, breed, temperament)
- Handle cat-specific questions
- Escalate aggressive pet cases to you
- Be friendly and reassuring

Switching to test mode...

---

### Blocks Generated (Backend)

```json
{
  "agent": {
    "id": 1,
    "user_id": 5,
    "name": "Paws & Claws Assistant",
    "status": "active"
  },
  "blocks": [
    {
      "id": 1,
      "agent_id": 1,
      "block_type": "knowledge",
      "config": {
        "source_type": "file",
        "file_name": "services.xlsx",
        "content": "Services:\n- Small dog bath: R$60\n- Small dog full groom: R$90\n- Medium dog bath: R$80\n- Medium dog full groom: R$120\n- Large dog bath: R$100\n- Large dog full groom: R$180\n- Cat grooming: R$150\n- Nail trim only: R$30\n\nCat notes: Higher price due to handling difficulty. Ask if first-time grooming."
      }
    },
    {
      "id": 2,
      "agent_id": 1,
      "block_type": "personality",
      "config": {
        "tone": "friendly",
        "warmth": "high",
        "emoji_usage": true,
        "emoji_types": ["pet", "heart", "positive"],
        "voice": "reassuring and warm"
      }
    },
    {
      "id": 3,
      "agent_id": 1,
      "block_type": "action",
      "config": {
        "action_type": "appointment",
        "integration": "google_calendar",
        "calendar_id": "sofia@pawsandclaws.com",
        "collect_fields": ["pet_name", "breed", "temperament"]
      }
    },
    {
      "id": 4,
      "agent_id": 1,
      "block_type": "action",
      "config": {
        "action_type": "handoff",
        "triggers": [
          "customer mentions aggression",
          "customer mentions biting history",
          "customer seems very anxious about pet safety"
        ],
        "notification": "slack",
        "urgency": "medium"
      }
    }
  ]
}
```

---

### Customer Interaction 1: Simple Booking

**Customer (Ana)**: Hi! How much for a medium dog bath?

**AI Backend Process**:
```
1. Intent Detection: "asking_price"
2. Knowledge Retrieval: Search blocks → finds pricing block
3. Extract entities: service="medium dog bath"
4. Generate response with personality constraints (friendly + emojis)
```

**Agent**: Hi Ana! 🐾 A bath for a medium-sized dog is R$80. It includes a good scrub, blow dry, and nail trim. Would you like to book an appointment?

**Ana**: Yes, Saturday morning if possible

**AI Backend Process**:
```
1. Intent: "booking_appointment"
2. Action: check_calendar(date="next_saturday", time_preference="morning")
3. Calendar API returns: [9am, 10am, 11am available]
4. State: collected={service, date_preference}, missing={time, pet_info}
```

**Agent**: Great! I have openings at 9am, 10am, or 11am on Saturday. Which works best for you? ☀️

**Ana**: 10am works

**Agent**: Perfect! 10am on Saturday for a medium dog bath. Can I get your pup's name and breed? 🐶

**Ana**: Luna, she's a beagle mix

**Agent**: Luna is a beautiful name! 💕 How is Luna with grooming? Is she calm, or does she get a bit nervous?

**Ana**: She's pretty calm, been groomed before

**AI Backend Process**:
```
1. State: all required info collected
2. Sentiment on temperament: "calm" → no escalation needed
3. Action: create_appointment({
     datetime: "2025-11-01T10:00:00",
     service: "medium dog bath",
     customer: "Ana",
     pet_name: "Luna",
     pet_breed: "beagle mix",
     pet_temperament: "calm, experienced"
   })
4. Calendar API: appointment created successfully
```

**Agent**: All set! Luna is booked for a bath this Saturday at 10am ✓ We'll take great care of her!

Please arrive 5-10 minutes early. If you need to reschedule, just message us. See you Saturday! 🐾❤️

**Ana**: Thank you!

---

### Customer Interaction 2: Escalation Case

**Customer (Roberto)**: Hi, I need to get my dog groomed but he bit the last groomer

**AI Backend Process**:
```
1. Intent: "booking_appointment"
2. Sentiment Analysis: detects "bit" + "groomer" → TRIGGER
3. Handoff Block Match: "customer mentions biting history"
4. Action: escalate_to_human(reason="aggressive_dog", urgency="medium")
5. Notification sent to Sofia via Slack
```

**Agent**: I really appreciate you telling me that upfront - that helps us prepare properly. For dogs with a history of biting, I'd like to connect you directly with Sofia, our owner. She'll want to talk with you about the best approach to make sure both your pup and our groomer are safe and comfortable.

Can I have her call you? What's the best number to reach you?

**Roberto**: Sure, 11 98765-4321

**AI Backend Process**:
```
Action: create_lead({
  customer_phone: "11987654321",
  issue: "Dog with biting history - needs consultation",
  urgency: "medium",
  assigned_to: "Sofia"
})

Slack notification sent to Sofia:
"🚨 New lead needs your attention:
Customer: Roberto (11 98765-4321)
Issue: Dog has bitten groomer before
AI Response: Offered personal consultation"
```

**Agent**: Perfect! Sofia will call you within a few hours to discuss how we can help. We do work with nervous and reactive dogs - we just like to have a conversation first to set everyone up for success 🐾

Thank you for being upfront about this!

**Roberto**: Thanks, appreciate it

---

## SIMULATION 2: Italian Restaurant - "Nonna's Kitchen"

### Setup Phase (4 minutes)

**Builder AI**: Tell me about your business!

**Marco (owner)**: Family Italian restaurant. We get bombarded with WhatsApp messages - "do you have tables tonight?", "what's on the menu?", "do you deliver?" - and my daughter is tired of being the human answering machine.

**Builder AI**: Ha! I hear that a lot. Let's automate this. Do you have a menu I can use?

**Marco**: *[drags menu.pdf]*

**Builder AI**: ✓ Got your menu! 45 items across appetizers, pasta, mains, desserts, drinks. Looks delicious! 🍝

Now for reservations - where do you track those? Google Sheets, a reservation system, or...?

**Marco**: Low-tech, we use a Google Sheet

**Builder AI**: No problem! Let me connect to that.

*[Marco shares Google Sheet link, grants access]*

✓ Connected! Your AI can check availability and add reservations.

Quick question - do you deliver?

**Marco**: NO. We get asked 50 times a day. Pickup or dine-in only.

**Builder AI**: ✓ Got it. I'll make sure the AI clearly states: no delivery, only pickup or dine-in.

For tone - you're a family restaurant, so I'm thinking warm and friendly? Can we use some food emojis? 🍕🍝

**Marco**: Yeah, friendly is good. Emojis are fine but don't go crazy, we're not a kids' restaurant.

**Builder AI**: ✓ Warm and friendly, moderate emoji use.

One important thing - what should happen if someone complains about their food or service?

**Marco**: Immediately connect them to me. Customer complaints are serious, I handle those personally.

**Builder AI**: ✓ If customer expresses dissatisfaction about food/service → escalate to you immediately.

Anything about allergies or dietary restrictions I should know?

**Marco**: We have gluten-free pasta and dairy-free options. But if someone has a *severe* allergy, they should call and talk to our chef directly - I don't want the AI saying "yeah it's safe" when someone could get sick.

**Builder AI**: ✓ Perfect approach:
- Mention gluten-free and dairy-free options exist
- For severe allergies → recommend calling to speak with chef
- Safety first

Ready to test?

**Marco**: Let's do it.

---

### Blocks Generated

```json
{
  "agent": {
    "id": 2,
    "name": "Nonna's Kitchen Assistant"
  },
  "blocks": [
    {
      "id": 5,
      "block_type": "knowledge",
      "config": {
        "source_type": "file",
        "file_name": "menu.pdf",
        "content": "MENU:\nAppetizers: Bruschetta R$18, Arancini R$22, Caprese R$20...\n[45 items total]"
      }
    },
    {
      "id": 6,
      "block_type": "knowledge",
      "config": {
        "source_type": "text",
        "content": "IMPORTANT: We do NOT deliver. Pickup or dine-in only.\n\nDietary: Gluten-free pasta available. Dairy-free options available. For severe allergies, customer must call to speak with chef directly."
      }
    },
    {
      "id": 7,
      "block_type": "personality",
      "config": {
        "tone": "warm",
        "emoji_usage": true,
        "emoji_moderation": "moderate",
        "voice": "family restaurant, welcoming"
      }
    },
    {
      "id": 8,
      "block_type": "action",
      "config": {
        "action_type": "reservation",
        "integration": "google_sheets",
        "sheet_url": "https://docs.google.com/spreadsheets/d/...",
        "max_party_size": 12
      }
    },
    {
      "id": 9,
      "block_type": "action",
      "config": {
        "action_type": "handoff",
        "triggers": [
          "complaint about food",
          "complaint about service",
          "customer expresses dissatisfaction"
        ],
        "notification": "whatsapp",
        "owner_phone": "+5511987654321"
      }
    }
  ]
}
```

---

### Customer Interaction 1: Reservation

**Customer (Lucia)**: Do you have a table for 4 tonight at 8pm?

**AI Backend**:
```
Intent: "check_reservation"
Action: check_availability(date="today", time="20:00", party_size=4)
Google Sheets API: Row for 8pm shows "2 tables available"
```

**Agent**: Hi Lucia! Yes, we have availability for 4 people tonight at 8pm 🍝 Would you like me to reserve a table for you?

**Lucia**: Yes please. Name is Lucia Santos

**AI Backend**:
```
Action: create_reservation({
  name: "Lucia Santos",
  party_size: 4,
  datetime: "2025-10-28T20:00:00"
})
Google Sheets: Append row with reservation details
```

**Agent**: Perfect! Table for 4 reserved tonight at 8pm under Lucia Santos ✓

We're at Rua das Flores, 234. If you're running late or need to cancel, just let us know. See you tonight! 🍷

---

### Customer Interaction 2: The Delivery Question

**Customer (Rafael)**: Do you guys deliver?

**AI Backend**:
```
Intent: "asking_about_delivery"
Knowledge Search: Finds "We do NOT deliver. Pickup or dine-in only."
Personality: Friendly but clear
```

**Agent**: We don't offer delivery, but we do have pickup! You can order ahead and we'll have it ready for you. Or of course you're always welcome to dine in with us 😊

Would you like to see our menu?

**Rafael**: Yeah, what pasta do you have?

**AI Backend**:
```
Knowledge Search: query="pasta" → retrieves pasta section from menu
```

**Agent**: We have several pasta dishes! 🍝

- Spaghetti Carbonara - R$42
- Fettuccine Alfredo - R$38
- Penne Arrabbiata - R$36
- Lasagna della Nonna - R$45 (family recipe!)
- Ravioli Ricotta e Spinaci - R$44
- Linguine alle Vongole - R$52

All made fresh! Want to place a pickup order?

---

### Customer Interaction 3: Complaint Escalation

**Customer (Paula)**: I was there last night and my pasta was cold, really disappointing

**AI Backend**:
```
Sentiment Analysis: "cold" + "disappointing" → negative sentiment
Intent: "complaint"
Handoff Block TRIGGERED: "complaint about food"
Action: escalate_to_human(reason="food_complaint", urgency="high")
Notification: WhatsApp sent to Marco
```

**Agent**: I'm so sorry to hear that, Paula - that's definitely not the experience we want you to have. Let me connect you with Marco, our owner, right away. He'll want to make this right.

**[System sends WhatsApp to Marco]**:
```
🚨 CUSTOMER COMPLAINT - Immediate attention needed
Customer: Paula
Issue: "Pasta was cold, disappointing"
Context: Visited last night
AI has notified customer that owner will follow up.
```

**Marco (manually responds to Paula)**: Paula, this is Marco - I'm so sorry about your experience last night. This isn't acceptable. Can you tell me more about what happened? I'd like to invite you back as our guest...

---

## SIMULATION 3: Dental Clinic - "Smile Center" (3 locations)

### Setup Phase

**Builder AI**: What does your business do?

**Dr. Fernanda**: We're a dental clinic with 3 locations across the city. People ask about availability, prices, which insurance we accept, and want to book cleanings or cancel appointments.

**Builder AI**: Got it! Let me get your pricing first. Do you have a price list?

**Dr. Fernanda**: *[types]*
- Cleaning: R$200
- Filling: R$300-500 depending on size
- Root canal: R$800-1200
- Whitening: R$600
- Extraction: R$250

**Builder AI**: ✓ Pricing added. Now for appointments - how do you schedule across 3 locations?

**Dr. Fernanda**: We use Calendly, one calendar per location

**Builder AI**: Perfect! Let me connect all 3.

*[Dr. Fernanda connects 3 Calendly accounts: Clinic-North, Clinic-Center, Clinic-South]*

✓ All 3 locations connected! Your AI can check availability across all clinics and book appointments.

What insurance plans do you accept?

**Dr. Fernanda**: *[drags insurance_accepted.pdf]*

**Builder AI**: ✓ Got it - 23 insurance plans loaded.

Important: If someone mentions dental pain or a broken tooth, what should happen?

**Dr. Fernanda**: That's an EMERGENCY. Mark it urgent and notify me immediately so we can fit them in same-day.

**Builder AI**: ✓ Emergency detection activated:
- Pain keywords → mark urgent
- Broken tooth → mark urgent
- Immediate notification to you

For tone - dental clinics can be intimidating. Want to be friendly and approachable?

**Dr. Fernanda**: Yes! Friendly, reassuring. We want people to feel comfortable, not scared.

**Builder AI**: ✓ Friendly and reassuring tone. Emojis okay?

**Dr. Fernanda**: A few are fine, nothing excessive

**Builder AI**: Perfect! Your AI is ready to handle scheduling, pricing, insurance questions, and emergency detection. Test?

---

### Customer Interaction 1: Emergency Case

**Customer (Carlos)**: Hi I have really bad tooth pain on the left side, it hurts to eat

**AI Backend**:
```
Intent: "dental_issue"
Keyword Detection: "really bad tooth pain" → EMERGENCY TRIGGER
Sentiment: "hurts" → pain indicator
Action: escalate_urgent(reason="dental_pain", urgency="high")
Notification: SMS to Dr. Fernanda
```

**Agent**: I'm sorry to hear you're in pain, Carlos - tooth pain is no fun at all 😞 This sounds urgent. Let me get you help right away.

Which location is most convenient for you?
- North Zone (Santana)
- Center (Paulista)
- South Zone (Moema)

**Carlos**: Center is closest

**AI Backend**:
```
Action: check_emergency_slots(location="center", today=true)
Calendly API: 2:30pm slot available (emergency buffer)
Meanwhile: SMS sent to Dr. Fernanda:
"🚨 EMERGENCY: Carlos - severe tooth pain, left side
Location preference: Center
Next available: 2:30pm today
Awaiting your confirmation"
```

**Agent**: I found a slot today at 2:30pm at our Paulista location. I'm checking with Dr. Fernanda right now to confirm we can fit you in for an emergency visit. Can you give me your phone number so she can call you back in the next few minutes?

**Carlos**: 11 99887-7766

**Agent**: Thank you! Dr. Fernanda will call you within 10 minutes to confirm and help with your pain. Hang in there, Carlos - we'll take care of you 🦷

---

### Customer Interaction 2: Insurance Question

**Customer (Mariana)**: Do you accept Bradesco Dental?

**AI Backend**:
```
Intent: "insurance_question"
Knowledge Search: query="Bradesco Dental" in insurance_accepted.pdf
Result: Found - "Bradesco Dental PPO" in approved list
```

**Agent**: Yes, we do accept Bradesco Dental! ✓ We work with most Bradesco plans.

Would you like to schedule a cleaning or checkup? I can check availability across our 3 locations.

**Mariana**: How much is a cleaning with insurance?

**AI Backend**:
```
Knowledge: Base price R$200
Insurance: Bradesco typically covers 80% (from insurance doc)
Calculation: ~R$40 out-of-pocket
But AI doesn't have exact copay info → don't make it up
```

**Agent**: With Bradesco, you usually pay very little out-of-pocket for a cleaning - often around R$40-60 depending on your specific plan. When you book, our team will verify your exact coverage and copay before your appointment so there are no surprises 😊

Want to book a cleaning?

---

## SIMULATION 4: Law Firm - "Silva & Costa Immigration"

### Setup Phase

**Builder AI**: Tell me about your business.

**Dr. Maria (lawyer)**: Immigration law firm. 3 lawyers. We get 50 WhatsApp messages a day asking "how much is a visa", "what documents do I need", "can you help with my case". I need the AI to give information about our services WITHOUT giving legal advice.

**Builder AI**: Perfect distinction - information about services, not legal advice. Let me get your pricing first. Do you have a list?

**Dr. Maria**: *[drags pricing.pdf]*

**Builder AI**: ✓ Got your pricing:
- Tourist visa: R$1,500
- Work visa: R$3,000
- Student visa: R$2,500
- Family reunification visa: R$4,500
- Permanent residence: R$6,000
... and 7 more services

Now tell me about your 3 lawyers - names and specialties?

**Dr. Maria**:
- Dr. Maria Silva (me) - work visas
- Dr. João Costa - family visas
- Dr. Ana Santos - student visas

**Builder AI**: ✓ Team configured! When someone asks about a visa type, the AI will offer to book a consultation with the right specialist.

For consultations - Google Calendar?

**Dr. Maria**: Yes, we each have our own calendar

*[Connects 3 calendars]*

**Builder AI**: ✓ All 3 calendars connected.

Now, super important: What should the AI NEVER do?

**Dr. Maria**: NEVER give legal advice. Like if someone asks "will I get approved", "am I eligible", "can I work on this visa" - the AI can't answer that. Only a lawyer can. The AI should say "I need to connect you with one of our lawyers" and book a consultation.

**Builder AI**: ✓ Critical rule added:
- AI gives service information ONLY (prices, timeline, documents)
- AI NEVER answers legal questions about eligibility or outcomes
- All legal questions → offer consultation

For tone - you're a law firm. Formal and professional?

**Dr. Maria**: Yes. Professional. No emojis - we're not a pizza place.

**Builder AI**: ✓ Professional tone, no emojis.

Languages? Portuguese and English?

**Dr. Maria**: Yes, both

**Builder AI**: ✓ Bilingual support. Ready to test?

---

### Customer Interaction 1: Service Info (Proper Handling)

**Customer (Ahmed)**: How much does a work visa cost?

**AI Backend**:
```
Intent: "pricing_question"
Entity: "work visa"
Knowledge Search: Finds "Work visa: R$3,000"
Specialist: "Dr. Maria Silva - work visas"
```

**Agent**: A work visa application costs R$3,000. This includes the full application process and support from our immigration lawyer.

Dr. Maria Silva specializes in work visas. Would you like to schedule a consultation with her to discuss your specific case?

**Ahmed**: What documents do I need?

**AI Backend**:
```
Intent: "document_question"
Knowledge Search: query="work visa documents"
Result: Found document list in knowledge base
```

**Agent**: For a work visa, you typically need:

- Valid passport
- Job offer letter from Brazilian employer
- Signed work contract
- Proof of qualifications (diploma, certifications)
- Criminal background check
- Proof of health insurance

However, requirements can vary based on your specific situation and country of origin. Dr. Maria will review your exact case during the consultation and provide a complete checklist.

Would you like to schedule a consultation?

**Ahmed**: Yes, when is she available?

---

### Customer Interaction 2: Legal Question (Properly Escalates)

**Customer (Priya)**: I'm on a tourist visa right now. Can I switch to a work visa while I'm in Brazil?

**AI Backend**:
```
Intent: "legal_question"
Classification: LEGAL ADVICE NEEDED (eligibility question)
Rule: "AI NEVER answers legal questions"
Action: offer_consultation(reason="legal_question")
```

**Agent**: That's a legal question I can't answer - visa eligibility depends on your specific situation and current immigration status.

I can connect you with Dr. Maria Silva, who specializes in work visas. She'll be able to review your case and advise you on the best path forward.

Would you like to schedule a consultation with her? Initial consultations are 30 minutes.

**Priya**: How much is the consultation?

**AI Backend**:
```
Knowledge Search: "consultation fee"
Result: "Initial consultation: R$300 (30 min)"
```

**Agent**: The initial consultation is R$300 for 30 minutes. During this time, Dr. Maria will review your specific situation and provide legal advice about your options.

Would you like me to check her availability?

---

## SIMULATION 5: Gym/Fitness Studio - "Iron Temple CrossFit"

### Setup Phase

**Builder AI**: Tell me about your business!

**Bruno (owner)**: CrossFit gym. We get messages about class times, membership prices, "I'm a beginner can I join", free trials. I want the AI to GET PEOPLE IN THE DOOR for a trial class. Once they try it, they usually join.

**Builder AI**: Love it - optimize for trial class bookings. What are your membership options and prices?

**Bruno**:
- Monthly: R$250
- Quarterly: R$650 (save R$100)
- Annual: R$2,400 (save R$600)
- Free trial: 1 class for newbies

**Builder AI**: ✓ Pricing loaded. For class schedule?

**Bruno**: *[pastes schedule]*
Mon-Fri: 6am, 7am, 12pm, 6pm, 7pm
Sat: 9am, 10am
Sun: 9am

**Builder AI**: ✓ Schedule saved. How do people book trial classes?

**Bruno**: Google Calendar - I have a "Trial Class" calendar

*[Connects calendar]*

**Builder AI**: ✓ Connected!

Now for tone - CrossFit gyms have a specific vibe. Energetic, motivational?

**Bruno**: Yeah! Hype them up! Use emojis, be motivational. Like "everyone starts somewhere, you got this" energy. 💪🔥

**Builder AI**: ✓ Energetic and motivational tone. Emojis encouraged.

What if someone asks about an injury or specific health condition?

**Bruno**: Say our coaches can work with them, but they should mention it during their trial class so the coach can modify exercises. If it sounds serious (like recent surgery), they should talk to our head coach first.

**Builder AI**: ✓ Injury handling:
- Minor concerns → mention during trial, coach will modify
- Serious conditions → connect with head coach

Ready?

---

### Customer Interaction: Trial Class Conversion

**Customer (Larissa)**: Hi, I want to start working out but I've never done CrossFit. Is it for beginners?

**AI Backend**:
```
Intent: "asking_if_suitable_for_beginners"
Personality: ENERGETIC + MOTIVATIONAL
Goal: Convert to trial class
```

**Agent**: YES! Absolutely for beginners! 💪 Everyone at Iron Temple started somewhere - we scale every workout to your level.

Whether you're brand new to fitness or just new to CrossFit, our coaches will modify exercises so it's challenging but safe for YOU. No pressure to keep up with anyone else.

Want to try a FREE trial class? You'll get a feel for it and meet the crew. No commitment 🔥

**Larissa**: I'm kind of out of shape though, will I be able to do it?

**AI Backend**:
```
Sentiment: Insecurity/fear
Response Strategy: REASSURE + MOTIVATE + OFFER TRIAL
```

**Agent**: That's exactly WHY you should come! 😊 CrossFit isn't about where you start - it's about getting stronger than you were yesterday.

Our coaches will make sure you're doing movements correctly and safely. You'll work at YOUR pace. And honestly? Everyone is super supportive. We cheer each other on, no judgment.

The hardest part is showing up for that first class. After that, you'll see it's way less intimidating than you think.

Want to book a trial? I can find a beginner-friendly time slot for you 💙

**Larissa**: Okay... when do you have morning classes?

**AI Backend**:
```
Intent: "check_availability"
Filter: morning classes (6am, 7am, 9am Sat, 9am Sun)
Action: present_options(time_preference="morning")
```

**Agent**: Morning classes:

**Weekdays**: 6am or 7am (Mon-Fri)
**Weekends**: 9am (Sat & Sun)

Weekend classes tend to be more relaxed if you want a chill first experience. But weekday mornings are great if you want to start your day strong ☀️

What works for you?

**Larissa**: Saturday 9am?

**AI Backend**:
```
Action: create_trial_booking({
  customer: "Larissa",
  class_type: "trial",
  datetime: "next_saturday_9am"
})
```

**Agent**: YES! Saturday 9am - you're booked for your first class! 🔥

Here's what to bring:
- Water bottle
- Athletic shoes
- Comfortable workout clothes
- Towel (optional)

We have everything else. Show up 10 minutes early so the coach can say hi and answer any questions.

You're gonna do great, Larissa! See you Saturday 💪

**Larissa**: Thank you!

**Agent**: You got this! 🙌 If you have any questions before Saturday, just message me. Otherwise, see you bright and early!

---

## SIMULATION 6: Freelance Graphic Designer - "Ana Designs"

### Setup Phase

**Builder AI**: What do you do and what do you want the AI to handle?

**Ana (designer)**: I'm a freelance graphic designer. I get inquiries for logos, brand identity, social media graphics. But half of them have budgets under $200 and I don't work for that. I want the AI to qualify leads - collect info about their project and budget, and only send me people who are serious and can afford my rates.

**Builder AI**: Smart! Lead qualification. Let me get your services and pricing first.

**Ana**:
- Logo design: R$800-1,500
- Brand identity package: R$2,500-4,000
- Social media package (10 posts): R$600
- Print design: R$400-800

If someone's budget is under R$500, it's not a fit.

**Builder AI**: ✓ Services and pricing loaded. Minimum budget threshold: R$500.

What info do you need to collect from leads?

**Ana**:
- What they need (logo, branding, etc.)
- Timeline
- Budget
- How they found me (Instagram, referral, Google)

If budget is adequate and project is a fit, schedule a discovery call with me.

**Builder AI**: ✓ Lead qualification flow:
1. Collect project details, timeline, budget, source
2. If budget < R$500 → politely decline
3. If budget adequate → schedule discovery call

For your calendar?

*[Ana connects Google Calendar]*

**Builder AI**: ✓ Calendar connected!

Tone? You're creative but also run a business...

**Ana**: Friendly but professional. I'm not corporate but I'm also not unprofessional. A few emojis are fine, just keep it tasteful.

**Builder AI**: ✓ Friendly-professional tone, tasteful emoji use.

What if someone asks you to copy another designer's work?

**Ana**: Absolutely not. I don't copy. I can be *inspired* by a style, but I create original work.

**Builder AI**: ✓ If customer requests copying another designer → politely decline.

Ready to test?

---

### Customer Interaction 1: Qualified Lead

**Customer (Pedro, startup founder)**: Hi, I need a logo for my new app

**AI Backend**:
```
Intent: "project_inquiry"
Service: "logo design"
Stage: "initial_contact"
Next: Qualify lead (collect info)
```

**Agent**: Hey Pedro! I'd love to help with your app logo 🎨

Tell me a bit about your app - what's it called and what does it do?

**Pedro**: It's called TaskFlow, it's a productivity app for remote teams

**Agent**: Nice! Productivity space is hot right now.

What's your timeline for the logo? When do you need it ready?

**Pedro**: Ideally in the next 4-6 weeks

**Agent**: That timeline works! A logo typically takes 2-3 weeks from kickoff to final files, so we're good.

What's your budget for the logo design?

**Pedro**: I was thinking around R$1,200

**AI Backend**:
```
Budget Check: R$1,200
Minimum: R$500
Logo Range: R$800-1,500
Result: ✓ QUALIFIED (within range)
Next: Schedule discovery call
```

**Agent**: That works! R$1,200 is right in the range for a professional logo.

Last question - how did you find me? Instagram, referral, Google?

**Pedro**: A friend recommended you - Mariana from ContentCo

**AI Backend**:
```
Lead Qualification Complete:
- Service: Logo design ✓
- Timeline: 4-6 weeks ✓
- Budget: R$1,200 ✓ (qualified)
- Source: Referral from Mariana ✓

Action: schedule_discovery_call()
```

**Agent**: Ah, Mariana! She's great 😊

Alright Pedro, you sound like a perfect fit! Next step is a discovery call where we'll dive into your vision for the logo - your target audience, vibe you're going for, competitors, all that good stuff.

I have these slots available this week:
- Tuesday 2pm
- Wednesday 10am
- Thursday 4pm

Which works for you?

**Pedro**: Tuesday 2pm works

**Agent**: Perfect! You're booked for Tuesday at 2pm ✓ I'll send you a Zoom link.

Before our call, if you can gather:
- 3-5 logos you like (inspiration, not to copy)
- 3-5 adjectives describing your brand (e.g., modern, playful, trustworthy)
- Any color preferences

That'll help us hit the ground running. See you Tuesday! 🚀

---

### Customer Interaction 2: Unqualified Lead (Low Budget)

**Customer (Júlia)**: Hi! How much for a logo?

**Agent**: Hey Júlia! Logo design starts at R$800, depending on complexity and revisions. What's your budget range?

**Júlia**: I was hoping for something around R$250

**AI Backend**:
```
Budget: R$250
Minimum: R$500
Result: ✗ UNQUALIFIED (below threshold)
Action: politely_decline(reason="budget_mismatch")
```

**Agent**: I appreciate you reaching out! Unfortunately R$250 is below my starting rate - my work starts at R$800 for a logo since it includes strategy, multiple concepts, and revisions.

If your budget is firm at R$250, I'd recommend checking out platforms like 99designs or Fiverr where you can find designers in that range. They might be a better fit for your budget right now.

Best of luck with your project! 😊

**Júlia**: Okay, thanks anyway

---

## What Makes These Simulations Realistic

### 1. **Natural Language**
- Customers don't speak in structured data ("I want service_type=haircut, datetime=2024-10-28T14:00")
- They say "can I get Luna groomed Saturday morning"
- AI must extract structure from chaos

### 2. **Emotional Context**
- Pet owner: anxious about pet safety
- Dental patient: in pain, needs urgency
- Gym inquiry: insecure about fitness level
- Designer lead: price-sensitive

### 3. **Escalation Triggers Work**
- Dog with biting history → immediate handoff
- Dental pain → emergency priority
- Food complaint → owner involvement
- Legal question → refuse to answer, offer consultation

### 4. **Personality Consistency**
- Law firm: Formal, no emojis, professional
- Gym: Energetic, motivational, lots of emojis
- Pet grooming: Warm, reassuring, uses pet emojis
- Restaurant: Friendly, moderate emoji use

### 5. **Knowledge Retrieval**
- Pricing questions → searches pricing block
- Menu questions → searches menu content
- Insurance → searches accepted plans
- AI doesn't make up info

### 6. **Action Execution**
- Calendar bookings actually get created
- Google Sheets get updated
- Slack/WhatsApp notifications sent
- OAuth integrations work

### 7. **Lead Qualification**
- Designer: Filters by budget threshold
- All: Collect necessary info before booking
- Smart escalation (serious medical, legal, complaints)

---

## Behind Every Response: The Stack

```
Customer message arrives
    ↓
[Intent Detection] - What do they want?
    ↓
[Knowledge Retrieval] - RAG search of blocks (LangChain + pgvector)
    ↓
[State Management] - What have we collected? What's missing?
    ↓
[Personality Check] - Apply tone rules from personality block
    ↓
[Action Planning] - Do we need to call a tool? (calendar, payment, etc.)
    ↓
[LLM Generation] - GPT-4/Gemini with context
    ↓
[Validation] - Guardrails check (no hallucinations, tone match)
    ↓
[Response] - Send to customer
    ↓
[Logging] - Track for improvement
```

Every simulation follows this flow. The blocks determine behavior. The tech stack makes it reliable.

---

## Success Metrics Across All Simulations

**What we track:**

1. **Automation Rate**: % of conversations handled without human
   - Target: 70-80%

2. **Booking Conversion**: % of inquiries that result in appointments
   - Pet grooming: 65%
   - Dental: 58%
   - Gym: 72% (trial classes)

3. **Escalation Accuracy**: % of escalations that were appropriate
   - Target: >90% (don't escalate unnecessarily, don't miss red flags)

4. **Customer Satisfaction**: "Was this helpful?" after conversation
   - Target: >85% positive

5. **Response Time**: Median time to respond
   - Target: <3 seconds

6. **Personality Compliance**: % of responses that match tone rules
   - Target: >95%

---

## What This Proves

✅ **Blocks work for diverse industries** (pets, dental, legal, gym, design, restaurant)

✅ **Personality customization matters** (law firm ≠ gym ≠ pet grooming)

✅ **RAG prevents hallucinations** (AI only uses configured knowledge)

✅ **Escalation rules work** (emergencies, complaints, legal questions)

✅ **Action blocks enable real work** (bookings, payments, notifications)

✅ **Lead qualification saves time** (designer filters by budget)

✅ **Builder AI makes setup fast** (3-5 minutes per business)

This is the product. These are the real use cases. This is what we're building.
