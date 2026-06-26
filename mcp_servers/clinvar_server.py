"""ClinVar MCP server (port 8002). Wraps NCBI E-utilities (no key required).

Tool: check_pathogenicity(gene, variant) -> {pathogenicity, review_status}
"""
import sys
from pathlib import Path

import httpx
import uvicorn

sys.path.insert(0, str(Path(__file__).parent.parent))
import config  # noqa: E402
from offline_data import clinvar_offline  # noqa: E402
from mcp_servers._base import make_app  # noqa: E402


async def check_pathogenicity(gene: str, variant: str) -> dict:
    term = f"{gene}[gene] AND {variant}"
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            search = await client.get(
                f"{config.PUBMED_BASE_URL}/esearch.fcgi",
                params={"db": "clinvar", "term": term, "retmode": "json", "retmax": 1},
            )
            search.raise_for_status()
            ids = search.json().get("esearchresult", {}).get("idlist", [])
            if not ids:
                return clinvar_offline(gene, variant)
            summary = await client.get(
                f"{config.PUBMED_BASE_URL}/esummary.fcgi",
                params={"db": "clinvar", "id": ids[0], "retmode": "json"},
            )
            summary.raise_for_status()
            doc = summary.json().get("result", {}).get(ids[0], {})
        germ = doc.get("germline_classification") or {}
        clin = (germ.get("description")
                or doc.get("clinical_significance", {}).get("description")
                or "Uncertain significance")
        review = (germ.get("review_status")
                  or doc.get("clinical_significance", {}).get("review_status")
                  or "no assertion criteria")
        return {"pathogenicity": clin, "review_status": review, "source": "clinvar_live"}
    except Exception:
        return clinvar_offline(gene, variant)


app = make_app("ClinVar MCP Server", {"check_pathogenicity": check_pathogenicity})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=config.CLINVAR_PORT)
