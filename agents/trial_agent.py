"""Trial Agent (Section 6.4). MCP -> ClinicalTrials.gov. Model: Llama 4 Scout via Groq."""
from typing import Callable, List, Optional

from schemas.mutation import Mutation
from schemas.treatment import TrialOutput, Trial
from agents.mcp_client import call_mcp_server, MCPUnavailable
from offline_data import trials_offline


async def trial_agent(mutations: List[Mutation], cancer_type: str,
                      emit: Optional[Callable] = None) -> TrialOutput:
    if emit:
        await emit("TRIAL_START", "trial", "Querying ClinicalTrials.gov for open trials...")

    genes = list(dict.fromkeys(m.gene for m in mutations))
    # normalise header-style cancer types ("Glioblastoma_Multiforme") into a
    # human query the live API can match.
    condition = (cancer_type or "").replace("_", " ").strip()
    try:
        result = await call_mcp_server("trials_server", "search_trials", {
            "conditions": condition,
            "terms": " ".join(genes),
            "status": "RECRUITING",
            "max_results": 5,
        })
    except MCPUnavailable:
        result = trials_offline(genes, cancer_type)

    trials = [Trial(**t) for t in result.get("trials", [])]
    # live API returned nothing actionable — backfill from the curated KB so a
    # real VCF still surfaces relevant recruiting trials (Section 15).
    if not trials:
        trials = [Trial(**t) for t in trials_offline(genes, cancer_type).get("trials", [])]
    out = TrialOutput(trials=trials)

    if emit:
        await emit("TRIAL_COMPLETE", "trial", f"Found {len(trials)} recruiting trials",
                   data={"trials": [t.model_dump() for t in trials]})
    return out
