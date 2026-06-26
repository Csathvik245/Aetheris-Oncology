"use client";
import { EvidenceBadge, ToxicityRiskBar } from "./badges";
import type { Treatment, TreatmentPlan } from "../lib/api";

const RISK_TEXT: Record<string, string> = {
  LOW: "text-term-green",
  MODERATE: "text-amber",
  MED: "text-amber",
  HIGH: "text-red",
};

function scoreColor(rank: number): string {
  return rank === 1
    ? "text-term-green"
    : rank === 2
      ? "text-amber"
      : "text-onsurfacevar";
}

function TreatmentRow({ t }: { t: Treatment }) {
  const top = t.rank === 1;
  const riskText = RISK_TEXT[(t.toxicity_risk || "").toUpperCase()] || "text-gray";
  const refs = (t.supporting_citations || []).map(String);

  return (
    <div
      className={`flex flex-col gap-2 p-2 ${
        top ? "term-border-active bg-cyan/5" : "term-border"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-[18px] font-600 ${
              top ? "bg-cyan text-black" : "bg-surfacehigh text-foreground"
            }`}
          >
            #{t.rank}
          </span>
          <span
            className={`text-[18px] font-600 tracking-[0.05em] ${
              top ? "text-cyan" : "text-foreground"
            }`}
          >
            {t.drug.toUpperCase()}
          </span>
        </div>
        <div className="text-right">
          <span className="uplabel block text-[10px] text-gray">
            SURVIVAL SCORE
          </span>
          <span
            className={`block text-[18px] font-600 tabular-nums ${scoreColor(
              t.rank
            )}`}
          >
            {Number(t.survival_benefit_score).toFixed(3)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-[11px] text-foreground">
        <div>
          <span className="text-gray">EVIDENCE:</span>{" "}
          <EvidenceBadge level={t.evidence_level} />
        </div>
        <div>
          <span className="text-gray">REFS:</span>{" "}
          {refs.length ? (
            refs.map((p, i) => (
              <span key={i} className="text-cyan">
                {i > 0 ? ", " : ""}PMID {p}
              </span>
            ))
          ) : (
            <span className="text-gray">NONE</span>
          )}
        </div>
        <div>
          <span className="text-gray">TRIAL:</span>{" "}
          {t.matching_trial ? (
            <span className="text-cyan underline">
              {t.matching_trial.nct_id}
            </span>
          ) : (
            <span className="text-gray">NONE MATCHED</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-gray/30 pt-1 text-[11px]">
        <span className="text-gray">TOXICITY RISK:</span>
        <ToxicityRiskBar risk={t.toxicity_risk} />
        <span className={riskText}>
          {(t.toxicity_risk || "—").toUpperCase()}
          {t.toxicity_notes ? ` (${t.toxicity_notes.toUpperCase()})` : ""}
        </span>
      </div>
    </div>
  );
}

export function TreatmentPlanCards({ plan }: { plan: TreatmentPlan | null }) {
  if (!plan)
    return (
      <div className="p-3 text-[11px] text-gray">
        {
          "// FINAL RANKED TREATMENT PLAN RENDERS HERE ONCE THE ORCHESTRATOR SYNTHESIZES ALL AGENT OUTPUTS."
        }
      </div>
    );

  const attr = plan.model_attribution;
  const subAgents = Array.isArray(attr?.sub_agents)
    ? attr?.sub_agents.join(", ")
    : attr?.sub_agents;

  return (
    <div className="flex flex-col gap-2 p-2">
      {plan.top_treatments.map((t) => (
        <TreatmentRow key={t.rank} t={t} />
      ))}

      {attr && (
        <div className="border-t border-grid pt-2 text-[10px] text-gray">
          <span className="uplabel text-cyan">MODEL ATTRIBUTION</span>{" "}
          <span className="ml-2">
            ORCHESTRATOR=
            <span className="text-foreground">{attr.orchestrator ?? "—"}</span>
            {"  "}SUB_AGENTS=
            <span className="text-foreground">{subAgents ?? "—"}</span>
            {"  "}EMBEDDING=
            <span className="text-foreground">{attr.embedding ?? "—"}</span>
            {"  "}SURVIVAL_MODEL=
            <span className="text-foreground">{attr.survival_model ?? "—"}</span>
          </span>
        </div>
      )}
    </div>
  );
}
