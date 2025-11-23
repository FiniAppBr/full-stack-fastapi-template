#!/bin/bash
# ConnectAI Frontend Startup Script

cd /opt/connectai/frontend

# Dev mode with hot reload on port 5459
exec npm run dev -- --host 0.0.0.0 --port 5459
