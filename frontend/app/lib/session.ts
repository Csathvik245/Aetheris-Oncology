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
  submittedAt: string;
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
