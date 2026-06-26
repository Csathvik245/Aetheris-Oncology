"use client";

import type { Mutation, TreatmentPlan } from "../../lib/api";

export interface PatientSummary {
  patientId: string;
  diagnosis: string;
  targetVariant: string;
  survivalScore: number;
  survivalDelta: number;
  stage: string;
}

const DEFAULT_SUMMARY: PatientSummary = {
  patientId: "PNT-9982",
  diagnosis: "Metastatic Adenocarcinoma",
  targetVariant: "BRAF V600E",
  survivalScore: 0.74,
  survivalDelta: 0.04,
  stage: "IV-B",
};

function titleCase(s: string): string {
  return s
    .replace(/_/g, " ")
    .trim()
    .replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="label">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

export function PatientCard({
  plan,
  mutations,
}: {
  plan: TreatmentPlan | null;
  mutations: Mutation[];
}) {
  const s = { ...DEFAULT_SUMMARY };
  const hasReal = !!plan || mutations.length > 0;
  if (plan) {
    s.patientId = plan.patient_id || s.patientId;
    const top = plan.top_treatments?.[0];
    if (top) s.survivalScore = top.survival_benefit_score ?? s.survivalScore;
  }
  const drv = mutations.find((m) => m.gene && m.variant);
  if (drv) s.targetVariant = `${drv.gene} ${drv.variant ?? drv.aa_change ?? ""}`.trim();
  // real cancer type comes through on each annotated mutation
  const ct = mutations.find((m) => m.cancer_type)?.cancer_type;
  if (ct) s.diagnosis = titleCase(ct);
  // stage is not present in a VCF — show it as unknown rather than a fixed value
  if (hasReal) s.stage = "—";

  const [gene, ...rest] = s.targetVariant.split(" ");

  return (
    <section className="card card-cyan p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-mono text-[18px] font-semibold tracking-tight text-fg">
          {s.patientId}
        </h2>
      </div>
      <div className="label mt-0.5">{s.diagnosis}</div>

      <div className="mt-3 divide-y divide-line/70">
        <Row label="Target Variant">
          <span className="pill bg-cyan/12 font-mono text-cyan ring-1 ring-cyan/30">
            <span className="font-semibold">{gene}</span>
            <span className="text-cyan/80">{rest.join(" ")}</span>
          </span>
        </Row>
        <Row label="Match Confidence">
          <div className="flex items-baseline justify-end gap-2">
            <span className="tnum text-[18px] font-semibold text-green text-glow">
              {s.survivalScore.toFixed(2)}
            </span>
            <span className="tnum text-[11px] text-green/70">
              +{s.survivalDelta.toFixed(2)}
            </span>
          </div>
        </Row>
        <Row label="Stage">
          <span className="tnum text-[14px] font-semibold text-fg">{s.stage}</span>
        </Row>
      </div>
    </section>
  );
}
