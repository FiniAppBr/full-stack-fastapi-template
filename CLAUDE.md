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
Frontend (React + TypeScript + Vite + Mantine UI)
    ↓ HTTP requests
Backend (FastAPI + Python)
    ↓
PostgreSQL Database
```

### Tech Stack
- **Backend**: FastAPI, SQLModel, PostgreSQL, Alembic
- **Frontend**: React 19, TypeScript, Vite, Mantine UI, TanStack Router, TanStack Query
- **Package Managers**: Python venv, npm (Node.js)

## Project Structure

```
/opt/connectai/
├── backend/              # FastAPI app
│   ├── app/
│   │   ├── api/         # API routes
│   │   ├── core/        # Core config
│   │   ├── models/      # SQLModel models
│   │   └── main.py
│   ├── alembic/         # Database migrations
│   ├── .venv/           # Python virtual environment
│   └── pyproject.toml
├── frontend/            # React + Mantine app
│   ├── src/
│   │   ├── routes/      # TanStack Router pages
│   │   ├── components/  # React components
│   │   │   ├── Common/  # Shared components (Navbar, Sidebar, etc.)
│   │   │   └── UserSettings/
│   │   ├── hooks/       # Custom React hooks
│   │   ├── client/      # Auto-generated API client
│   │   └── main.tsx
│   ├── .env             # Frontend environment variables
│   └── package.json
├── docs/
│   └── mantine-migration.txt  # Migration documentation
├── scripts/
│   ├── start-backend.sh
│   └── start-frontend.sh
├── .env                 # Backend environment variables
└── CLAUDE.md           # This file
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

- Backend: `/opt/connectai/.env`
- Frontend: `/opt/connectai/frontend/.env`
  - `VITE_API_URL` - Backend API URL (currently: http://195.35.43.23:5460)

## Credentials

- **Database**: `connectai` / `connectai` / `3LhcWDDllYClJZ2CwGJs2lPJF9-QqQ6lVoDP0XagXZM`
- **Admin Login**: admin@connectai.com / changethis (⚠️ CHANGE THIS)
- **SECRET_KEY**: Ab4KRY4a2ecXPoaDPcCD4H8tmN6Iq2dseDXXHnemqbo

## Important Notes

1. **Always use systemctl** to start/stop services (already configured and running)
2. **Database**: Uses PostgreSQL database `connectai` with user `connectai`
3. **No Docker**: This setup runs directly on the system without Docker
4. **UI Library**: Migrated from Chakra UI to Mantine (see `/docs/mantine-migration.txt`)
5. **Boilerplate Removed**: Items CRUD and Admin panel deleted - build ConnectAI features fresh
6. No need to systemctl restart after every change during development (Vite HMR)
7. ⚠️ **Change default passwords** in `.env` before production use

## Current Pages

### Public Routes:
- `/login` - User login
- `/signup` - User registration
- `/recover-password` - Password recovery
- `/reset-password` - Password reset

### Protected Routes (requires auth):
- `/` - Dashboard (placeholder - build your features here!)
- `/settings` - User settings (profile, password, appearance, delete account)

## Development Tips

- **Adding new pages**: Create files in `frontend/src/routes/`
- **Adding new components**: Use Mantine components directly (no wrapper needed)
- **Styling**: Use Mantine props and inline styles, or create CSS modules
- **Icons**: Using `react-icons` (already installed)
- **Forms**: Use `react-hook-form` for validation
- **Notifications**: Use `notifications.show()` from `@mantine/notifications`
- **API calls**: Auto-generated client in `frontend/src/client/`
