#!/bin/bash
# ConnectAI Frontend Startup Script

cd /opt/connectai/frontend

# Serve production build on port 5459
exec npm start -- --host 0.0.0.0 --port 5459
