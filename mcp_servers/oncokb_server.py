"""OncoKB MCP server (port 8001). Wraps the public OncoKB API (public.api.oncokb.org).

Tool: annotate_mutation(gene, variant) -> {oncogenic, evidence_level, drug, description, confidence}

The public API needs no token for oncogenicity/mutation-effect, but the
treatment recommendations and evidence levels are token-gated. So we run a
hybrid: trust the live API for oncogenicity, and enrich drug + evidence level
from the curated KB whenever those token-gated fields come back empty. A licensed
ONCOKB_API_KEY (Bearer) is sent when present and takes precedence. Full offline
fallback on any network error (Section 15).
"""
import sys
from pathlib import Path

import httpx
import uvicorn

sys.path.insert(0, str(Path(__file__).parent.parent))
import config  # noqa: E402
from offline_data import annotate_offline  # noqa: E402
from mcp_servers._base import make_app  # noqa: E402

_LEVEL_MAP = {
    "LEVEL_1": "LEVEL_1", "LEVEL_2": "LEVEL_2", "LEVEL_3A": "LEVEL_3",
    "LEVEL_3B": "LEVEL_3", "LEVEL_4": "LEVEL_4",
}


def _normalise_level(raw: str) -> str:
    if not raw:
        return "LEVEL_4"
    return _LEVEL_MAP.get(raw.upper(), "LEVEL_4")


def _is_oncogenic(val) -> bool:
    return str(val).lower() in ("oncogenic", "likely oncogenic", "predicted oncogenic", "true")


async def annotate_mutation(gene: str, variant: str) -> dict:
    url = f"{config.ONCOKB_BASE_URL}/annotate/mutations/byProteinChange"
    headers = {"Accept": "application/json"}
    if config.HAS_ONCOKB:  # licensed token unlocks treatments/levels
        headers["Authorization"] = f"Bearer {config.ONCOKB_API_KEY}"
    params = {"hugoSymbol": gene, "alteration": variant}
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            r = await client.get(url, headers=headers, params=params)
            r.raise_for_status()
            data = r.json()
    except Exception:
        return annotate_offline(gene, variant)  # full offline fallback (Section 15)

    oncogenic = _is_oncogenic(data.get("oncogenic", ""))
    level = _normalise_level(data.get("highestSensitiveLevel") or "")
    treatments = data.get("treatments") or []
    drug = None
    if treatments:
        drugs = treatments[0].get("drugs") or []
        drug = " + ".join(d.get("drugName", "") for d in drugs) or None
    effect = data.get("mutationEffect") or {}
    description = (data.get("mutationEffectDescription") or effect.get("description")
                  or data.get("geneSummary") or effect.get("knownEffect", ""))

    # Enrich token-gated fields from the curated KB when the public tier omits them.
    source = "oncokb_live"
    if drug is None or level == "LEVEL_4":
        kb = annotate_offline(gene, variant)
        if kb.get("drug") and drug is None:
            drug = kb["drug"]
            source = "oncokb_live+kb"
        if kb.get("evidence_level") not in (None, "LEVEL_4") and level == "LEVEL_4":
            level = kb["evidence_level"]
            source = "oncokb_live+kb"
        if not description:
            description = kb.get("description", "")

    confidence = 0.95 if data.get("highestSensitiveLevel") else (0.8 if oncogenic else 0.4)
    return {
        "oncogenic": oncogenic,
        "evidence_level": level,
        "drug": drug,
        "description": description,
        "confidence": confidence,
        "source": source,
    }


app = make_app("OncoKB MCP Server", {"annotate_mutation": annotate_mutation})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=config.ONCOKB_PORT)
