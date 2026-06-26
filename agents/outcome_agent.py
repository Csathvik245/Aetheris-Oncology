"""Outcome Agent (Section 6.3). Local PyTorch SurvivalScorer. No API calls.

Scores every candidate drug against the mutation profile and ranks them.
"""
import asyncio
from typing import Callable, List, Optional

from schemas.mutation import Mutation
from schemas.treatment import OutcomeOutput, DrugScore
from offline_data import cancer_soc_options, survival_score

_scorer = None


def _get_scorer():
    global _scorer
    if _scorer is None:
        import torch
        # Seed the (untrained) head so its affinity signal is reproducible across
        # runs — scores must be deterministic, not change every restart.
        torch.manual_seed(1337)
        from survival_model import SurvivalScorer
        _scorer = SurvivalScorer()
    return _scorer


def _candidates(mutations: List[Mutation], cancer_type: str) -> List[dict]:
    """Distinct candidate therapies with the metadata needed to score each one.

    Dedupes by drug, keeping the highest-confidence supporting driver. Falls back
    to cancer-type standard of care if no driver carried a drug, so a real VCF
    always yields scoreable options instead of an empty plan.
    """
    best: dict[str, dict] = {}
    for m in mutations:
        if not m.drug:
            continue
        cand = {"drug": m.drug, "level": m.evidence_level or "LEVEL_4",
                "gene": m.gene, "variant": m.variant,
                "confidence": float(m.confidence if m.confidence is not None else 0.7)}
        cur = best.get(m.drug)
        if cur is None or cand["confidence"] > cur["confidence"]:
            best[m.drug] = cand
    out = list(best.values())
    if not out:
        for soc in cancer_soc_options(cancer_type):
            out.append({"drug": soc["drug"], "level": soc["evidence_level"],
                        "gene": "-", "variant": "-", "confidence": 0.75})
    return out


def _score_all(mutations: List[Mutation], cancer_type: str = "") -> List[dict]:
    candidates = _candidates(mutations, cancer_type)
    if not candidates:
        return []

    mutation_text = " ".join(f"{m.gene} {m.variant} oncogenic" for m in mutations) or "oncogenic driver"
    # PyTorch survival model stays in the loop as a deterministic affinity nudge.
    try:
        scorer = _get_scorer()
        model_sig = {c["drug"]: float(scorer.score(mutation_text, c["drug"])) for c in candidates}
    except Exception as e:  # Section 15: clinical-factor scoring still works without it
        print(f"[outcome] survival model unavailable, scoring on clinical factors only ({e})")
        model_sig = {c["drug"]: None for c in candidates}

    # Each therapy gets a DISTINCT, explainable score (evidence band + variant
    # match + on/off-label fit + toxicity + confidence). Evidence dominates, so
    # rankings stay clinically sound (LEVEL_1 matches on top).
    scores = []
    for c in candidates:
        res = survival_score(c["drug"], c["level"], c["gene"], c["variant"],
                             c["confidence"], cancer_type, model_sig.get(c["drug"]))
        scores.append({"drug": c["drug"], "survival_benefit_score": res["score"]})

    scores.sort(key=lambda x: x["survival_benefit_score"], reverse=True)
    return scores


async def outcome_agent(mutations: List[Mutation],
                        cancer_type: str = "",
                        emit: Optional[Callable] = None) -> OutcomeOutput:
    if emit:
        await emit("OUTCOME_START", "outcome", "Running PyTorch survival model...")

    raw = await asyncio.to_thread(_score_all, mutations, cancer_type)
    drug_scores = [DrugScore(rank=i + 1, **s) for i, s in enumerate(raw)]
    out = OutcomeOutput(drug_scores=drug_scores)

    if emit:
        if drug_scores:
            top = drug_scores[0]
            msg = f"Top drug: {top.drug} (score: {top.survival_benefit_score})"
        else:
            msg = "No candidate drugs to score"
        await emit("OUTCOME_COMPLETE", "outcome", msg,
                   data={"drug_scores": [d.model_dump() for d in drug_scores]})
    return out
