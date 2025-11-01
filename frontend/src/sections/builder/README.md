# Builder Visualization System

Visual flow-based agent configuration using React Flow.

## Architecture

```
builder/
├── nodes/                    # Custom React Flow nodes
│   ├── BaseNode.jsx         # Shared base component with common patterns
│   ├── pipeline/            # Read-only spine nodes (show execution state)
│   │   ├── KnowledgeNode.jsx
│   │   ├── TrackingNode.jsx
│   │   ├── ValidationNode.jsx
│   │   └── OutputNode.jsx
│   └── config/              # Editable config nodes (side attachments)
│       ├── FilterNode.jsx
│       ├── DataTrackingNode.jsx
│       ├── CorrectionsNode.jsx
│       ├── FilesNode.jsx
│       └── StyleNode.jsx
├── utils/                    # Shared utilities
│   ├── node-styles.js       # MUI theme-based styling system
│   ├── node-positions.js    # Layout calculation (spine + attachments)
│   └── node-builder.js      # Transform agent config ↔ React Flow nodes
├── drawers/                  # Edit panels (TODO)
│   └── ...
└── builder-flow-view.jsx     # Main React Flow canvas component
```

## Design Principles

1. **DRY**: BaseNode provides common structure, specific nodes compose
2. **Modular**: Each node type is self-contained
3. **Type-Safe**: PropTypes validation on all components
4. **Theme-Aware**: All colors from MUI theme (light/dark mode support)
5. **PT-BR First**: User-facing labels in Brazilian Portuguese

## Node Types

### Pipeline Nodes (Vertical Spine)
Read-only visualization showing what happens to each message:
- **Conhecimento**: RAG retrieval + gating
- **Rastreamento**: Custom field extraction
- **Validação**: Response checks
- **Saída**: Formatting + media

### Configuration Nodes (Side Attachments)
Editable configs that control pipeline behavior:
- **Filter (Filtro de Conhecimento)**: Gating rules
- **Data Tracking (Rastreamento de Dados)**: Response schema
- **Corrections (Correções Automáticas)**: Validation rules
- **Files (Arquivos Inteligentes)**: Media rules
- **Style (Estilo de Conversa)**: Multi-turn config

## Data Flow

```
Backend Agent Config
     ↓
buildFlowFromConfig()  (utils/node-builder.js)
     ↓
{ nodes, edges }  (React Flow format)
     ↓
React Flow Canvas

Pipeline nodes (read-only):        Config nodes (editable):
┌─────────────────┐                ┌──────────────────────┐
│ 📚 Conhecimento │ ◄─────────────│ 👁️ Filtro           │
├─────────────────┤                └──────────────────────┘
│ 🧠 Rastreamento │ ◄─────────────│ 📋 Dados             │
├─────────────────┤                └──────────────────────┘
│ 🛡️ Validação    │ ◄─────────────│ ✓ Correções          │
├─────────────────┤                └──────────────────────┘
│ 📤 Saída        │ ◄─────────────│ 📎 Arquivos          │
└─────────────────┘                │ 💬 Estilo            │
                                   └──────────────────────┘
     ↓
User clicks "Editar" on config node
     ↓
Drawer opens (TODO)
     ↓
User saves changes
     ↓
transformNodesToConfig()  (utils/node-builder.js)
     ↓
Backend API update
```

## Styling System

All styling centralized in `utils/node-styles.js`:
- Color mapping by node type (filter → info.lighter, corrections → success.lighter, etc.)
- Consistent sizing (pipeline: 320px, config: 280px)
- Complexity indicator colors and ranges
- Shared sx functions for consistency

## Layout Algorithm

`utils/node-positions.js`:
- Vertical spine at fixed X position
- Config nodes offset to the right
- Multiple configs on same pipeline node stack vertically
- Auto-calculation of canvas bounds for fitView

## Current Status

✅ Complete:
- All node components
- Styling system
- Layout algorithm
- Node builder utilities
- React Flow integration

🚧 TODO:
- Edit drawers for each config type
- Backend integration (load/save agent config)
- Real-time stats from last execution
- Drag-and-drop node creation
- Multi-agent workflow support (future)

## Usage

```jsx
import { BuilderFlowView } from './sections/builder';

<BuilderFlowView
  agentConfig={{
    response_schema: { ... },
    gating_rules: [ ... ],
    validation_rules: [ ... ],
    media_rules: { ... },
    multi_turn_config: { ... }
  }}
  onUpdateConfig={(type, updatedData) => {
    // Save to backend
  }}
/>
```

## Portuguese Terminology

| Technical | User-Friendly (PT-BR) |
|---|---|
| `gating_rules` | Filtro de Conhecimento |
| `response_schema` | Rastreamento de Dados |
| `validation_rules` | Correções Automáticas |
| `media_rules` | Arquivos Inteligentes |
| `multi_turn_config` | Estilo de Conversa |

No technical jargon - optimized for non-technical 40+ year old users.
