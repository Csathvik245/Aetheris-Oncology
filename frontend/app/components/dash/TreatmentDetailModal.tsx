"use client";

import { useEffect } from "react";
import type { Treatment } from "../../lib/api";

export interface EnrichedTreatment extends Treatment {
  adverse_events?: string[];
  interaction_flags?: string[];
  mechanism?: string;
}

/* ---- shared tone helpers (reused by the outcome cards) ---- */
export function riskTone(risk?: string): { text: string; ring: string; bg: string } {
  switch ((risk || "").toUpperCase()) {
    case "HIGH":
      return { text: "text-red", ring: "ring-red/40", bg: "bg-red/10" };
    case "MODERATE":
      return { text: "text-amber", ring: "ring-amber/40", bg: "bg-amber/10" };
    default:
      return { text: "text-green", ring: "ring-green/40", bg: "bg-green/10" };
  }
}

export function evidenceLabel(level?: string): string {
  switch ((level || "").toUpperCase()) {
    case "LEVEL_1":
      return "FDA-approved";
    case "LEVEL_2":
      return "Standard care";
    case "LEVEL_3":
      return "Clinical evidence";
    case "LEVEL_4":
      return "Biological evidence";
    default:
      return level || "Unscored";
  }
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size }}>
      {name}
    </span>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-line pt-4">
      <div className="mb-2 flex items-center gap-2 text-cyan">
        <Icon name={icon} size={16} />
        <span className="label tracking-[0.16em] text-cyan/80">{title}</span>
      </div>
      {children}
    </div>
  );
}

export function TreatmentDetailModal({
  item,
  patientId,
  onClose,
}: {
  item: EnrichedTreatment;
  patientId: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tone = riskTone(item.toxicity_risk);
  const score = item.survival_benefit_score ?? 0;
  const citations = item.supporting_citations ?? [];
  const adverse = item.adverse_events ?? [];
  const flags = item.interaction_flags ?? [];

  return (
    <div
      className="overlay-in fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="sheet-in card card-cyan flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-start justify-between border-b border-line bg-base2/60 p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan/12 font-mono text-[13px] font-bold text-cyan ring-1 ring-cyan/30">
              #{item.rank}
            </span>
            <div>
              <h2 className="font-display text-[18px] font-semibold text-fg">
                {item.drug}
              </h2>
              <div className="label mt-0.5">
                Recommended regimen · Patient {patientId}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md border border-line text-fgdim hover:text-cyan"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* body */}
        <div className="flex flex-col gap-4 overflow-auto p-5">
          {/* survival headline */}
          <div className="rounded-xl border border-cyan/20 bg-cyan/[0.04] p-4">
            <div className="flex items-end justify-between">
              <span className="label">Match Confidence</span>
              <span className="tnum text-[28px] font-bold leading-none text-green text-glow">
                {score.toFixed(2)}
              </span>
            </div>
            <div className="track mt-3 h-2">
              <span style={{ width: `${Math.min(100, score * 100)}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-fgmute">
              <span>0.00 · low</span>
              <span>1.00 · high</span>
            </div>
          </div>

          {/* quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-line bg-panel2 p-3">
              <div className="label">Evidence</div>
              <div className="mt-1 text-[13px] font-semibold text-cyan">
                {item.evidence_level || "—"}
              </div>
              <div className="text-[10px] text-fgmute">
                {evidenceLabel(item.evidence_level)}
              </div>
            </div>
            <div className="rounded-lg border border-line bg-panel2 p-3">
              <div className="label">Toxicity</div>
              <div className={`mt-1 text-[13px] font-semibold ${tone.text}`}>
                {(item.toxicity_risk || "LOW").toUpperCase()}
              </div>
              <div className="text-[10px] text-fgmute">Risk class</div>
            </div>
            <div className="rounded-lg border border-line bg-panel2 p-3">
              <div className="label">Citations</div>
              <div className="mt-1 text-[13px] font-semibold text-fg">
                {citations.length}
              </div>
              <div className="text-[10px] text-fgmute">PubMed refs</div>
            </div>
          </div>

          {item.mechanism && (
            <Section icon="biotech" title="Mechanism">
              <p className="text-[13px] leading-relaxed text-fgdim">
                {item.mechanism}
              </p>
            </Section>
          )}

          {/* literature */}
          <Section icon="menu_book" title="Supporting Literature">
            {citations.length ? (
              <div className="flex flex-wrap gap-1.5">
                {citations.map((c) => (
                  <a
                    key={String(c)}
                    href={`https://pubmed.ncbi.nlm.nih.gov/${c}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="pill bg-cyan/10 font-mono text-[10px] text-cyan ring-1 ring-cyan/25 hover:bg-cyan/20"
                  >
                    PMID: {String(c)}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-fgmute">No citations linked.</p>
            )}
          </Section>

          {/* trial */}
          <Section icon="clinical_notes" title="Matching Clinical Trial">
            {item.matching_trial ? (
              <div className="rounded-lg border border-line bg-panel2 p-3">
                <div className="flex items-center gap-2">
                  <span className="pill bg-purple/15 font-mono text-[10px] text-purple ring-1 ring-purple/30">
                    {item.matching_trial.nct_id}
                  </span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-fgdim">
                  {item.matching_trial.title}
                </p>
              </div>
            ) : (
              <p className="text-[12px] text-fgmute">
                No actively recruiting trial matched this regimen.
              </p>
            )}
          </Section>

          {/* toxicity detail */}
          <Section icon="warning" title="Toxicity & Safety">
            <div className={`rounded-lg p-3 ring-1 ${tone.bg} ${tone.ring}`}>
              <div className="flex items-center gap-2">
                <span className={`pill ${tone.bg} ${tone.text} ring-1 ${tone.ring}`}>
                  {(item.toxicity_risk || "LOW").toUpperCase()} RISK
                </span>
              </div>
              {item.toxicity_notes && (
                <p className="mt-2 text-[13px] leading-relaxed text-fgdim">
                  {item.toxicity_notes}
                </p>
              )}
            </div>
            {adverse.length > 0 && (
              <div className="mt-3">
                <div className="label mb-1.5">Reported Adverse Events</div>
                <div className="flex flex-wrap gap-1.5">
                  {adverse.slice(0, 12).map((a) => (
                    <span
                      key={a}
                      className="pill bg-amber/10 text-[10px] text-amber ring-1 ring-amber/25"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {flags.length > 0 && (
              <div className="mt-3">
                <div className="label mb-1.5">Interaction Flags</div>
                <div className="flex flex-wrap gap-1.5">
                  {flags.map((f) => (
                    <span
                      key={f}
                      className="pill bg-red/10 text-[10px] text-red ring-1 ring-red/25"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between border-t border-line bg-base2/60 px-5 py-3">
          <span className="label">Synthesis · multi-agent orchestrator</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-cyan px-4 py-1.5 text-[12px] font-semibold text-black hover:scale-[1.02]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
