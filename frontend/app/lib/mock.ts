/**
 * Curated training-simulator content. Aetheris is education software —
 * every patient here is explicitly synthetic (never a real name/MRN-shaped
 * ID). These are hand-authored library cases, not fabricated user stats —
 * per-account progress, competency, and history all come from real
 * completed sessions (see lib/session.ts) instead of living here.
 */

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface CaseSummary {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  estMinutes: number;
  stage: string;
  mutation: string;
  tags: string[];
  cancerType: string;
  organSystem: string;
}

export const CASES: CaseSummary[] = [
  {
    id: "842",
    title: "Metastatic NSCLC with EGFR Resistance",
    description: "Second-line strategy after emergence of a resistance-conferring co-mutation.",
    difficulty: "Advanced",
    estMinutes: 30,
    stage: "IV",
    mutation: "EGFR L858R",
    tags: ["TKI RESISTANCE", "PRECISION ONCOLOGY"],
    cancerType: "Non-Small Cell Lung Cancer",
    organSystem: "Thoracic / Pulmonary",
  },
  {
    id: "melanoma-1",
    title: "Metastatic Melanoma",
    description: "Complex immunotherapy sequence with emerging toxicities.",
    difficulty: "Advanced",
    estMinutes: 25,
    stage: "IV",
    mutation: "BRAF V600E",
    tags: ["TOXICITY MGMT", "IMMUNO-ONCOLOGY"],
    cancerType: "Melanoma",
    organSystem: "Dermatologic",
  },
  {
    id: "nsclc-egfr19",
    title: "Non-Small Cell Lung Cancer",
    description: "Targeted therapy selection for treatment-naive adenocarcinoma.",
    difficulty: "Intermediate",
    estMinutes: 15,
    stage: "IIIB",
    mutation: "EGFR Exon 19",
    tags: ["TKI RESISTANCE", "STAGING"],
    cancerType: "Non-Small Cell Lung Cancer",
    organSystem: "Thoracic / Pulmonary",
  },
  {
    id: "pancreatic-1",
    title: "Pancreatic Adenocarcinoma",
    description: "Neoadjuvant strategy and surgical viability assessment.",
    difficulty: "Advanced",
    estMinutes: 30,
    stage: "II",
    mutation: "Germline BRCA2",
    tags: ["ADJUVANT CHEMO", "IMAGING"],
    cancerType: "Pancreatic Adenocarcinoma",
    organSystem: "Gastrointestinal",
  },
  {
    id: "breast-1",
    title: "Invasive Ductal Carcinoma",
    description: "Standard of care hormone receptor-positive breast cancer.",
    difficulty: "Beginner",
    estMinutes: 10,
    stage: "I",
    mutation: "ER+/PR+",
    tags: ["PATHOLOGY", "AI GUIDED"],
    cancerType: "Breast Carcinoma",
    organSystem: "Breast",
  },
  {
    id: "aml-1",
    title: "Acute Myeloid Leukemia",
    description: "Induction therapy management and MRD assessment.",
    difficulty: "Advanced",
    estMinutes: 40,
    stage: "De Novo",
    mutation: "FLT3-ITD",
    tags: ["FLOW CYTOMETRY", "HEMATOLOGY"],
    cancerType: "Acute Myeloid Leukemia",
    organSystem: "Hematologic",
  },
  {
    id: "rcc-1",
    title: "Clear Cell Renal Cell Carcinoma",
    description: "Dual checkpoint blockade in the first-line setting.",
    difficulty: "Intermediate",
    estMinutes: 20,
    stage: "IV",
    mutation: "VHL Loss",
    tags: ["TKI + IO", "NEPHROLOGY"],
    cancerType: "Renal Cell Carcinoma",
    organSystem: "Genitourinary",
  },
];

export function findCase(id: string): CaseSummary {
  return CASES.find((c) => c.id === id) ?? CASES[0];
}

/* ---------------- Patient Packet (Case #842) ---------------- */

export const PATIENT_842 = {
  caseId: "842",
  displayId: "Patient #842",
  age: 67,
  sex: "Female",
  ecog: 1,
  status: "Active Workup",
  lastUpdated: "2h ago",
  chiefComplaint:
    "Progressive dyspnea over the last 3 months, worsening on exertion. Accompanied by a persistent non-productive cough. No reported fever or night sweats.",
  medicalHistory: [
    "Non-smoker (lifetime)",
    "Hypertension (managed with lisinopril)",
    "Family history: mother, breast cancer, age 72",
  ],
  imaging: [
    {
      study: "CT Chest (Contrast)",
      date: "10/14/23",
      finding:
        "3.2cm spiculated mass identified in the Right Upper Lobe (RUL). Pleural thickening noted.",
    },
    {
      study: "PET/CT (Full Body)",
      date: "10/18/23",
      finding:
        "Hypermetabolic activity (SUV max 8.4) in RUL mass and ipsilateral hilar nodes.",
    },
  ],
  pathology: {
    diagnosis: "Adenocarcinoma",
    confirmed: true,
    markers: [
      { name: "TTF-1", value: "Positive (+)" },
      { name: "Napsin A", value: "Positive (+)" },
      { name: "p40", value: "Negative (-)" },
    ],
    genomicProfile: ["EGFR L858R", "TP53 Mutation", "ALK– (NEG)"],
  },
  resistanceNode: "T790M Negative",
  pdl1: "25% (TPS)",
  primaryMutation: "EGFR L858R",
};

export interface PatientPacket {
  caseId: string;
  displayId: string;
  age: number;
  sex: string;
  ecog: number;
  status: string;
  lastUpdated: string;
  chiefComplaint: string;
  medicalHistory: string[];
  imaging: { study: string; date: string; finding: string }[];
  pathology: {
    diagnosis: string;
    confirmed: boolean;
    markers: { name: string; value: string }[];
    genomicProfile: string[];
  };
}

export function getPacket(caseId: string): PatientPacket {
  if (caseId === PATIENT_842.caseId) return PATIENT_842;
  const c = findCase(caseId);
  return {
    caseId: c.id,
    displayId: `Patient #${c.id.replace(/[^0-9]/g, "").padStart(3, "0") || "000"}`,
    age: 58,
    sex: "Female",
    ecog: 1,
    status: "Active Workup",
    lastUpdated: "1d ago",
    chiefComplaint: `Synthetic case for training review: presentation consistent with ${c.cancerType.toLowerCase()}, stage ${c.stage}.`,
    medicalHistory: ["No significant prior oncologic history", "Synthetic case — generated for resident training"],
    imaging: [
      {
        study: "Cross-sectional Imaging",
        date: "on file",
        finding: `Findings consistent with ${c.cancerType.toLowerCase()}, stage ${c.stage} at presentation.`,
      },
    ],
    pathology: {
      diagnosis: c.cancerType,
      confirmed: true,
      markers: [],
      genomicProfile: [c.mutation],
    },
  };
}

/* ---------------- Worksheet ---------------- */

export const TOXICITY_TAGS = ["Neutropenia", "Cardiotoxicity", "Pneumonitis", "Skin Toxicity"];

export const WORKSHEET_TIP =
  "Current ASCO updates suggest considering localized radiation for oligoprogressive sites in EGFR-driven NSCLC.";

export const WORKSHEET_STEPS = [
  "Diagnosis",
  "Biomarkers",
  "Treatment Planning",
  "Toxicity Planning",
  "Final Review",
] as const;
