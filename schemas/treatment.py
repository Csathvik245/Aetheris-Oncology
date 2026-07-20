"""Pydantic models for agent outputs and the final treatment plan (Section 5.3-5.7)."""
from typing import List, Optional
from pydantic import BaseModel


# ── 5.3 Literature (RAG Agent) ──────────────────────────────────────────────
class Citation(BaseModel):
    pmid: str
    title: str
    similarity_score: float
    abstract_snippet: str


class LiteratureOutput(BaseModel):
    citations: List[Citation]


# ── 5.4 Outcome (PyTorch Agent) ─────────────────────────────────────────────
class DrugScore(BaseModel):
    drug: str
    survival_benefit_score: float
    rank: int


class OutcomeOutput(BaseModel):
    drug_scores: List[DrugScore]


# ── 5.5 Trial (Trial Agent) ─────────────────────────────────────────────────
class Trial(BaseModel):
    nct_id: str
    title: str
    status: str
    phase: str
    eligibility_summary: str


class TrialOutput(BaseModel):
    trials: List[Trial]


# ── 5.6 Toxicity (Toxicity Agent) ───────────────────────────────────────────
class RiskAssessment(BaseModel):
    drug: str
    risk_level: str  # LOW | MODERATE | HIGH
    adverse_events: List[str]
    interaction_flags: List[str]


class ToxicityOutput(BaseModel):
    risk_assessments: List[RiskAssessment]


# ── 5.7 Final Treatment Plan (Orchestrator) ─────────────────────────────────
class MatchingTrial(BaseModel):
    nct_id: str
    title: str


class TopTreatment(BaseModel):
    rank: int
    drug: str
    survival_benefit_score: float
    evidence_level: str
    supporting_citations: List[str]
    matching_trial: Optional[MatchingTrial] = None
    toxicity_risk: str
    toxicity_notes: str


class ModelAttribution(BaseModel):
    orchestrator: str = "openai/gpt-oss-120b via groq"
    sub_agents: str = "openai/gpt-oss-120b via groq"
    embedding: str = "dmis-lab/biobert-base-cased-v1.2"
    survival_model: str = "pytorch-local"


class TreatmentPlan(BaseModel):
    patient_id: str
    generated_at: str
    top_treatments: List[TopTreatment]
    model_attribution: ModelAttribution = ModelAttribution()
    # Set only when the resident's own worksheet reasoning was supplied to
    # the orchestrator — the orchestrator's direct response to what the
    # resident specifically argued (not just an agreement percentage).
    resident_feedback: Optional[str] = None
