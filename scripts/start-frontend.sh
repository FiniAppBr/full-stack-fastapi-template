#!/bin/bash
# ConnectAI Frontend Startup Script

cd /opt/connectai/frontend

# Start Vite development server on port 5459
exec npm run dev -- --host 0.0.0.0 --port 5459
