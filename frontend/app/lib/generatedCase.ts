/**
 * Live, LLM-generated synthetic training cases (Case Generator output).
 * Unlike `mock.ts`, nothing here is hand-authored — every case is produced
 * by a real call to the generation API (see app/api/generate-case) and
 * persisted client-side in localStorage so it can be reopened and practiced.
 */
import { useEffect, useState } from "react";
import { getPacket, type Difficulty, type PatientPacket } from "./mock";

export interface GeneratorInput {
  cancerType: string;
  metastaticSite: string;
  markers: string[];
  scenario: string;
  scenarioTitle: string;
  complexity: number;
  objectives: string[];
  objectiveTitles: string[];
}

export interface GeneratedCase {
  id: string;
  createdAt: string;
  input: GeneratorInput;
  title: string;
  difficulty: Difficulty;
  estMinutes: number;
  stage: string;
  tags: string[];
  age: number;
  sex: string;
  ecog: number;
  chiefComplaint: string;
  medicalHistory: string[];
  imaging: { study: string; date: string; finding: string }[];
  pathology: {
    diagnosis: string;
    markers: { name: string; value: string }[];
    genomicProfile: string[];
  };
  candidateDrugs: { name: string; subtitle: string }[];
  toxicityConcerns: string[];
  clinicalPearl: string;
}

const STORAGE_KEY = "aetheris:generated-cases";

function readStore(): Record<string, GeneratedCase> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, GeneratedCase>) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, GeneratedCase>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function isGeneratedCaseId(id: string): boolean {
  return id.startsWith("gen-");
}

export function saveGeneratedCase(c: GeneratedCase) {
  const store = readStore();
  store[c.id] = c;
  writeStore(store);
}

export function getGeneratedCase(id: string): GeneratedCase | null {
  return readStore()[id] ?? null;
}

export function listGeneratedCases(): GeneratedCase[] {
  return Object.values(readStore()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function clearGeneratedCases() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Resolves a caseId to its packet — real generated data from localStorage
 * for `gen-*` ids (loaded client-side after mount), mock data otherwise. */
export function usePacket(caseId: string): PatientPacket {
  const [packet, setPacket] = useState<PatientPacket>(() => getPacket(caseId));

  useEffect(() => {
    // One-shot bootstrap read from localStorage (unavailable during SSR) —
    // not a subscription, so useSyncExternalStore would be overkill here.
    if (isGeneratedCaseId(caseId)) {
      const g = getGeneratedCase(caseId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (g) setPacket(generatedCaseToPacket(g));
    } else {
      setPacket(getPacket(caseId));
    }
  }, [caseId]);

  return packet;
}

export function generatedCaseToPacket(c: GeneratedCase): PatientPacket {
  return {
    caseId: c.id,
    displayId: `Patient ${c.id.replace("gen-", "#G-")}`,
    age: c.age,
    sex: c.sex,
    ecog: c.ecog,
    status: "Active Workup",
    lastUpdated: "just now",
    chiefComplaint: c.chiefComplaint,
    medicalHistory: c.medicalHistory,
    imaging: c.imaging,
    pathology: {
      diagnosis: c.pathology.diagnosis,
      confirmed: true,
      markers: c.pathology.markers,
      genomicProfile: c.pathology.genomicProfile,
    },
  };
}
