/**
 * Persists the resident's worksheet submission and completed-session
 * history via Supabase (case_submissions / worksheet_drafts / history_entries
 * / pipeline_runs tables, RLS-scoped to the signed-in resident). History
 * entries are only ever written when a real orchestrator run finishes (see
 * mission-control), so "agreement" is computed from actual submitted drugs
 * vs. the actual returned plan — never fabricated.
 */
import { CASES, type Difficulty, type PatientPacket } from "./mock";
import { isGeneratedCaseId, getGeneratedCase, clearGeneratedCases } from "./generatedCase";
import { getPipelineData, clearPipelineData } from "./pipelineData";
import { createClient } from "./supabase/client";

export interface WorksheetSubmission {
  caseId: string;
  phase: string;
  drugs: { name: string; rationale: string; citation: string }[];
  monitoring: string;
  doseModification: string;
  tags: string[];
  confidence: number;
  diagnosisNote: string;
  /** Biomarkers in the order the resident ranked them (index 0 = highest priority). */
  biomarkerOrder: string[];
  /** Which of those the resident flagged as actually driving the treatment decision. */
  biomarkerChecks: Record<string, boolean>;
  submittedAt: string;
}

/** In-progress worksheet state, saved by the "Save Draft" button and
 * restored the next time the resident opens this case's worksheet. Unlike
 * WorksheetSubmission, a draft doesn't need to satisfy step validation. */
export interface WorksheetDraft {
  caseId: string;
  step: number;
  phase: string;
  drugs: { name: string; subtitle: string; rationale: string; citation: string }[];
  monitoring: string;
  doseModification: string;
  toxicityOptions: string[];
  tags: string[];
  confidence: number;
  diagnosisNote: string;
  biomarkerOrder: string[];
  biomarkerChecks: Record<string, boolean>;
  savedAt: string;
}

export interface HistoryEntry {
  caseId: string;
  title: string;
  date: string;
  agreement: number;
  difficulty: Difficulty;
}

async function currentUserAndInstitution() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, institutionId: null as string | null };
  const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
  return { supabase, user, institutionId: profile?.institution_id ?? null };
}

/** Clears every piece of case-generated/practice data (generated cases,
 * submissions, drafts, history, pipeline runs) for the signed-in account.
 * Used by the Settings "Reset Practice Data" action. */
export async function resetAllProgress() {
  const { supabase, user } = await currentUserAndInstitution();
  if (!user) return;
  await Promise.all([
    supabase.from("case_submissions").delete().eq("user_id", user.id),
    supabase.from("worksheet_drafts").delete().eq("user_id", user.id),
    supabase.from("history_entries").delete().eq("user_id", user.id),
    clearGeneratedCases(),
    clearPipelineData(),
  ]);
}

export async function saveSubmission(sub: WorksheetSubmission) {
  const { supabase, user, institutionId } = await currentUserAndInstitution();
  if (!user) return;
  await supabase.from("case_submissions").upsert({
    case_id: sub.caseId,
    user_id: user.id,
    institution_id: institutionId,
    phase: sub.phase,
    drugs: sub.drugs,
    monitoring: sub.monitoring,
    dose_modification: sub.doseModification,
    tags: sub.tags,
    confidence: sub.confidence,
    diagnosis_note: sub.diagnosisNote,
    biomarker_order: sub.biomarkerOrder,
    biomarker_checks: sub.biomarkerChecks,
    submitted_at: sub.submittedAt,
  });
}

interface SubmissionRow {
  case_id: string;
  phase: string;
  drugs: WorksheetSubmission["drugs"];
  monitoring: string;
  dose_modification: string;
  tags: string[];
  confidence: number;
  diagnosis_note: string;
  biomarker_order: string[];
  biomarker_checks: Record<string, boolean>;
  submitted_at: string;
}

function rowToSubmission(row: SubmissionRow): WorksheetSubmission {
  return {
    caseId: row.case_id,
    phase: row.phase,
    drugs: row.drugs,
    monitoring: row.monitoring,
    doseModification: row.dose_modification,
    tags: row.tags,
    confidence: row.confidence,
    diagnosisNote: row.diagnosis_note,
    biomarkerOrder: row.biomarker_order,
    biomarkerChecks: row.biomarker_checks,
    submittedAt: row.submitted_at,
  };
}

export async function getSubmission(caseId: string): Promise<WorksheetSubmission | null> {
  const { supabase, user } = await currentUserAndInstitution();
  if (!user) return null;
  const { data } = await supabase
    .from("case_submissions")
    .select("case_id, phase, drugs, monitoring, dose_modification, tags, confidence, diagnosis_note, biomarker_order, biomarker_checks, submitted_at")
    .eq("case_id", caseId)
    .eq("user_id", user.id)
    .maybeSingle<SubmissionRow>();
  return data ? rowToSubmission(data) : null;
}

export async function saveDraft(draft: WorksheetDraft) {
  const { supabase, user } = await currentUserAndInstitution();
  if (!user) return;
  await supabase.from("worksheet_drafts").upsert({
    case_id: draft.caseId,
    user_id: user.id,
    step: draft.step,
    phase: draft.phase,
    drugs: draft.drugs,
    monitoring: draft.monitoring,
    dose_modification: draft.doseModification,
    toxicity_options: draft.toxicityOptions,
    tags: draft.tags,
    confidence: draft.confidence,
    diagnosis_note: draft.diagnosisNote,
    biomarker_order: draft.biomarkerOrder,
    biomarker_checks: draft.biomarkerChecks,
    saved_at: draft.savedAt,
  });
}

interface DraftRow {
  case_id: string;
  step: number;
  phase: string;
  drugs: WorksheetDraft["drugs"];
  monitoring: string;
  dose_modification: string;
  toxicity_options: string[];
  tags: string[];
  confidence: number;
  diagnosis_note: string;
  biomarker_order: string[];
  biomarker_checks: Record<string, boolean>;
  saved_at: string;
}

function rowToDraft(row: DraftRow): WorksheetDraft {
  return {
    caseId: row.case_id,
    step: row.step,
    phase: row.phase,
    drugs: row.drugs,
    monitoring: row.monitoring,
    doseModification: row.dose_modification,
    toxicityOptions: row.toxicity_options,
    tags: row.tags,
    confidence: row.confidence,
    diagnosisNote: row.diagnosis_note,
    biomarkerOrder: row.biomarker_order,
    biomarkerChecks: row.biomarker_checks,
    savedAt: row.saved_at,
  };
}

const DRAFT_COLUMNS =
  "case_id, step, phase, drugs, monitoring, dose_modification, toxicity_options, tags, confidence, diagnosis_note, biomarker_order, biomarker_checks, saved_at";

export async function getDraft(caseId: string): Promise<WorksheetDraft | null> {
  const { supabase, user } = await currentUserAndInstitution();
  if (!user) return null;
  const { data } = await supabase
    .from("worksheet_drafts")
    .select(DRAFT_COLUMNS)
    .eq("case_id", caseId)
    .eq("user_id", user.id)
    .maybeSingle<DraftRow>();
  return data ? rowToDraft(data) : null;
}

export async function clearDraft(caseId: string) {
  const { supabase, user } = await currentUserAndInstitution();
  if (!user) return;
  await supabase.from("worksheet_drafts").delete().eq("case_id", caseId).eq("user_id", user.id);
}

export async function listDrafts(): Promise<WorksheetDraft[]> {
  const { supabase, user } = await currentUserAndInstitution();
  if (!user) return [];
  const { data } = await supabase
    .from("worksheet_drafts")
    .select(DRAFT_COLUMNS)
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false })
    .returns<DraftRow[]>();
  return (data ?? []).map(rowToDraft);
}

export async function saveHistoryEntry(entry: HistoryEntry) {
  const { supabase, user, institutionId } = await currentUserAndInstitution();
  if (!user) return;
  await supabase.from("history_entries").insert({
    case_id: entry.caseId,
    user_id: user.id,
    institution_id: institutionId,
    title: entry.title,
    difficulty: entry.difficulty,
    agreement: entry.agreement,
    occurred_at: new Date(entry.date).toISOString(),
  });
}

interface HistoryRow {
  case_id: string;
  title: string;
  difficulty: Difficulty;
  agreement: number;
  occurred_at: string;
}

export async function listHistoryEntries(): Promise<HistoryEntry[]> {
  const { supabase, user } = await currentUserAndInstitution();
  if (!user) return [];
  const { data } = await supabase
    .from("history_entries")
    .select("case_id, title, difficulty, agreement, occurred_at")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .returns<HistoryRow[]>();
  return (data ?? []).map((row: HistoryRow) => ({
    caseId: row.case_id,
    title: row.title,
    difficulty: row.difficulty,
    agreement: row.agreement,
    date: formatDisplayDate(new Date(row.occurred_at)),
  }));
}

export function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Real % overlap between the resident's submitted drug names and the
 * orchestrator's top-ranked treatments — not a fabricated score. */
export function computeAgreement(submission: WorksheetSubmission | null, aiDrugNames: string[]): number {
  const resident = (submission?.drugs ?? []).map((d) => d.name.toLowerCase()).filter(Boolean);
  if (resident.length === 0) return 0;
  const ai = aiDrugNames.map((d) => d.toLowerCase());
  const matched = resident.filter((rd) => ai.some((ad) => ad.includes(rd) || rd.includes(ad))).length;
  return Math.round((matched / resident.length) * 100);
}

/** Real % of the resident's prioritized biomarkers that the genomic agent
 * also flagged as oncogenic — not a fabricated score. */
export function computeBiomarkerAgreement(
  submission: WorksheetSubmission | null,
  aiGenes: string[]
): number {
  const resident = (submission?.biomarkerOrder ?? []).filter((g) => submission?.biomarkerChecks[g]);
  if (resident.length === 0) return 0;
  const ai = aiGenes.map((g) => g.toLowerCase());
  const matched = resident.filter((rg) => {
    const gene = rg.toLowerCase();
    return ai.some((ag) => gene.includes(ag) || ag.includes(gene.split(" ")[0]));
  }).length;
  return Math.round((matched / resident.length) * 100);
}

/** Real % overlap between the resident's flagged toxicity concerns and the
 * adverse events the toxicity agent actually reported — not fabricated. */
export function computeToxicityAgreement(
  submission: WorksheetSubmission | null,
  aiAdverseEvents: string[]
): number {
  const resident = (submission?.tags ?? []).map((t) => t.toLowerCase());
  if (resident.length === 0 || aiAdverseEvents.length === 0) return 0;
  const ai = aiAdverseEvents.map((e) => e.toLowerCase());
  const matched = resident.filter((t) => ai.some((e) => e.includes(t) || t.includes(e))).length;
  return Math.round((matched / resident.length) * 100);
}

/** Real comparison of the resident's top drug pick against the AI's — not fabricated. */
export function computeConflictResolution(
  submission: WorksheetSubmission | null,
  aiDrugNames: string[]
): "Aligned" | "Divergent" | "Pending" {
  const topResident = submission?.drugs[0]?.name.toLowerCase();
  const topAi = aiDrugNames[0]?.toLowerCase();
  if (!topResident || !topAi) return "Pending";
  return topAi.includes(topResident) || topResident.includes(topAi) ? "Aligned" : "Divergent";
}

/** Real minutes:seconds between worksheet submission and pipeline completion. */
export function computeTimeToDecision(submittedAt: string, completedAt: string): string {
  const ms = new Date(completedAt).getTime() - new Date(submittedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s}s`;
}

export async function caseTitleFor(caseId: string, packet: PatientPacket): Promise<string> {
  const mockCase = CASES.find((c) => c.id === caseId);
  if (mockCase) return mockCase.title;
  if (isGeneratedCaseId(caseId)) {
    const g = await getGeneratedCase(caseId);
    if (g) return g.title;
  }
  return packet.pathology.diagnosis;
}

export async function caseDifficultyFor(caseId: string): Promise<Difficulty> {
  const mockCase = CASES.find((c) => c.id === caseId);
  if (mockCase) return mockCase.difficulty;
  if (isGeneratedCaseId(caseId)) {
    const g = await getGeneratedCase(caseId);
    if (g) return g.difficulty;
  }
  return "Intermediate";
}

/** Real consecutive-day streak ending today, from actual completed-session
 * dates — 0 if there's no completed session today. */
export async function computeStreakDays(): Promise<number> {
  const history = await listHistoryEntries();
  const days = new Set(history.map((h) => new Date(h.date).toDateString()));
  if (days.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface DashboardStats {
  casesCompleted: number;
  avgReasoningAgreement: number | null;
  advancedCasesCompleted: number;
}

/** Real counts/averages from completed sessions — zero/null for a fresh
 * account, never a placeholder number. */
export async function computeDashboardStats(): Promise<DashboardStats> {
  const history = await listHistoryEntries();
  const agreements = history.map((h) => h.agreement);
  return {
    casesCompleted: history.length,
    avgReasoningAgreement:
      agreements.length > 0 ? Math.round(agreements.reduce((a, b) => a + b, 0) / agreements.length) : null,
    advancedCasesCompleted: history.filter((h) => h.difficulty === "Advanced").length,
  };
}

export interface CompetencySkill {
  skill: string;
  score: number;
}

/** Averages the same real per-case agreement scores shown on Comparison
 * Analysis across every completed session — not a fabricated skill matrix.
 * Empty array for a fresh account with no completed runs. */
export async function computeCompetencyProfile(): Promise<CompetencySkill[]> {
  const history = await listHistoryEntries();
  const buckets = { biomarkers: [] as number[], treatment: [] as number[], toxicity: [] as number[], confidence: [] as number[] };

  for (const h of history) {
    const [pd, sub] = await Promise.all([getPipelineData(h.caseId), getSubmission(h.caseId)]);
    if (!pd || !sub) continue;
    const aiDrugNames = pd.plan?.top_treatments.map((t) => t.drug) ?? [];
    const aiGenes = pd.mutations.map((m) => m.gene).filter((g): g is string => !!g);
    const aiEvents = pd.risks.flatMap((r) => r.adverse_events ?? []);
    buckets.biomarkers.push(computeBiomarkerAgreement(sub, aiGenes));
    buckets.treatment.push(computeAgreement(sub, aiDrugNames));
    buckets.toxicity.push(computeToxicityAgreement(sub, aiEvents));
    buckets.confidence.push(sub.confidence);
  }

  if (buckets.biomarkers.length === 0) return [];

  const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  return [
    { skill: "Biomarker Interpretation", score: avg(buckets.biomarkers) },
    { skill: "Treatment Selection", score: avg(buckets.treatment) },
    { skill: "Toxicity Awareness", score: avg(buckets.toxicity) },
    { skill: "Reported Confidence", score: avg(buckets.confidence) },
  ];
}
