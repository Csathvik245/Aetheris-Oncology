"""Orchestrator (Section 6.6). Groq gpt-oss-120b synthesises all 5 agent outputs.

Falls back to deterministic assembly when no Groq key is present or the model
output fails validation — the orchestrator ALWAYS produces a plan (Section 15).
"""
import json
from datetime import datetime, timezone
from typing import Callable, List, Optional

from schemas.mutation import Mutation
from schemas.treatment import (
    LiteratureOutput, OutcomeOutput, TrialOutput, ToxicityOutput,
    TreatmentPlan, TopTreatment, MatchingTrial,
)
from agents.llm import groq_json

SYSTEM_PROMPT = """You are an oncology treatment planning orchestrator. You receive structured
JSON outputs from 5 specialized agents: genomic analysis, literature
retrieval, survival outcome prediction, clinical trial matching, and
toxicity assessment.

Your job is to synthesize all 5 inputs into a ranked treatment plan with
exactly 3 options. Each option must include:
- Drug name
- Survival benefit score from the PyTorch model
- Evidence level from OncoKB
- Supporting PubMed citation PMIDs
- Matching clinical trial NCT ID if available
- Toxicity risk level

Return ONLY valid JSON matching the treatment plan schema. No prose."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _evidence_for(drug: str, mutations: List[Mutation]) -> str:
    for m in mutations:
        if m.drug and m.drug == drug:
            return m.evidence_level
    return "LEVEL_4"


def _gene_for(drug: str, mutations: List[Mutation]) -> Optional[str]:
    for m in mutations:
        if m.drug == drug:
            return m.gene
    return None


def _first(d: dict, *keys, default=None):
    for k in keys:
        if k in d and d[k] not in (None, ""):
            return d[k]
    return default


def _coerce_plan(raw: dict, patient_id: str) -> dict:
    """Map common LLM key-name variants onto the TreatmentPlan schema so the
    model's actual synthesis is used instead of silently falling back."""
    items = _first(raw, "top_treatments", "treatment_options", "treatments",
                   "options", "plan", "ranked_treatments", default=[]) or []
    coerced_items = []
    for i, it in enumerate(items[:3]):
        if not isinstance(it, dict):
            continue
        trial = _first(it, "matching_trial", "trial", "clinical_trial")
        if isinstance(trial, dict):
            trial = {"nct_id": str(_first(trial, "nct_id", "nctId", "id", default="")),
                     "title": str(_first(trial, "title", "name", default=""))}
            if not trial["nct_id"]:
                trial = None
        else:
            trial = None
        cites = _first(it, "supporting_citations", "citations", "pmids", "pmid", default=[]) or []
        if isinstance(cites, (str, int)):
            cites = [str(cites)]
        coerced_items.append({
            "rank": int(_first(it, "rank", "ranking", default=i + 1)),
            "drug": str(_first(it, "drug", "drug_name", "name", "treatment", default="")),
            "survival_benefit_score": float(_first(
                it, "survival_benefit_score", "survival_score", "score", default=0.0)),
            "evidence_level": str(_first(it, "evidence_level", "evidence", "level", default="LEVEL_4")),
            "supporting_citations": [str(c) for c in cites],
            "matching_trial": trial,
            "toxicity_risk": str(_first(it, "toxicity_risk", "risk_level", "risk", default="LOW")).upper(),
            "toxicity_notes": str(_first(it, "toxicity_notes", "notes", "toxicity", default="")),
        })
    if not coerced_items:
        raise ValueError("no usable treatment items in model output")
    return {
        "patient_id": _first(raw, "patient_id", "patientId", default=patient_id),
        "generated_at": _first(raw, "generated_at", "generatedAt", default=_now()),
        "top_treatments": coerced_items,
    }


def _deterministic_plan(patient_id, mutations, literature, outcome, trials, toxicity) -> TreatmentPlan:
    tox_by_drug = {a.drug: a for a in toxicity.risk_assessments}
    top_pmids = [c.pmid for c in literature.citations[:3]]
    treatments: List[TopTreatment] = []

    for i, ds in enumerate(outcome.drug_scores[:3]):
        gene = _gene_for(ds.drug, mutations)
        match = None
        for t in trials.trials:
            if gene and (gene.upper() in (t.title.upper() + t.eligibility_summary.upper())):
                match = MatchingTrial(nct_id=t.nct_id, title=t.title)
                break
        if match is None and trials.trials:
            t = trials.trials[0]
            match = MatchingTrial(nct_id=t.nct_id, title=t.title)

        tox = tox_by_drug.get(ds.drug)
        treatments.append(TopTreatment(
            rank=i + 1,
            drug=ds.drug,
            survival_benefit_score=ds.survival_benefit_score,
            evidence_level=_evidence_for(ds.drug, mutations),
            supporting_citations=top_pmids,
            matching_trial=match,
            toxicity_risk=tox.risk_level if tox else "LOW",
            toxicity_notes=("; ".join(tox.adverse_events[:3]) + (
                " | " + "; ".join(tox.interaction_flags) if tox and tox.interaction_flags else ""
            )) if tox else "No adverse-event data available (unverified).",
        ))

    return TreatmentPlan(patient_id=patient_id, generated_at=_now(), top_treatments=treatments)


async def orchestrator(patient_id: str, cancer_type: str, mutations: List[Mutation],
                       literature: LiteratureOutput, outcome: OutcomeOutput,
                       trials: TrialOutput, toxicity: ToxicityOutput,
                       emit: Optional[Callable] = None) -> TreatmentPlan:
    if emit:
        await emit("ORCHESTRATOR_START", "orchestrator",
                   "Synthesizing final treatment plan with gpt-oss-120b (Groq)...")

    payload = {
        "patient_id": patient_id,
        "cancer_type": cancer_type,
        "genomic": [m.model_dump() for m in mutations],
        "literature": literature.model_dump(),
        "outcome": outcome.model_dump(),
        "trials": trials.model_dump(),
        "toxicity": toxicity.model_dump(),
        "required_output_schema": {
            "patient_id": "string",
            "generated_at": "ISO8601 string",
            "top_treatments": [{
                "rank": "integer (1-based)",
                "drug": "string (use a drug from outcome.drug_scores)",
                "survival_benefit_score": "float (from outcome.drug_scores)",
                "evidence_level": "string (from genomic mutation, e.g. LEVEL_1)",
                "supporting_citations": ["pmid strings from literature.citations"],
                "matching_trial": {"nct_id": "string", "title": "string"},
                "toxicity_risk": "LOW | MODERATE | HIGH (from toxicity)",
                "toxicity_notes": "string",
            }],
        },
        "instructions": ("Return up to 3 ranked options, best first. Use ONLY drugs that "
                          "appear in outcome.drug_scores. The top-level JSON key MUST be "
                          "exactly \"top_treatments\" (a JSON array). Output a single JSON "
                          "object, no prose."),
    }

    plan: Optional[TreatmentPlan] = None
    raw = await groq_json(SYSTEM_PROMPT, json.dumps(payload, indent=2))
    if raw:
        try:
            coerced = _coerce_plan(raw, patient_id)
            plan = TreatmentPlan(**coerced)
        except Exception as e:
            print(f"[orchestrator] gpt-oss output invalid, using deterministic ({e})")

    if plan is None:
        plan = _deterministic_plan(patient_id, mutations, literature, outcome, trials, toxicity)

    if emit:
        await emit("ORCHESTRATOR_COMPLETE", "orchestrator",
                   f"Treatment plan ready - {len(plan.top_treatments)} ranked options",
                   data=plan.model_dump())
    return plan
