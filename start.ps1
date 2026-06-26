# OncologyOrchestrator — launch all services (Windows PowerShell)
# MCP servers (8001-8004), main API (8000), frontend (3000).

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "Starting MCP servers..." -ForegroundColor Cyan
Start-Process python -ArgumentList "mcp_servers/oncokb_server.py"  -WorkingDirectory $root
Start-Process python -ArgumentList "mcp_servers/clinvar_server.py" -WorkingDirectory $root
Start-Process python -ArgumentList "mcp_servers/trials_server.py"  -WorkingDirectory $root
Start-Process python -ArgumentList "mcp_servers/fda_server.py"     -WorkingDirectory $root

Start-Sleep -Seconds 2

Write-Host "Starting main API on :8000..." -ForegroundColor Cyan
Start-Process python -ArgumentList "-m","uvicorn","api.main:app","--port","8000" -WorkingDirectory $root

Write-Host "Starting frontend on :3000..." -ForegroundColor Cyan
if (Test-Path "$root/frontend/package.json") {
    Start-Process npm -ArgumentList "run","dev" -WorkingDirectory "$root/frontend"
} else {
    Write-Host "frontend/ not found — skipping" -ForegroundColor Yellow
}

Write-Host "`nAll services launching. API: http://localhost:8000  UI: http://localhost:3000" -ForegroundColor Green
