"""HTTP client for calling the local MCP servers (Section 6 pseudocode `call_mcp_server`).

If a server is unreachable, raises MCPUnavailable so the calling agent can fall
back to the in-process offline data (Section 15 graceful degradation).
"""
import httpx

from config import MCP_URLS


class MCPUnavailable(Exception):
    pass


async def call_mcp_server(server: str, tool: str, params: dict, timeout: float = 20.0) -> dict:
    base = MCP_URLS.get(server)
    if not base:
        raise MCPUnavailable(f"unknown server {server}")
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(f"{base}/run", json={"tool": tool, "params": params})
            r.raise_for_status()
            body = r.json()
    except Exception as e:
        raise MCPUnavailable(f"{server} unreachable: {e}") from e
    if body.get("result") is None and body.get("error"):
        raise MCPUnavailable(f"{server}.{tool} error: {body['error']}")
    return body["result"]
