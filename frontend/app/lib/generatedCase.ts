/**
 * Live, LLM-generated synthetic training cases (Case Generator output).
 * Unlike `mock.ts`, nothing here is hand-authored — every case is produced
 * by a real call to the generation API (see app/api/generate-case) and
 * persisted in the `cases` table (source='synthetic', owner-scoped via RLS)
 * so it can be reopened and practiced from any device.
 */
import { useEffect, useState } from "react";
import { getPacket, type Difficulty, type PatientPacket } from "./mock";
import { createClient } from "./supabase/client";

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

interface CaseRow {
  id: string;
  created_at: string;
  generator_input: GeneratorInput;
  title: string;
  difficulty: Difficulty;
  est_minutes: number;
  stage: string;
  tags: string[];
  age: number;
  sex: string;
  ecog: number;
  chief_complaint: string;
  medical_history: string[];
  imaging: { study: string; date: string; finding: string }[];
  pathology: { diagnosis: string; markers: { name: string; value: string }[]; genomicProfile: string[] };
  candidate_drugs: { name: string; subtitle: string }[];
  toxicity_concerns: string[];
  clinical_pearl: string;
}

function rowToGeneratedCase(row: CaseRow): GeneratedCase {
  return {
    id: row.id,
    createdAt: row.created_at,
    input: row.generator_input,
    title: row.title,
    difficulty: row.difficulty,
    estMinutes: row.est_minutes,
    stage: row.stage,
    tags: row.tags,
    age: row.age,
    sex: row.sex,
    ecog: row.ecog,
    chiefComplaint: row.chief_complaint,
    medicalHistory: row.medical_history,
    imaging: row.imaging,
    pathology: row.pathology,
    candidateDrugs: row.candidate_drugs,
    toxicityConcerns: row.toxicity_concerns,
    clinicalPearl: row.clinical_pearl,
  };
}

const CASE_ROW_COLUMNS =
  "id, created_at, generator_input, title, difficulty, est_minutes, stage, tags, age, sex, ecog, chief_complaint, medical_history, imaging, pathology, candidate_drugs, toxicity_concerns, clinical_pearl";

// Despite the name (kept for the many existing call sites that gate
// "fetch this case's packet from Supabase" on it), this also matches
// faculty-authored case ids ("faculty-...") — both are `cases` table rows
// fetched the same way, as opposed to a static id from mock.ts.
export function isGeneratedCaseId(id: string): boolean {
  return id.startsWith("gen-") || id.startsWith("faculty-");
}

export async function saveGeneratedCase(c: GeneratedCase) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();

  await supabase.from("cases").insert({
    id: c.id,
    owner_id: user.id,
    institution_id: profile?.institution_id ?? null,
    source: "synthetic",
    visibility: "private",
    title: c.title,
    difficulty: c.difficulty,
    est_minutes: c.estMinutes,
    stage: c.stage,
    tags: c.tags,
    age: c.age,
    sex: c.sex,
    ecog: c.ecog,
    chief_complaint: c.chiefComplaint,
    medical_history: c.medicalHistory,
    imaging: c.imaging,
    pathology: c.pathology,
    candidate_drugs: c.candidateDrugs,
    toxicity_concerns: c.toxicityConcerns,
    clinical_pearl: c.clinicalPearl,
    generator_input: c.input,
    objective_titles: c.input.objectiveTitles ?? [],
  });
}

export async function getGeneratedCase(id: string): Promise<GeneratedCase | null> {
  const supabase = createClient();
  const { data } = await supabase.from("cases").select(CASE_ROW_COLUMNS).eq("id", id).maybeSingle<CaseRow>();
  return data ? rowToGeneratedCase(data) : null;
}

export async function listGeneratedCases(): Promise<GeneratedCase[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("cases")
    .select(CASE_ROW_COLUMNS)
    .eq("owner_id", user.id)
    .eq("source", "synthetic")
    .order("created_at", { ascending: false })
    .returns<CaseRow[]>();

  return (data ?? []).map(rowToGeneratedCase);
}

export interface FacultyCaseSummary {
  id: string;
  title: string;
  chiefComplaint: string;
  stage: string;
  estMinutes: number;
  genomicProfile: string[];
}

/** Faculty-authored cases visible to the signed-in resident/faculty's own
 * institution (RLS: `visibility='institution' and institution_id` match). */
export async function listInstitutionFacultyCases(): Promise<FacultyCaseSummary[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("cases")
    .select("id, title, chief_complaint, stage, est_minutes, pathology")
    .eq("source", "faculty_authored")
    .order("created_at", { ascending: false })
    .returns<{ id: string; title: string; chief_complaint: string; stage: string; est_minutes: number; pathology: { genomicProfile?: string[] } }[]>();

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    chiefComplaint: row.chief_complaint,
    stage: row.stage,
    estMinutes: row.est_minutes,
    genomicProfile: row.pathology?.genomicProfile ?? [],
  }));
}

export async function clearGeneratedCases() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("cases").delete().eq("owner_id", user.id).eq("source", "synthetic");
}

/** Resolves a caseId to its packet — real generated data from Supabase for
 * `gen-*` ids (loaded asynchronously after mount), mock data otherwise. */
export function usePacket(caseId: string): PatientPacket {
  const [packet, setPacket] = useState<PatientPacket>(() => getPacket(caseId));

  useEffect(() => {
    let cancelled = false;
    if (isGeneratedCaseId(caseId)) {
      getGeneratedCase(caseId).then((g) => {
        if (!cancelled && g) setPacket(generatedCaseToPacket(g));
      });
    } else {
      setPacket(getPacket(caseId));
    }
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  return packet;
}

export function generatedCaseToPacket(c: GeneratedCase): PatientPacket {
  const shortId = c.id.replace(/^gen-/, "G-").replace(/^faculty-/, "F-").slice(0, 10);
  return {
    caseId: c.id,
    displayId: `Patient #${shortId}`,
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
