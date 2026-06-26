"""ClinicalTrials.gov MCP server (port 8003). Wraps the v2 API (no key required).

Tool: search_trials(conditions, terms, status, max_results) -> {trials: [...]}
"""
import sys
from pathlib import Path

import httpx
import uvicorn

sys.path.insert(0, str(Path(__file__).parent.parent))
import config  # noqa: E402
from offline_data import trials_offline  # noqa: E402
from mcp_servers._base import make_app  # noqa: E402


def _phase(design: dict) -> str:
    phases = design.get("phases") or []
    return ", ".join(p.replace("PHASE", "Phase ") for p in phases) or "N/A"


async def search_trials(conditions: str = "", terms: str = "",
                        status: str = "RECRUITING", max_results: int = 5) -> dict:
    params = {
        "query.cond": conditions,
        "query.term": terms,
        "filter.overallStatus": status,
        "pageSize": max_results,
        "format": "json",
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) OncologyOrchestrator/1.0",
        "Accept": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get(f"{config.CLINICALTRIALS_BASE_URL}/studies",
                                 params=params, headers=headers)
            r.raise_for_status()
            studies = r.json().get("studies", [])
        trials = []
        for s in studies[:max_results]:
            ps = s.get("protocolSection", {})
            ident = ps.get("identificationModule", {})
            stat = ps.get("statusModule", {})
            elig = ps.get("eligibilityModule", {})
            crit = (elig.get("eligibilityCriteria") or "").strip().replace("\n", " ")
            trials.append({
                "nct_id": ident.get("nctId", ""),
                "title": ident.get("briefTitle", ""),
                "status": stat.get("overallStatus", status),
                "phase": _phase(ps.get("designModule", {})),
                "eligibility_summary": (crit[:240] + "…") if len(crit) > 240 else crit,
            })
        if not trials:
            return trials_offline([t for t in terms.split()], conditions)
        return {"trials": trials, "source": "clinicaltrials_live"}
    except Exception:
        return trials_offline([t for t in terms.split()], conditions)


app = make_app("ClinicalTrials MCP Server", {"search_trials": search_trials})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=config.TRIALS_PORT)
