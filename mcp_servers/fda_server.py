"""OpenFDA MCP server (port 8004). Wraps https://api.fda.gov/drug (no key required).

Tool: get_adverse_events(drug_name, limit) -> {drug, adverse_events, risk_level, interaction_flags}
"""
import sys
from pathlib import Path

import httpx
import uvicorn

sys.path.insert(0, str(Path(__file__).parent.parent))
import config  # noqa: E402
from offline_data import fda_offline  # noqa: E402
from mcp_servers._base import make_app  # noqa: E402

_SERIOUS_TERMS = {"death", "cardiac", "cardiomyopathy", "hepatotoxicity", "failure",
                  "pneumonitis", "interstitial", "haemorrhage", "sepsis", "toxic"}


def _classify_risk(reaction_counts: dict, serious_fraction: float) -> str:
    n = len(reaction_counts)
    has_serious = any(any(t in term.lower() for t in _SERIOUS_TERMS) for term in reaction_counts)
    if serious_fraction > 0.5 or (has_serious and n > 8):
        return "HIGH"
    if serious_fraction > 0.2 or has_serious:
        return "MODERATE"
    return "LOW"


async def get_adverse_events(drug_name: str, limit: int = 100) -> dict:
    primary = drug_name.split("+")[0].strip()
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"{config.OPENFDA_BASE_URL}/event.json",
                params={
                    "search": f'patient.drug.medicinalproduct:"{primary}"',
                    "limit": min(limit, 100),
                },
            )
            r.raise_for_status()
            results = r.json().get("results", [])
        counts, serious = {}, 0
        for ev in results:
            if str(ev.get("serious", "0")) == "1":
                serious += 1
            for rx in ev.get("patient", {}).get("reaction", []):
                term = rx.get("reactionmeddrapt", "")
                if term:
                    counts[term.title()] = counts.get(term.title(), 0) + 1
        if not results:
            return fda_offline(drug_name, limit)
        top = sorted(counts, key=counts.get, reverse=True)[:6]
        frac = serious / max(len(results), 1)
        return {
            "drug": drug_name,
            "adverse_events": top,
            "risk_level": _classify_risk(counts, frac),
            "interaction_flags": [],
            "source": "openfda_live",
        }
    except Exception:
        return fda_offline(drug_name, limit)


app = make_app("OpenFDA MCP Server", {"get_adverse_events": get_adverse_events})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=config.FDA_PORT)
