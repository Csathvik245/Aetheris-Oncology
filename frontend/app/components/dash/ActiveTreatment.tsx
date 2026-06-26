"use client";

import type { DrugScore } from "../../lib/api";

interface TreatmentRow {
  drug: string;
  role: string;
  score: number;
  primary: boolean;
}

// Illustrative sample shown before any analysis has run (clearly labelled).
const DEMO_ROWS: TreatmentRow[] = [
  { drug: "Dabrafenib + Trametinib", role: "Sample", score: 0.82, primary: true },
  { drug: "Vemurafenib", role: "Sample", score: 0.67, primary: false },
];

export function ActiveTreatment({ drugScores }: { drugScores: DrugScore[] }) {
  const live = drugScores.length > 0;
  const rows: TreatmentRow[] = live
    ? drugScores.slice(0, 2).map((d, i) => ({
        drug: d.drug ?? "—",
        role: i === 0 ? "Recommended" : "Alternative",
        score: d.survival_benefit_score ?? d.score ?? 0,
        primary: i === 0,
      }))
    : DEMO_ROWS;

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="label">Proposed Regimen</span>
        <span
          className={`pill text-[9px] ring-1 ${
            live
              ? "bg-cyan/10 text-cyan ring-cyan/25"
              : "bg-amber/10 text-amber ring-amber/25"
          }`}
        >
          {live ? "Proposed · not started" : "Illustrative"}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div
            key={r.drug}
            className={`rounded-lg border px-3 py-2.5 ${
              r.primary ? "border-cyan/25 bg-cyan/5" : "border-line bg-panel2"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[13px] font-semibold ${
                  r.primary ? "text-fg" : "text-fgdim"
                }`}
              >
                {r.drug}
              </span>
              <span className="label text-fgmute">{r.role}</span>
            </div>
            {/* bar reflects the real predicted survival-benefit score (not a fake timeline) */}
            <div className="mt-2 flex items-center gap-2">
              <div className="track flex-1">
                <span style={{ width: `${Math.min(100, Math.max(0, r.score * 100))}%` }} />
              </div>
              <span className="tnum text-[10px] text-fgdim">{r.score.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
