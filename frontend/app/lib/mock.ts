/**
 * Static training-simulator content. Aetheris is education software — every
 * patient here is explicitly synthetic (never a real name/MRN-shaped ID).
 * Case Generator + Comparison Analysis have no backend yet, so their content
 * lives here as clearly-labeled mock data until those contracts exist.
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

/* ---------------- Dashboard ---------------- */

export const RESIDENT = {
  name: "Dr. Aris Thorne",
  role: "PGY-3 Resident",
};

export const DASHBOARD_STATS = {
  casesCompleted: 42,
  avgReasoningAgreement: 88,
  clinicalTrialAccuracy: 91,
};

export const ASSIGNED_CASES = [
  {
    level: "L3",
    title: "Stage IV Pancreatic Adenocarcinoma",
    subtitle: "Complex germline/somatic interplay",
    difficulty: "High Difficulty",
    minutes: 45,
    caseId: "pancreatic-1",
  },
  {
    level: "L1",
    title: "Early-Stage HR+ Breast Cancer",
    subtitle: "Adjuvant endocrine selection",
    difficulty: "Foundational",
    minutes: 20,
    caseId: "breast-1",
  },
  {
    level: "L2",
    title: "Renal Cell Carcinoma: Nivolumab Resistance",
    subtitle: "Second-line TKI strategy",
    difficulty: "Intermediate",
    minutes: 35,
    caseId: "rcc-1",
  },
];

export const COMPETENCY_SKILLS = [
  { skill: "Variant Interpretation", score: 92 },
  { skill: "Evidence Synthesis", score: 81 },
  { skill: "Trial Matching", score: 58 },
  { skill: "Toxicity Management", score: 76 },
  { skill: "Outcome Prediction", score: 84 },
  { skill: "Patient Safety", score: 88 },
];

export const RECENT_FEEDBACK = {
  quote:
    "Excellent rationale on the MET amplification pathway. Consider reviewing the latest ASCO guidelines on PD-L1 expression thresholds for frontline combo therapy.",
  author: "Dr. Sarah Chen, Attending",
};

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

/* ---------------- Comparison Analysis (mock — no scoring backend yet) ---------------- */

export const COMPARISON_842 = {
  scores: {
    biomarkers: 92,
    treatment: 64,
    toxicity: 88,
  },
  biomarkerPriority: {
    resident: [
      { label: "EGFR Exon 19 del", matched: true },
      { label: "TP53 Mutation", matched: true },
      { label: "PD-L1 (TPS < 1%)", matched: false },
    ],
    ai: [
      { label: "EGFR Exon 19 del", tag: "Match (0.99)" },
      { label: "TP53 Mutation", tag: "Match (0.84)" },
      { label: "TMB-High (Exploratory)", tag: "New Insight" },
    ],
  },
  treatment: {
    resident: {
      title: "Osimertinib + Chemotherapy",
      rationale:
        "Proposed based on high tumor burden and TP53 co-mutation to maximize initial response.",
    },
    ai: {
      title: "Osimertinib Monotherapy",
      rationale:
        "AI suggests monotherapy as primary standard of care per FLAURA trial, noting potential for unnecessary toxicity with chemo addition in this specific patient profile.",
    },
  },
  trials: {
    residentFound: false,
    aiMatches: [
      { nctId: "NCT04035235", title: "Evaluation of Osimertinib + Savolitinib in EGFRm+ NSCLC.", label: "SAVANNAH", match: 95 },
      { nctId: "NCT04863781", title: "Biomarker-directed platform study.", label: "ORCHARD", match: null },
    ],
  },
  stats: {
    timeToDecision: "14m 22s",
    evidenceDepth: 42,
    conflictResolution: "Pending",
    learningProgress: "+120 XP",
  },
};

/* ---------------- Practice History ---------------- */

export const PRACTICE_HISTORY = [
  { caseId: "melanoma-1", title: "Metastatic Melanoma", date: "Jul 12, 2026", agreement: 88, difficulty: "Advanced" as Difficulty },
  { caseId: "nsclc-egfr19", title: "Non-Small Cell Lung Cancer", date: "Jul 9, 2026", agreement: 94, difficulty: "Intermediate" as Difficulty },
  { caseId: "rcc-1", title: "Clear Cell Renal Cell Carcinoma", date: "Jul 3, 2026", agreement: 71, difficulty: "Intermediate" as Difficulty },
  { caseId: "pancreatic-1", title: "Pancreatic Adenocarcinoma", date: "Jun 27, 2026", agreement: 65, difficulty: "Advanced" as Difficulty },
  { caseId: "breast-1", title: "Invasive Ductal Carcinoma", date: "Jun 20, 2026", agreement: 97, difficulty: "Beginner" as Difficulty },
];

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
