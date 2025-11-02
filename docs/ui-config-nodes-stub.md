# UI Config Nodes - Stub Implementation

**Created:** 2025-11-02
**Status:** UI Test/Stub - Visual only, no backend persistence yet

## Overview

Created 7 specialized config nodes that attach to the main pipeline nodes, each with unique data visualizations to represent their function.

## Config Nodes Mapping

### 1. **FilterNode** → Knowledge
- **Visual:** Stacked filter layers with opacity fade
- **Shows:** Gating rules (which knowledge to hide based on state)
- **Data:** `agentConfig.gating_rules[]`
- **Example:** `budget_range = unknown` (dot indicator)

### 2. **FieldsNode** → Tracking
- **Visual:** Key-value list with colored left border
- **Shows:** State fields being tracked from conversation
- **Data:** `agentConfig.response_schema{}`
- **Example:** `budget_range: unknown`, `urgency: normal`

### 3. **ToneNode** → Personality
- **Visual:** Waveform bars (height varies by tone type)
- **Shows:** Communication personality (professional/friendly/energetic/casual)
- **Data:** `blocks.personality[0].tone`, `use_emojis`
- **Waveforms:**
  - Professional: Flat wave [3,5,4,5,3,4]
  - Friendly: Medium wave [2,6,3,7,4,6]
  - Energetic: Spiky wave [1,8,2,9,3,8]
  - Casual: Balanced [4,5,6,4,5,4]

### 4. **StyleNode** → Personality
- **Visual:** Message bubble stack (shows multi-turn splits)
- **Shows:** How responses are split into multiple messages
- **Data:** `agentConfig.multi_turn_config`
- **Example:** 3 bubbles with decreasing width/opacity

### 5. **ToolsNode** → Actions
- **Visual:** 3x3 grid of tool icons
- **Shows:** Available actions the AI can execute
- **Data:** `agentConfig.tools[]`
- **Icons:** calendar, payment, send_file, api_call, database, email, sms
- **Stub data:** Shows 2 sample tools (Calendário, Pagamentos)

### 6. **CorrectionsNode** → Validation
- **Visual:** Diff-style view with red→green transition
- **Shows:** Validation rules that strip/modify responses
- **Data:** `agentConfig.validation_rules[]`
- **Example:** `budget = unknown` → Strip prices (red line)

### 7. **HandoffsNode** → Validation
- **Visual:** Alert badges with colored borders and icons
- **Shows:** Escalation triggers (when to pass to human)
- **Data:** Stub triggers (not in DB yet)
- **Stub data:**
  - Angry: Red border, alert icon, "!" urgent badge
  - Complex: Blue border, brain icon

## Stub Data

Since backend persistence isn't implemented, nodes show:
- **Fields:** 3 sample fields (budget_range, urgency, sentiment)
- **Tools:** 2 sample tools (calendar, payment)
- **Handoffs:** 2 sample triggers (angry, complex)
- **Tone:** Uses personality block data if available, defaults to "professional"

## Edge Styles

Each config node connects to its pipeline node with color-coded dotted edges:
- Filter → Knowledge: Blue `#2196f3`
- Fields → Tracking: Purple `#9c27b0`
- Tone → Personality: Orange `#ff9800`
- Tools → Actions: Red `#f44336`
- Corrections → Validation: Green `#2e7d32`
- Handoffs → Validation: Light green `#4caf50`
- Style → Personality: Purple `#9c27b0`

## Files Created/Modified

### New Files:
- `frontend/src/sections/builder/nodes/config/FieldsNode.jsx`
- `frontend/src/sections/builder/nodes/config/ToneNode.jsx`
- `frontend/src/sections/builder/nodes/config/ToolsNode.jsx`
- `frontend/src/sections/builder/nodes/config/HandoffsNode.jsx`

### Modified:
- `FilterNode.jsx` - Updated visualization (removed emoji, added filter layers)
- `CorrectionsNode.jsx` - Updated to diff-style view
- `StyleNode.jsx` - Updated to show message bubbles
- `nodes/index.js` - Exported new nodes
- `builder-flow-view.jsx` - Registered new node types
- `utils/node-builder.js` - Added stub nodes with sample data
- `utils/node-positions.js` - Added positioning for new attachments

## Next Steps

To make these functional:
1. Add backend fields for handoff triggers
2. Implement drawer UIs for editing each config type
3. Wire up save handlers to persist to DB
4. Remove stub data, use real agent config
5. Remove legacy FilesNode and DataTrackingNode

## Visual Test

Visit the agent builder at `http://195.35.43.23:5459/builder` to see all config nodes attached to the pipeline with their visualizations.
