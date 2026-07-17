/**
 * Persists the resident's worksheet submission and completed-session
 * history in localStorage. History entries are only ever written when a
 * real orchestrator run finishes (see mission-control), so "agreement" is
 * computed from actual submitted drugs vs. the actual returned plan —
 * never fabricated.
 */
import { CASES, type Difficulty, type PatientPacket } from "./mock";
import { isGeneratedCaseId, getGeneratedCase } from "./generatedCase";

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
  source: "live" | "demo";
}

const SUBMISSION_KEY = "aetheris:submissions";
const HISTORY_KEY = "aetheris:history";
const DRAFT_KEY = "aetheris:drafts";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function saveSubmission(sub: WorksheetSubmission) {
  const store = readJson<Record<string, WorksheetSubmission>>(SUBMISSION_KEY, {});
  store[sub.caseId] = sub;
  writeJson(SUBMISSION_KEY, store);
}

export function getSubmission(caseId: string): WorksheetSubmission | null {
  return readJson<Record<string, WorksheetSubmission>>(SUBMISSION_KEY, {})[caseId] ?? null;
}

export function saveDraft(draft: WorksheetDraft) {
  const store = readJson<Record<string, WorksheetDraft>>(DRAFT_KEY, {});
  store[draft.caseId] = draft;
  writeJson(DRAFT_KEY, store);
}

export function getDraft(caseId: string): WorksheetDraft | null {
  return readJson<Record<string, WorksheetDraft>>(DRAFT_KEY, {})[caseId] ?? null;
}

export function clearDraft(caseId: string) {
  const store = readJson<Record<string, WorksheetDraft>>(DRAFT_KEY, {});
  delete store[caseId];
  writeJson(DRAFT_KEY, store);
}

export function saveHistoryEntry(entry: HistoryEntry) {
  const list = readJson<HistoryEntry[]>(HISTORY_KEY, []);
  list.push(entry);
  writeJson(HISTORY_KEY, list);
}

export function listHistoryEntries(): HistoryEntry[] {
  return readJson<HistoryEntry[]>(HISTORY_KEY, []);
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

export function caseTitleFor(caseId: string, packet: PatientPacket): string {
  const mockCase = CASES.find((c) => c.id === caseId);
  if (mockCase) return mockCase.title;
  if (isGeneratedCaseId(caseId)) {
    const g = getGeneratedCase(caseId);
    if (g) return g.title;
  }
  return packet.pathology.diagnosis;
}

export function caseDifficultyFor(caseId: string): Difficulty {
  const mockCase = CASES.find((c) => c.id === caseId);
  if (mockCase) return mockCase.difficulty;
  if (isGeneratedCaseId(caseId)) {
    const g = getGeneratedCase(caseId);
    if (g) return g.difficulty;
  }
  return "Intermediate";
}
