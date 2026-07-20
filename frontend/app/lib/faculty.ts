/**
 * Faculty/admin-only reads and writes — cohort-wide data across an
 * institution. Every query here relies on the `*_cohort_select` RLS
 * policies (institution match + role in faculty/admin), so a resident
 * calling these functions would just get empty results, not an error.
 */
import { createClient } from "./supabase/client";
import type { WorksheetSubmission } from "./session";
import type { PipelineData } from "./pipelineData";

export interface RosterResident {
  id: string;
  fullName: string;
  displayRole: string | null;
  casesCompleted: number;
  avgAgreement: number | null;
  lastActive: string | null;
}

interface HistoryRow {
  user_id: string;
  agreement: number;
  occurred_at: string;
}

export async function listCohortRoster(institutionId: string): Promise<RosterResident[]> {
  const supabase = createClient();

  const [{ data: residents }, { data: history }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, display_role").eq("institution_id", institutionId).eq("role", "resident"),
    supabase
      .from("history_entries")
      .select("user_id, agreement, occurred_at")
      .eq("institution_id", institutionId)
      .returns<HistoryRow[]>(),
  ]);

  const byUser = new Map<string, HistoryRow[]>();
  for (const row of history ?? []) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  return (residents ?? []).map((r) => {
    const entries = byUser.get(r.id) ?? [];
    const avgAgreement =
      entries.length > 0 ? Math.round(entries.reduce((a, e) => a + e.agreement, 0) / entries.length) : null;
    const lastActive = entries.length > 0 ? entries.map((e) => e.occurred_at).sort().at(-1)! : null;
    return {
      id: r.id,
      fullName: r.full_name,
      displayRole: r.display_role,
      casesCompleted: entries.length,
      avgAgreement,
      lastActive,
    };
  });
}

export interface CohortTrendPoint {
  date: string;
  avgAgreement: number;
}

/** Daily average agreement across the whole cohort, for a trend chart. */
export async function cohortTrend(institutionId: string): Promise<CohortTrendPoint[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("history_entries")
    .select("agreement, occurred_at")
    .eq("institution_id", institutionId)
    .order("occurred_at", { ascending: true })
    .returns<{ agreement: number; occurred_at: string }[]>();

  const byDay = new Map<string, number[]>();
  for (const row of data ?? []) {
    const day = new Date(row.occurred_at).toISOString().slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(row.agreement);
    byDay.set(day, list);
  }

  return Array.from(byDay.entries())
    .map(([date, values]) => ({ date, avgAgreement: Math.round(values.reduce((a, b) => a + b, 0) / values.length) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface CohortMistake {
  label: string;
  count: number;
}

/** Frequency of toxicity tags flagged across cohort submissions — the
 * simplest honest signal of "what residents are noticing/missing" without
 * inventing a mistake-classification model. */
export async function cohortCommonTags(institutionId: string): Promise<CohortMistake[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("case_submissions")
    .select("tags")
    .eq("institution_id", institutionId)
    .returns<{ tags: string[] }[]>();

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    for (const tag of row.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export interface HardestCase {
  caseId: string;
  title: string;
  avgAgreement: number;
  attempts: number;
}

/** Cases with the lowest average agreement across the cohort — the
 * simplest honest "what's hardest" signal from real completed sessions. */
export async function institutionHardestCases(institutionId: string): Promise<HardestCase[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("history_entries")
    .select("case_id, title, agreement")
    .eq("institution_id", institutionId)
    .returns<{ case_id: string; title: string; agreement: number }[]>();

  const byCase = new Map<string, { title: string; scores: number[] }>();
  for (const row of data ?? []) {
    const entry = byCase.get(row.case_id) ?? { title: row.title, scores: [] };
    entry.scores.push(row.agreement);
    byCase.set(row.case_id, entry);
  }

  return Array.from(byCase.entries())
    .map(([caseId, v]) => ({
      caseId,
      title: v.title,
      avgAgreement: Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length),
      attempts: v.scores.length,
    }))
    .filter((c) => c.attempts >= 1)
    .sort((a, b) => a.avgAgreement - b.avgAgreement)
    .slice(0, 6);
}

export interface MostReplayedCase {
  caseId: string;
  title: string;
  attempts: number;
}

export async function institutionMostReplayedCases(institutionId: string): Promise<MostReplayedCase[]> {
  const cases = await institutionHardestCases(institutionId);
  return [...cases].sort((a, b) => b.attempts - a.attempts).slice(0, 6).map(({ caseId, title, attempts }) => ({ caseId, title, attempts }));
}

export interface MissedBiomarker {
  gene: string;
  missedCount: number;
}

/** Biomarkers the AI flagged as actionable that residents did NOT prioritize
 * in their own submission — a real per-case comparison, not a guess. */
export async function institutionMostMissedBiomarkers(institutionId: string): Promise<MissedBiomarker[]> {
  const supabase = createClient();
  const [{ data: submissions }, { data: runs }] = await Promise.all([
    supabase.from("case_submissions").select("case_id, user_id, biomarker_order, biomarker_checks").eq("institution_id", institutionId),
    supabase.from("pipeline_runs").select("case_id, user_id, mutations").eq("institution_id", institutionId),
  ]);

  const runByKey = new Map((runs ?? []).map((r) => [`${r.case_id}:${r.user_id}`, r.mutations as { gene?: string }[]]));
  const missCounts = new Map<string, number>();

  for (const sub of submissions ?? []) {
    const mutations = runByKey.get(`${sub.case_id}:${sub.user_id}`);
    if (!mutations) continue;
    const residentGenes = new Set(
      (sub.biomarker_order as string[]).filter((g) => (sub.biomarker_checks as Record<string, boolean>)[g]).map((g) => g.toLowerCase()),
    );
    for (const m of mutations) {
      if (!m.gene) continue;
      const flagged = [...residentGenes].some((rg) => rg.includes(m.gene!.toLowerCase()) || m.gene!.toLowerCase().includes(rg.split(" ")[0]));
      if (!flagged) missCounts.set(m.gene, (missCounts.get(m.gene) ?? 0) + 1);
    }
  }

  return Array.from(missCounts.entries())
    .map(([gene, missedCount]) => ({ gene, missedCount }))
    .sort((a, b) => b.missedCount - a.missedCount)
    .slice(0, 8);
}

/** Faculty review activity — a directional proxy for "time saved" (each
 * posted review represents a case reviewed through the platform), not a
 * precisely measured figure. */
export async function institutionReviewCount(institutionId: string): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("review_comments")
    .select("id", { count: "exact", head: true })
    .eq("institution_id", institutionId);
  return count ?? 0;
}

export interface ReviewQueueItem {
  caseId: string;
  userId: string;
  residentName: string;
  title: string;
  agreement: number;
  submittedAt: string;
  reviewed: boolean;
}

export async function listReviewQueue(institutionId: string): Promise<ReviewQueueItem[]> {
  const supabase = createClient();
  const [{ data: history }, { data: profiles }, { data: reviewed }] = await Promise.all([
    supabase
      .from("history_entries")
      .select("case_id, user_id, title, agreement, occurred_at")
      .eq("institution_id", institutionId)
      .order("occurred_at", { ascending: false })
      .returns<{ case_id: string; user_id: string; title: string; agreement: number; occurred_at: string }[]>(),
    supabase.from("profiles").select("id, full_name").eq("institution_id", institutionId),
    supabase.from("review_comments").select("case_id, submission_user_id").eq("institution_id", institutionId),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const reviewedSet = new Set((reviewed ?? []).map((r) => `${r.case_id}:${r.submission_user_id}`));

  return (history ?? []).map((h) => ({
    caseId: h.case_id,
    userId: h.user_id,
    residentName: nameById.get(h.user_id) ?? "Unknown Resident",
    title: h.title,
    agreement: h.agreement,
    submittedAt: h.occurred_at,
    reviewed: reviewedSet.has(`${h.case_id}:${h.user_id}`),
  }));
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

export async function getSubmissionForUser(caseId: string, userId: string): Promise<WorksheetSubmission | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("case_submissions")
    .select(
      "case_id, phase, drugs, monitoring, dose_modification, tags, confidence, diagnosis_note, biomarker_order, biomarker_checks, submitted_at",
    )
    .eq("case_id", caseId)
    .eq("user_id", userId)
    .maybeSingle<SubmissionRow>();
  if (!data) return null;
  return {
    caseId: data.case_id,
    phase: data.phase,
    drugs: data.drugs,
    monitoring: data.monitoring,
    doseModification: data.dose_modification,
    tags: data.tags,
    confidence: data.confidence,
    diagnosisNote: data.diagnosis_note,
    biomarkerOrder: data.biomarker_order,
    biomarkerChecks: data.biomarker_checks,
    submittedAt: data.submitted_at,
  };
}

interface PipelineRunRow {
  mutations: PipelineData["mutations"];
  citations: PipelineData["citations"];
  drug_scores: PipelineData["drugScores"];
  trials: PipelineData["trials"];
  risks: PipelineData["risks"];
  plan: PipelineData["plan"];
  completed_at: string;
}

export async function getPipelineDataForUser(caseId: string, userId: string): Promise<PipelineData | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("pipeline_runs")
    .select("mutations, citations, drug_scores, trials, risks, plan, completed_at")
    .eq("case_id", caseId)
    .eq("user_id", userId)
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

export interface ReviewComment {
  id: string;
  facultyId: string;
  facultyName: string;
  body: string;
  verdict: "approve" | "disagree" | "comment" | null;
  createdAt: string;
}

export async function listReviewComments(caseId: string, userId: string): Promise<ReviewComment[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("review_comments")
    .select("id, faculty_id, body, verdict, created_at, faculty:profiles!review_comments_faculty_id_fkey(full_name)")
    .eq("case_id", caseId)
    .eq("submission_user_id", userId)
    .order("created_at", { ascending: true })
    .returns<{ id: string; faculty_id: string; body: string; verdict: ReviewComment["verdict"]; created_at: string; faculty: { full_name: string } | { full_name: string }[] | null }[]>();

  return (data ?? []).map((row) => {
    const faculty = Array.isArray(row.faculty) ? row.faculty[0] : row.faculty;
    return {
      id: row.id,
      facultyId: row.faculty_id,
      facultyName: faculty?.full_name ?? "Faculty",
      body: row.body,
      verdict: row.verdict,
      createdAt: row.created_at,
    };
  });
}

export async function addReviewComment(params: {
  caseId: string;
  submissionUserId: string;
  institutionId: string;
  body: string;
  verdict: "approve" | "disagree" | "comment" | null;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("review_comments").insert({
    case_id: params.caseId,
    submission_user_id: params.submissionUserId,
    faculty_id: user.id,
    institution_id: params.institutionId,
    body: params.body,
    verdict: params.verdict,
  });
}

export interface CaseAssignment {
  id: string;
  caseId: string;
  caseTitle: string;
  note: string | null;
  dueAt: string | null;
  createdAt: string;
  completed: boolean;
}

export async function assignCase(params: {
  caseId: string;
  caseTitle: string;
  institutionId: string;
  assignedTo: string;
  note?: string;
  dueAt?: string;
}): Promise<{ error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("case_assignments").insert({
    case_id: params.caseId,
    case_title: params.caseTitle,
    institution_id: params.institutionId,
    assigned_by: user.id,
    assigned_to: params.assignedTo,
    note: params.note?.trim() || null,
    due_at: params.dueAt || null,
  });
  return { error: error?.message ?? null };
}

export async function unassignCase(assignmentId: string) {
  const supabase = createClient();
  await supabase.from("case_assignments").delete().eq("id", assignmentId);
}

export async function listAssignmentsForResident(userId: string): Promise<CaseAssignment[]> {
  const supabase = createClient();
  const [{ data: assignments }, { data: completed }] = await Promise.all([
    supabase
      .from("case_assignments")
      .select("id, case_id, case_title, note, due_at, created_at")
      .eq("assigned_to", userId)
      .order("created_at", { ascending: false }),
    supabase.from("history_entries").select("case_id").eq("user_id", userId),
  ]);
  const completedIds = new Set((completed ?? []).map((h) => h.case_id));
  return (assignments ?? []).map((a) => ({
    id: a.id,
    caseId: a.case_id,
    caseTitle: a.case_title,
    note: a.note,
    dueAt: a.due_at,
    createdAt: a.created_at,
    completed: completedIds.has(a.case_id),
  }));
}

/** Own-assignments variant for the signed-in resident (no userId needed). */
export async function listMyAssignments(): Promise<CaseAssignment[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  return listAssignmentsForResident(user.id);
}
