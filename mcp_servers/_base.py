"""Tiny MCP-over-HTTP convention shared by all four servers.

Each server is a FastAPI app exposing:
  GET  /health       -> {"status": "ok", "name": ...}
  GET  /agent_card   -> the server's A2A card (best effort)
  POST /run          -> body {"tool": str, "params": {...}} -> {"result": ...}
"""
import sys
from pathlib import Path
from typing import Awaitable, Callable, Dict

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# allow `import config`, `import offline_data` when run as a script
sys.path.insert(0, str(Path(__file__).parent.parent))


class RunRequest(BaseModel):
    tool: str
    params: dict = {}


def make_app(name: str, tools: Dict[str, Callable[..., Awaitable[dict]]]) -> FastAPI:
    app = FastAPI(title=name)

    @app.get("/health")
    async def health():
        return {"status": "ok", "name": name, "tools": list(tools)}

    @app.get("/agent_card")
    async def agent_card():
        return {"name": name, "tools": list(tools)}

    @app.post("/run")
    async def run(req: RunRequest):
        fn = tools.get(req.tool)
        if fn is None:
            raise HTTPException(404, f"unknown tool '{req.tool}'")
        try:
            result = await fn(**req.params)
            return {"result": result}
        except Exception as e:  # graceful — never 500 to the agent
            return {"result": None, "error": f"{type(e).__name__}: {e}"}

    return app
