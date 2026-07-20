export const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---- Backend contract types ----
export type AgentKey =
  | "genomic"
  | "literature"
  | "outcome"
  | "trial"
  | "toxicity"
  | "orchestrator";

export interface SSEEvent {
  event: string;
  agent?: AgentKey | string;
  status?: string;
  message?: string;
  timestamp?: string;
  data?: Record<string, unknown> | null;
}

export interface Mutation {
  gene?: string;
  variant?: string;
  aa_change?: string;
  oncogenic?: string | boolean;
  evidence?: string;
  evidence_level?: string;
  drug?: string;
  cancer_type?: string;
  [k: string]: unknown;
}

export interface Citation {
  pmid?: string | number;
  title?: string;
  similarity?: number;
  score?: number;
  [k: string]: unknown;
}

export interface DrugScore {
  drug?: string;
  score?: number;
  survival_benefit_score?: number;
  [k: string]: unknown;
}

export interface Trial {
  nct_id?: string;
  title?: string;
  status?: string;
  phase?: string;
  eligibility_summary?: string;
  [k: string]: unknown;
}

export interface RiskAssessment {
  drug?: string;
  toxicity_risk?: string;
  risk?: string;
  adverse_events?: string[];
  notes?: string;
  [k: string]: unknown;
}

export interface Treatment {
  rank: number;
  drug: string;
  survival_benefit_score: number;
  evidence_level: string;
  supporting_citations: (string | number)[];
  matching_trial: { nct_id: string; title: string } | null;
  toxicity_risk: "LOW" | "MODERATE" | "HIGH" | string;
  toxicity_notes: string;
}

export interface TreatmentPlan {
  patient_id: string;
  generated_at: string;
  top_treatments: Treatment[];
  model_attribution: {
    orchestrator?: string;
    sub_agents?: string | string[];
    embedding?: string;
    survival_model?: string;
    [k: string]: unknown;
  };
  /** Set only when the resident's own worksheet reasoning was sent along with
   * the analysis — the orchestrator's direct response to their reasoning. */
  resident_feedback?: string | null;
}

/** What actually gets sent to the orchestrator alongside the VCF — a subset
 * of WorksheetSubmission, kept separate so the wire format stays decoupled
 * from the full local session type. */
export interface ResidentContext {
  diagnosisNote: string;
  biomarkerOrder: string[];
  drugs: { name: string; rationale: string }[];
  monitoring: string;
  doseModification: string;
}

export interface AgentCard {
  name: string;
  description: string;
  version: string;
  endpoint: string;
  capabilities: string[];
  data_sources: string[];
}

export async function postAnalyze(file: File, residentContext?: ResidentContext): Promise<{ job_id: string }> {
  const fd = new FormData();
  fd.append("file", file);
  if (residentContext) fd.append("resident_context", JSON.stringify(residentContext));
  const res = await fetch(`${API}/analyze`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`POST /analyze failed: ${res.status}`);
  return res.json();
}

export async function getResult(jobId: string): Promise<TreatmentPlan> {
  const res = await fetch(`${API}/result/${jobId}`);
  if (!res.ok) throw new Error(`GET /result failed: ${res.status}`);
  return res.json();
}

export async function getAgents(): Promise<AgentCard[]> {
  const res = await fetch(`${API}/agents`);
  if (!res.ok) throw new Error(`GET /agents failed: ${res.status}`);
  return res.json();
}
