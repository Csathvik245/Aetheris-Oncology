"""Pydantic models for VCF input and genomic-agent mutation output (Section 5.1, 5.2)."""
from typing import Optional, List
from pydantic import BaseModel, Field


class InputMutation(BaseModel):
    gene: str
    variant: str
    chromosome: str
    position: int


class VCFInput(BaseModel):
    patient_id: str
    cancer_type: str
    mutations: List[InputMutation]


class Mutation(BaseModel):
    """Genomic Agent output — one annotated, actionable mutation."""
    gene: str
    variant: str
    oncogenic: bool
    evidence_level: str = Field(description="LEVEL_1 | LEVEL_2 | LEVEL_3 | LEVEL_4")
    drug: Optional[str] = None
    cancer_type: str
    confidence: float
