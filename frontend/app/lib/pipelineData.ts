/**
 * Persists each agent's own output from a completed pipeline run, keyed by
 * caseId, so pages other than Mission Control (e.g. Comparison Analysis)
 * can read them later — and so each agent's chat can be given only its own
 * slice, never the others'.
 */
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

const STORAGE_KEY = "aetheris:pipeline-data";

function readStore(): Record<string, PipelineData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, PipelineData>) : {};
  } catch {
    return {};
  }
}
function writeStore(store: Record<string, PipelineData>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function savePipelineData(caseId: string, data: Omit<PipelineData, "completedAt">) {
  const store = readStore();
  store[caseId] = { ...data, completedAt: new Date().toISOString() };
  writeStore(store);
}

export function getPipelineData(caseId: string): PipelineData | null {
  return readStore()[caseId] ?? null;
}

export function clearPipelineData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
