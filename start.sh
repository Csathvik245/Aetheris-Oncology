#!/usr/bin/env bash
# OncologyOrchestrator — launch all services (bash)
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "Starting MCP servers..."
python mcp_servers/oncokb_server.py  & echo "  oncokb  -> 8001 (pid $!)"
python mcp_servers/clinvar_server.py & echo "  clinvar -> 8002 (pid $!)"
python mcp_servers/trials_server.py  & echo "  trials  -> 8003 (pid $!)"
python mcp_servers/fda_server.py     & echo "  fda     -> 8004 (pid $!)"
sleep 2

echo "Starting main API on :8000..."
python -m uvicorn api.main:app --port 8000 & echo "  api -> 8000 (pid $!)"

if [ -f frontend/package.json ]; then
  echo "Starting frontend on :3000..."
  ( cd frontend && npm run dev ) &
fi

echo "All services launching. API: http://localhost:8000  UI: http://localhost:3000"
wait
