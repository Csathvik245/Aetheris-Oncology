/**
 * Persists each agent's own output from a completed pipeline run, keyed by
 * caseId, so pages other than Mission Control (e.g. Comparison Analysis)
 * can read them later — and so each agent's chat can be given only its own
 * slice, never the others'. Backed by the `pipeline_runs` table (Supabase),
 * scoped to the signed-in resident via RLS.
 */
import { createClient } from "./supabase/client";
import type { Mutation, Citation, DrugScore, Trial, RiskAssessment, TreatmentPlan } from "./api";

export interface PipelineData {
  mutations: Mutation[];
  citations: Citation[];
  drugScores: DrugScore[];
  trials: Trial[];
  risks: RiskAssessment[];
  plan: TreatmentPlan | null;
  completedAt: string;
}

interface PipelineRunRow {
  mutations: Mutation[];
  citations: Citation[];
  drug_scores: DrugScore[];
  trials: Trial[];
  risks: RiskAssessment[];
  plan: TreatmentPlan | null;
  completed_at: string;
}

export async function savePipelineData(caseId: string, data: Omit<PipelineData, "completedAt">) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();

  await supabase.from("pipeline_runs").upsert({
    case_id: caseId,
    user_id: user.id,
    institution_id: profile?.institution_id ?? null,
    mutations: data.mutations,
    citations: data.citations,
    drug_scores: data.drugScores,
    trials: data.trials,
    risks: data.risks,
    plan: data.plan,
    completed_at: new Date().toISOString(),
  });
}

export async function getPipelineData(caseId: string): Promise<PipelineData | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("pipeline_runs")
    .select("mutations, citations, drug_scores, trials, risks, plan, completed_at")
    .eq("case_id", caseId)
    .eq("user_id", user.id)
    .maybeSingle<PipelineRunRow>();

  if (!data) return null;
  return {
    mutations: data.mutations,
    citations: data.citations,
    drugScores: data.drug_scores,
    trials: data.trials,
    risks: data.risks,
    plan: data.plan,
    completedAt: data.completed_at,
  };
}

export async function clearPipelineData() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("pipeline_runs").delete().eq("user_id", user.id);
}
