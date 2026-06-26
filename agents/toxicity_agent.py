"""Toxicity Agent (Section 6.5). MCP -> OpenFDA. Model: Llama 4 Scout via Groq."""
from typing import Callable, List, Optional

from schemas.treatment import OutcomeOutput, ToxicityOutput, RiskAssessment
from agents.mcp_client import call_mcp_server, MCPUnavailable
from offline_data import fda_offline


async def toxicity_agent(outcome: OutcomeOutput,
                         emit: Optional[Callable] = None) -> ToxicityOutput:
    if emit:
        await emit("TOXICITY_START", "toxicity", "Cross-checking OpenFDA adverse events...")

    top_drugs = [d.drug for d in outcome.drug_scores[:3]]
    assessments: List[RiskAssessment] = []
    for drug in top_drugs:
        try:
            fda = await call_mcp_server("fda_server", "get_adverse_events",
                                        {"drug_name": drug, "limit": 100})
        except MCPUnavailable:
            fda = fda_offline(drug, 100)
        assessments.append(RiskAssessment(
            drug=drug,
            risk_level=fda.get("risk_level", "LOW"),
            adverse_events=fda.get("adverse_events", []),
            interaction_flags=fda.get("interaction_flags", []),
        ))

    out = ToxicityOutput(risk_assessments=assessments)
    if emit:
        await emit("TOXICITY_COMPLETE", "toxicity", "Toxicity analysis complete",
                   data={"risk_assessments": [a.model_dump() for a in assessments]})
    return out
