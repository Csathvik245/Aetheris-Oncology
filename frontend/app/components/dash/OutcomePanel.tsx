"use client";

import { useState } from "react";
import type { RiskAssessment, TreatmentPlan } from "../../lib/api";
import {
  TreatmentDetailModal,
  riskTone,
  evidenceLabel,
  type EnrichedTreatment,
} from "./TreatmentDetailModal";

/* idle demo so the area reads as a finished analysis before a run */
const DEMO: EnrichedTreatment[] = [
  {
    rank: 1,
    drug: "Dabrafenib + Trametinib",
    survival_benefit_score: 0.82,
    evidence_level: "LEVEL_1",
    supporting_citations: ["32441", "11983", "29456"],
    matching_trial: {
      nct_id: "NCT02034110",
      title:
        "Dabrafenib + Trametinib Combination Therapy in BRAF V600E Metastatic Melanoma",
    },
    toxicity_risk: "MODERATE",
    toxicity_notes:
      "Pyrexia and moderate cardiotoxicity reported; serial LVEF monitoring advised across cycles.",
    mechanism:
      "Dual MAPK-pathway blockade — BRAF V600E kinase inhibition paired with downstream MEK1/2 inhibition to suppress paradoxical reactivation.",
    adverse_events: ["Pyrexia", "Fatigue", "Nausea", "Rash", "Chills"],
    interaction_flags: ["CYP3A4 substrate", "QT prolongation"],
  },
  {
    rank: 2,
    drug: "Vemurafenib",
    survival_benefit_score: 0.67,
    evidence_level: "LEVEL_1",
    supporting_citations: ["18391", "27744"],
    matching_trial: {
      nct_id: "NCT01006980",
      title: "Vemurafenib Monotherapy in BRAF V600E Mutation-Positive Tumors",
    },
    toxicity_risk: "MODERATE",
    toxicity_notes:
      "Photosensitivity and cutaneous squamous-cell carcinoma risk; dermatologic surveillance required.",
    mechanism:
      "Selective ATP-competitive inhibition of mutant BRAF V600E kinase, blocking constitutive MEK/ERK signalling.",
    adverse_events: ["Arthralgia", "Photosensitivity", "Alopecia", "Keratoacanthoma"],
    interaction_flags: ["CYP1A2 inhibitor"],
  },
  {
    rank: 3,
    drug: "Encorafenib + Binimetinib",
    survival_benefit_score: 0.61,
    evidence_level: "LEVEL_2",
    supporting_citations: ["31019"],
    matching_trial: null,
    toxicity_risk: "LOW",
    toxicity_notes:
      "Generally well tolerated; transient transaminase elevation observed in a minority of patients.",
    mechanism:
      "Long-residence BRAF inhibition combined with MEK inhibition for durable pathway suppression.",
    adverse_events: ["Fatigue", "Nausea", "Diarrhea"],
    interaction_flags: ["CYP3A4 substrate"],
  },
];

function enrich(
  plan: TreatmentPlan,
  risks: RiskAssessment[]
): EnrichedTreatment[] {
  return plan.top_treatments.map((t) => {
    const r = risks.find(
      (x) =>
        x.drug &&
        t.drug &&
        (t.drug.toLowerCase().includes(x.drug.toLowerCase()) ||
          x.drug.toLowerCase().includes(t.drug.toLowerCase()))
    );
    return {
      ...t,
      adverse_events: r?.adverse_events,
      interaction_flags: (r as { interaction_flags?: string[] } | undefined)
        ?.interaction_flags,
    };
  });
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-lg bg-cyan/12 font-mono text-[12px] font-bold text-cyan ring-1 ring-cyan/30">
      #{rank}
    </span>
  );
}

function OutcomeCard({
  item,
  onClick,
}: {
  item: EnrichedTreatment;
  onClick: () => void;
}) {
  const tone = riskTone(item.toxicity_risk);
  const score = item.survival_benefit_score ?? 0;
  return (
    <button
      onClick={onClick}
      className="lift card group flex flex-col p-3 text-left"
    >
      <div className="flex items-center justify-between">
        <RankBadge rank={item.rank} />
        <span className={`pill ${tone.bg} ${tone.text} ring-1 ${tone.ring}`}>
          {(item.toxicity_risk || "LOW").toUpperCase()}
        </span>
      </div>

      <div className="mt-2 truncate text-[14px] font-semibold text-fg">
        {item.drug}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="label">Match Confidence</span>
        <span className="tnum text-[16px] font-bold text-green text-glow">
          {score.toFixed(2)}
        </span>
      </div>
      <div className="track mt-1.5">
        <span style={{ width: `${Math.min(100, score * 100)}%` }} />
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2 text-[10px] text-fgmute">
        <span className="text-cyan/80">{item.evidence_level}</span>
        <span>{evidenceLabel(item.evidence_level)}</span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] text-fgdim">
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
            menu_book
          </span>
          {item.supporting_citations?.length ?? 0} refs
        </span>
        <span className="flex items-center gap-1 text-[10px] text-cyan opacity-0 transition-opacity group-hover:opacity-100">
          View details
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
            arrow_forward
          </span>
        </span>
      </div>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="card flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <div className="skeleton h-7 w-7" />
        <div className="skeleton h-4 w-16" />
      </div>
      <div className="skeleton mt-1 h-4 w-3/4" />
      <div className="skeleton h-2 w-full" />
      <div className="skeleton h-2 w-2/3" />
      <div className="mt-2 flex justify-between">
        <div className="skeleton h-3 w-12" />
        <div className="skeleton h-3 w-16" />
      </div>
    </div>
  );
}

export function OutcomePanel({
  plan,
  risks,
  running,
}: {
  plan: TreatmentPlan | null;
  risks: RiskAssessment[];
  running: boolean;
}) {
  const [selected, setSelected] = useState<EnrichedTreatment | null>(null);

  const items = plan ? enrich(plan, risks) : DEMO;
  const patientId = plan?.patient_id ?? "PNT-9982";
  const computing = running && !plan;

  return (
    <section className="flex shrink-0 flex-col border-t border-line bg-base2/40 px-4 py-3">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-cyan" style={{ fontSize: 16 }}>
            target
          </span>
          <span className="label tracking-[0.18em] text-fgdim">
            Treatment Outcome · Ranked
          </span>
        </div>
        <span className="label">
          {computing ? (
            <span className="flex items-center gap-2 text-cyan">
              <span className="spinner" /> Computing
            </span>
          ) : plan ? (
            `${items.length} options · ${patientId}`
          ) : (
            `${items.length} options · preview`
          )}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {computing ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          items.slice(0, 3).map((it) => (
            <OutcomeCard key={it.rank} item={it} onClick={() => setSelected(it)} />
          ))
        )}
      </div>

      {selected && (
        <TreatmentDetailModal
          item={selected}
          patientId={patientId}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
