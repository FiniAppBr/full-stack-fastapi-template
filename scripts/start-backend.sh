#!/bin/bash
# ConnectAI Backend Startup Script

cd /opt/connectai/backend

# Load environment variables from parent directory
set -a
source /opt/connectai/.env
set +a

# Activate virtual environment
source .venv/bin/activate

# Start FastAPI server on port 5460
exec uvicorn app.main:app --host 0.0.0.0 --port 5460
