#!/bin/bash
# ConnectAI Backend Startup Script

cd /opt/connectai/backend

# Activate virtual environment
source .venv/bin/activate

# Start FastAPI server on port 5460
exec uvicorn app.main:app --host 0.0.0.0 --port 5460
