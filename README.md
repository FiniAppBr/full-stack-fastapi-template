# ConnectAI

> AI-powered connection platform built with FastAPI and React

## 🚀 Technology Stack

### Backend
- ⚡ **[FastAPI](https://fastapi.tiangolo.com)** - Modern Python web framework
- 🧰 **[SQLModel](https://sqlmodel.tiangolo.com)** - SQL database ORM with Pydantic
- 💾 **[PostgreSQL](https://www.postgresql.org)** - Relational database
- 🔒 **JWT Authentication** - Secure token-based auth
- 📫 **Email Password Recovery** - Built-in password reset flow
- ✅ **[Pytest](https://pytest.org)** - Backend testing

### Frontend
- ⚛️ **[React 19](https://react.dev)** - UI library
- 📘 **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- ⚡ **[Vite](https://vitejs.dev/)** - Build tool and dev server
- 🎨 **[Mantine UI](https://mantine.dev/)** - Component library
- 🧭 **[TanStack Router](https://tanstack.com/router)** - Type-safe routing
- 🔄 **[TanStack Query](https://tanstack.com/query)** - Data fetching and caching
- 🤖 **Auto-generated API client** - Type-safe backend integration
- 🌙 **Dark mode support** - Built-in theme switching

### DevOps
- 🐧 **Systemd services** - Backend and frontend as system services
- 🔄 **Hot Module Replacement** - Instant feedback during development
- 📊 **Alembic migrations** - Database version control

## 📦 Project Structure

```
/opt/connectai/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── core/        # Configuration
│   │   ├── models/      # Database models
│   │   └── main.py
│   ├── alembic/         # Database migrations
│   └── .venv/           # Python virtual environment
├── frontend/            # React frontend
│   ├── src/
│   │   ├── routes/      # Application pages
│   │   ├── components/  # Reusable components
│   │   ├── hooks/       # Custom React hooks
│   │   └── client/      # Auto-generated API client
│   └── .env             # Frontend config
├── docs/                # Documentation
├── scripts/             # Startup scripts
└── .env                 # Backend config
```

## 🛠️ Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

### Installation

1. **Backend setup:**
```bash
cd /opt/connectai/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

2. **Frontend setup:**
```bash
cd /opt/connectai/frontend
npm install
```

3. **Database setup:**
```bash
# Create database and user
sudo -u postgres psql
CREATE DATABASE connectai;
CREATE USER connectai WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE connectai TO connectai;
\q

# Run migrations
cd /opt/connectai/backend
source .venv/bin/activate
alembic upgrade head
python -m app.initial_data
```

4. **Configure environment:**
```bash
# Update /opt/connectai/.env with your settings
# Update /opt/connectai/frontend/.env with VITE_API_URL
```

## 🚀 Running the Application

### Development Mode

```bash
# Backend
./scripts/start-backend.sh

# Frontend (separate terminal)
./scripts/start-frontend.sh
```

### Production Mode (systemd services)

```bash
# Backend
systemctl start connectai-backend
systemctl status connectai-backend

# Frontend
systemctl start connectai-frontend
systemctl status connectai-frontend

# View logs
journalctl -u connectai-backend -f
journalctl -u connectai-frontend -f
```

## 🌐 Access

- **Frontend**: http://localhost:5459
- **Backend API**: http://localhost:5460
- **API Documentation**: http://localhost:5460/docs
- **Admin Login**: admin@connectai.com / changethis

## 📝 Development

### Adding New Features

1. **Backend API endpoint:**
   - Add route in `backend/app/api/`
   - Create/update models in `backend/app/models/`
   - Run migrations if needed

2. **Frontend page:**
   - Create file in `frontend/src/routes/`
   - Use Mantine components directly
   - Auto-generated API client available in `frontend/src/client/`

### Common Commands

```bash
# Backend
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
pytest  # Run tests

# Frontend
cd frontend
npm install <package>
npm run build  # Production build
```

## 📚 Documentation

- **Development Reference**: See [CLAUDE.md](./CLAUDE.md)
- **Migration Guide**: See [docs/mantine-migration.txt](./docs/mantine-migration.txt)

## 🔐 Security

- **Change default credentials** in `.env` before deployment
- Uses secure password hashing (bcrypt)
- JWT token-based authentication
- CORS properly configured

## 📄 License

MIT License

---

Built with ❤️ using FastAPI and React
