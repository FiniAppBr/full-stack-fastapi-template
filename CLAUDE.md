# Claude Development Reference

## System Services (systemctl)

```bash
# Backend (FastAPI/Python)
systemctl status connectai-backend
systemctl restart connectai-backend
systemctl stop connectai-backend

# Frontend (React/Vite)
systemctl status connectai-frontend
systemctl restart connectai-frontend
systemctl stop connectai-frontend

# View logs
journalctl -u connectai-backend -f
journalctl -u connectai-frontend -f
```

## Ports

- **Backend**: `http://localhost:5460` (port 5460)
- **Frontend**: `http://localhost:5459` (port 5459)
- **Database**: PostgreSQL on `localhost:5432`
- **Public**: http://195.35.43.23:5459 (frontend), http://195.35.43.23:5460 (backend)

## Architecture

```
Frontend (React + TypeScript + Vite + Material-UI/Minimals)
    ↓ HTTP requests (JWT Bearer tokens)
Backend (FastAPI + Python)
    ↓
PostgreSQL Database
```

### Tech Stack
- **Backend**: FastAPI, SQLModel, PostgreSQL, Alembic
- **Frontend**: React 18, TypeScript, Vite, Material-UI (MUI) v5, Minimals Dashboard Template
- **State Management**: SWR (React Hooks for data fetching)
- **Auth**: JWT tokens (form-urlencoded OAuth2 flow)
- **Charts**: ApexCharts
- **Calendar**: FullCalendar
- **Forms**: React Hook Form + Zod validation
- **Package Managers**: Python venv, npm (Node.js)

### Agent System (Current - ReAct Architecture)

**API Endpoint:** `POST /api/v1/chat/chat`

**Pipeline:** `assemble → agent ⟷ tools → respond → post_process`

**Key files:**
- `app/agent/core/graph.py` - LangGraph ReAct graph (main pipeline)
- `app/agent/core/prompts.py` - System prompt template (Portuguese)
- `app/agent/core/config.py` - BaseAgentConfig class
- `app/agent/core/db_loader.py` - Loads NeoAgent DB → BaseAgentConfig
- `app/agent/core/schema.py` - Core types (Objective, Guardrails, ChunkMatch)
- `app/agent/core/pipeline/assemble.py` - RAG context assembly
- `app/api/routes/chat.py` - Chat API endpoint

**Database model:** `neo_agents` table (`app/models/neo_agent.py`)
- Config stored as JSON in `config` column
- Linked entities in `linked_entities` array

**Config structure (neo_agents.config JSON):**
```json
{
  "personality": { "min_messages": 2, "max_messages": 6, "max_response_length": 200 },
  "guardrails": { "never_say": [], "never_do": [], "always_do": [] },
  "funnel": { "objectives": [...], "escalation_rules": [...] },
  "data_collection": { "fields": [{ "field_id": 1, "necessity": "recommended", "collection_hint": "..." }] },
  "models": { "generation": { "model": "google/gemini-2.5-flash-lite", "temperature": 0.7 } },
  "typing": { "enabled": true, "base_ms": 800, "per_char_ms": 30 },
  "enabled_tool_categories": ["inventory", "booking"]
}
```

**How config flows:**
1. `chat.py` calls `load_agent_config(agent_id)`
2. `db_loader.py` fetches NeoAgent from DB, converts to BaseAgentConfig
3. `data_collection.fields[].collection_hint` → injected as objectives
4. `prompts.py` builds system prompt from config

**Testing:**
```bash
# Chat with agent
curl -X POST localhost:5460/api/v1/chat/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "oi", "agent_id": 1}'

# Clear config cache (after DB changes)
sudo systemctl restart connectai-backend

# View logs
cat /opt/connectai/logs/nina/{agent_name}/{thread_id}.jsonl
```

**Logs:** `/opt/connectai/logs/nina/{agent_name}/{thread_id}.jsonl`
- Each turn logged with: input, output, tokens, system_prompt, tool_calls

**Notes:**
- Language hardcoded to Portuguese in `db_loader.py`
- Uses OpenRouter for LLM (`OPENROUTER_API_KEY` env var)
- SendResponse tool forces structured multi-message output

## Project Structure

```
/opt/connectai/
├── backend/              # FastAPI app
│   ├── app/
│   │   ├── api/         # API routes
│   │   │   └── v1/      # API v1 endpoints
│   │   ├── core/        # Core config
│   │   ├── models/      # SQLModel models
│   │   └── main.py
│   ├── alembic/         # Database migrations
│   ├── .venv/           # Python virtual environment
│   └── pyproject.toml
├── frontend/            # Minimals Dashboard (Vite + React + MUI)
│   ├── src/
│   │   ├── actions/     # SWR data fetching hooks
│   │   ├── auth/        # JWT auth context & guards
│   │   ├── components/  # Reusable UI components
│   │   ├── layouts/     # Dashboard, auth layouts
│   │   ├── pages/       # Route pages
│   │   ├── sections/    # Page sections (views)
│   │   ├── theme/       # MUI theme customization
│   │   ├── utils/       # Axios, helpers, formatters
│   │   ├── config-global.js  # Global config
│   │   └── app.jsx      # App entry point
│   ├── public/          # Static assets
│   ├── .env             # Frontend environment variables
│   ├── package.json
│   └── vite.config.js
├── archive/             # Old/unused files (git ignored)
│   └── frontend-old-mantine/  # Previous Mantine version
├── scripts/
│   ├── start-backend.sh
│   └── start-frontend.sh
├── .env                 # Backend environment variables
└── CLAUDE.md            # This file
```

## Common Tasks

### Install Dependencies
```bash
# Backend
cd backend && pip install <package>

# Frontend
cd frontend && npm install <package>
```

### Database Migrations
```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Run Without systemctl (Dev)
```bash
# Backend
./scripts/start-backend.sh

# Frontend
./scripts/start-frontend.sh
```

## Environment Variables

### Backend: `/opt/connectai/.env`
- Database credentials
- JWT secret key
- CORS origins

### Frontend: `/opt/connectai/frontend/.env`
- `VITE_SERVER_URL` - Backend API URL (currently: http://195.35.43.23:5460)
- `VITE_ASSET_URL` - Asset server URL (same as server URL)
- Auth provider configs (Firebase, Auth0, AWS Amplify, Supabase - optional)

## Credentials

- **Database**: `connectai` / `connectai` / `3LhcWDDllYClJZ2CwGJs2lPJF9-QqQ6lVoDP0XagXZM`
- **Admin Login**: admin@connectai.com / changethis (⚠️ CHANGE THIS)
- **SECRET_KEY**: Ab4KRY4a2ecXPoaDPcCD4H8tmN6Iq2dseDXXHnemqbo

## Backend API Endpoints

### Auth (JWT)
- `POST /api/v1/login/access-token` - Login (form-urlencoded: username, password)
- `GET /api/v1/users/me` - Get current user
- `POST /api/v1/users/signup` - Register new user

### Users
- Managed via FastAPI user system

## Frontend Structure

### Key Directories

**`/src/auth/`** - Authentication
- `context/jwt/` - JWT auth provider & actions
- `guard/` - Auth & guest guards for routes
- `hooks/` - useAuthContext hook

**`/src/actions/`** - Data Fetching (SWR)
- Each file exports hooks like `useGetEvents()` for fetching data
- Supports local mock data or server data via `enableServer` flag

**`/src/sections/`** - Page Views
- Each feature has a folder (e.g., `calendar/`, `chat/`, `mail/`)
- Contains view components and feature-specific logic

**`/src/components/`** - Reusable Components
- `animate/` - Framer Motion animations
- `chart/` - ApexCharts wrapper
- `hook-form/` - React Hook Form fields
- `iconify/` - Icon component
- And many more UI components

**`/src/theme/`** - MUI Theme
- Theme customization and color schemes
- Component style overrides

## Important Notes

1. **Always use systemctl** to start/stop services (already configured and running)
2. **Database**: Uses PostgreSQL database `connectai` with user `connectai`
3. **No Docker**: This setup runs directly on the system without Docker
4. **UI Library**: Now using **Material-UI (MUI)** with **Minimals Dashboard Template** (v6.0.1)
   - Previous Mantine version backed up in `/archive/frontend-old-mantine/`
5. **Demo Data**: Most demo endpoints return 404s - this is expected. The app uses local mock data via SWR
6. **Vite HMR**: No need to restart after code changes (hot module reload)
7. **Auth Flow**: JWT tokens stored in sessionStorage, sent as Bearer tokens
8. ⚠️ **Change default passwords** in `.env` before production use

## Minimals Dashboard Features

### Available Pages (Demo/Template)
- **Dashboards**: Analytics, Banking, Booking, E-commerce, File Manager, Course
- **Calendar**: FullCalendar integration with CRUD operations
- **Chat**: Real-time chat UI (needs backend integration)
- **Mail**: Email client UI (needs backend integration)
- **Kanban**: Drag-and-drop kanban board (needs backend integration)
- **File Manager**: File browser UI (needs backend integration)
- **User Management**: CRUD operations for users
- **Product/E-commerce**: Product listings, checkout flow
- **Blog/Posts**: Blog post management
- **Invoice**: Invoice creation and management
- **Job Board**: Job listings
- **Tour**: Tour/travel listings

### Pre-built Components
- **Forms**: Text fields, select, checkbox, radio, date pickers, file upload
- **Tables**: Data grids with sorting, filtering, pagination
- **Charts**: Line, bar, pie, area, radar, and more (ApexCharts)
- **Cards**: Stats cards, info cards, pricing cards
- **Navigation**: Sidebar, header, breadcrumbs, tabs
- **Modals**: Dialogs, drawers, popovers, tooltips
- **Notifications**: Toast notifications (Sonner)
- **Animations**: Framer Motion integration

## Integrating Your Backend

### Step 1: Create Backend Endpoints
Add your ConnectAI features to FastAPI:
```python
# backend/app/api/v1/your_feature.py
@router.get("/conversations")
async def get_conversations(current_user: User = Depends(get_current_user)):
    # Your logic here
    return {"conversations": [...]}
```

### Step 2: Update Frontend Endpoints
```javascript
// frontend/src/utils/axios.js
export const endpoints = {
  // ... existing
  conversations: '/api/v1/conversations',
  messages: '/api/v1/messages',
};
```

### Step 3: Create SWR Hook
```javascript
// frontend/src/actions/conversations.js
import useSWR from 'swr';
import { fetcher, endpoints } from 'src/utils/axios';

export function useGetConversations() {
  const { data, error, isLoading } = useSWR(
    endpoints.conversations,
    fetcher
  );

  return {
    conversations: data?.conversations || [],
    isLoading,
    error,
  };
}
```

### Step 4: Use in Components
```javascript
// frontend/src/sections/conversations/conversation-view.jsx
import { useGetConversations } from 'src/actions/conversations';

export function ConversationView() {
  const { conversations, isLoading } = useGetConversations();

  // Render your UI
}
```

## Development Tips

- **Adding new pages**: Create files in `frontend/src/pages/` and `frontend/src/sections/`
- **Adding new components**: Use MUI components from `@mui/material`
- **Styling**: Use MUI's `sx` prop or theme customization in `src/theme/`
- **Icons**: Using Iconify (`@iconify/react`) - access to 200k+ icons
- **Forms**: React Hook Form + Zod validation (see examples in `src/sections/auth/`)
- **Notifications**: Use `toast.success()` from `sonner` package
- **Data fetching**: Create SWR hooks in `src/actions/`
- **Auth guards**: Wrap routes with `<AuthGuard>` or `<GuestGuard>`
- **Mock data**: Located in `src/_mock/` for testing

## Archive Folder

`/opt/connectai/archive/` - Git-ignored folder for old/unused files
- Keep backups of replaced code here
- Safe to delete entire folder if needed
- use few tool calls, try not to read full files if you can avoid it to save tokens unless mentioned otherwise