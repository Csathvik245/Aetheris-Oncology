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
