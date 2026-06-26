"""Genomic Agent (Section 6.1). MCP -> OncoKB + ClinVar. Model: Llama 4 Scout via Groq.

Annotates raw VCF mutations and returns the actionable (oncogenic) ones.
"""
from typing import Callable, List, Optional

from schemas.mutation import Mutation
from agents.mcp_client import call_mcp_server, MCPUnavailable
from offline_data import (
    annotate_offline, clinvar_offline, recommend_therapy, has_context_therapy,
)


def _build(gene: str, variant: str, cancer_type: str, oncokb: dict, clinvar: dict) -> Mutation:
    # ClinVar pathogenicity nudges confidence upward when concordant.
    conf = float(oncokb.get("confidence", 0.5))
    if "pathogenic" in str(clinvar.get("pathogenicity", "")).lower():
        conf = min(1.0, conf + 0.05)
    return Mutation(
        gene=gene,
        variant=variant,
        oncogenic=bool(oncokb.get("oncogenic", False)),
        evidence_level=oncokb.get("evidence_level", "LEVEL_4"),
        drug=oncokb.get("drug"),
        cancer_type=cancer_type,
        confidence=round(conf, 3),
    )


async def genomic_agent(mutations: List[dict], cancer_type: str = "unknown",
                        emit: Optional[Callable] = None) -> List[Mutation]:
    if emit:
        await emit("GENOMIC_START", "genomic", f"Querying OncoKB for {len(mutations)} mutations...")

    results: List[Mutation] = []
    for m in mutations:
        gene, variant = m.get("gene", ""), m.get("variant", "")
        if not gene or not variant:
            continue
        # OncoKB via MCP (falls back to offline KB if server down)
        try:
            oncokb = await call_mcp_server("oncokb_server", "annotate_mutation",
                                           {"gene": gene, "variant": variant})
        except MCPUnavailable:
            oncokb = annotate_offline(gene, variant)
        # ClinVar cross-reference
        try:
            clinvar = await call_mcp_server("clinvar_server", "check_pathogenicity",
                                            {"gene": gene, "variant": variant})
        except MCPUnavailable:
            clinvar = clinvar_offline(gene, variant)

        if oncokb.get("oncogenic"):
            # Resolve the cancer-aware therapy and apply it when EITHER OncoKB gave
            # no targeted drug (public tier) OR a tissue-specific override exists
            # for this variant (e.g. BRAF V600E -> Encorafenib+Cetuximab in colon
            # vs Dabrafenib+Trametinib in melanoma). In the override case the
            # cancer-agnostic KB enrichment from the MCP server must not win.
            ctx = has_context_therapy(gene, variant)
            if ctx or not oncokb.get("drug"):
                rec = recommend_therapy(gene, variant, cancer_type)
                oncokb["drug"] = rec["drug"]
                if ctx or oncokb.get("evidence_level", "LEVEL_4") == "LEVEL_4":
                    oncokb["evidence_level"] = rec["evidence_level"]
                oncokb["description"] = rec["rationale"] or oncokb.get("description", "")
            results.append(_build(gene, variant, cancer_type, oncokb, clinvar))

    if emit:
        await emit("GENOMIC_COMPLETE", "genomic",
                   f"Found {len(results)} actionable mutations",
                   data={"mutations": [r.model_dump() for r in results]})
    return results
