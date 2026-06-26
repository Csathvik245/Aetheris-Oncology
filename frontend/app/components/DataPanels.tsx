"use client";
import { RiskBadge, ScoreBar } from "./badges";
import type {
  Mutation,
  Citation,
  DrugScore,
  Trial,
  RiskAssessment,
} from "../lib/api";

const Empty = ({ label }: { label: string }) => (
  <div className="p-2 text-[11px] text-gray">{label}</div>
);

/* ---------- Mutations table (shadcn #4, Stitch data-table style) ---------- */
export function MutationsTable({ rows }: { rows: Mutation[] }) {
  if (rows.length === 0)
    return <Empty label="// NO VARIANTS YET — AWAITING GENOMIC_COMPLETE" />;
  return (
    <table className="w-full border-collapse text-left text-[11px]">
      <thead className="bg-surfacehigh text-foreground">
        <tr>
          <th className="border-b border-r border-grid px-2 py-1 font-normal">
            GENE
          </th>
          <th className="border-b border-r border-grid px-2 py-1 font-normal">
            VARIANT
          </th>
          <th className="border-b border-r border-grid px-2 py-1 font-normal">
            ONC.
          </th>
          <th className="border-b border-r border-grid px-2 py-1 font-normal">
            EVID.
          </th>
          <th className="border-b border-grid px-2 py-1 font-normal">DRUG</th>
        </tr>
      </thead>
      <tbody className="text-onsurfacevar">
        {rows.map((m, i) => {
          const onc = String(m.oncogenic ?? "—").toUpperCase();
          const oncYes = onc === "YES" || onc === "TRUE";
          const drug = String(m.drug ?? "—");
          const hasDrug = drug !== "—" && drug.toUpperCase() !== "N/A";
          return (
            <tr
              key={i}
              className={`border-b ${
                i === 0 ? "border-cyan/30 bg-cyan/5" : "border-gray/30"
              }`}
            >
              <td
                className={`border-r border-grid px-2 py-1 ${
                  i === 0 ? "text-cyan" : ""
                }`}
              >
                {String(m.gene ?? "—")}
              </td>
              <td className="border-r border-grid px-2 py-1">
                {String(m.variant ?? m.aa_change ?? "—")}
              </td>
              <td
                className={`border-r border-grid px-2 py-1 ${
                  oncYes ? "text-red" : "text-gray"
                }`}
              >
                {onc}
              </td>
              <td className="border-r border-grid px-2 py-1 text-gray">
                {String(m.evidence ?? "—")}
              </td>
              <td className={`px-2 py-1 ${hasDrug ? "" : "text-gray"}`}>
                {drug}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ---------- Literature similarity ---------- */
export function LiteraturePanel({ rows }: { rows: Citation[] }) {
  if (rows.length === 0)
    return <Empty label="// NO CITATIONS YET — AWAITING LITERATURE_COMPLETE" />;
  return (
    <div className="flex flex-col gap-2 p-2 text-[11px]">
      {rows.map((c, i) => {
        const sim =
          typeof c.similarity === "number"
            ? c.similarity
            : typeof c.score === "number"
              ? c.score
              : undefined;
        return (
          <div key={i} className="flex items-center gap-2">
            <span
              className={`w-24 shrink-0 truncate underline ${
                i === 0 ? "text-cyan" : "text-foreground"
              }`}
              title={String(c.title ?? "")}
            >
              PMID {String(c.pmid ?? "—")}
            </span>
            <ScoreBar
              value={sim ?? 0}
              max={1}
              label={sim !== undefined ? sim.toFixed(2).replace(/^0/, "") : "—"}
              fill={i === 0 ? "bg-cyan" : "bg-gray"}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Survival benefit scores ---------- */
export function DrugScores({ rows }: { rows: DrugScore[] }) {
  const norm = rows
    .map((d) => ({
      drug: String(d.drug ?? "—"),
      score:
        typeof d.survival_benefit_score === "number"
          ? d.survival_benefit_score
          : typeof d.score === "number"
            ? d.score
            : 0,
    }))
    .sort((a, b) => b.score - a.score);
  const max = Math.max(1, ...norm.map((d) => d.score));

  if (norm.length === 0)
    return <Empty label="// NO SCORES YET — AWAITING OUTCOME_COMPLETE" />;
  return (
    <div className="flex flex-col gap-2 p-2 text-[11px]">
      {norm.map((d, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex justify-between">
            <span>
              <span className="text-gray">
                {String(i + 1).padStart(2, "0")}{" "}
              </span>
              {d.drug}
            </span>
            <span className="tabular-nums text-cyan">{d.score.toFixed(3)}</span>
          </div>
          <ScoreBar value={d.score} max={max} fill={i === 0 ? "bg-cyan" : "bg-gray"} />
        </div>
      ))}
    </div>
  );
}

/* ---------- Clinical trials ---------- */
export function TrialsPanel({ rows }: { rows: Trial[] }) {
  if (rows.length === 0)
    return <Empty label="// NO TRIALS YET — AWAITING TRIAL_COMPLETE" />;
  return (
    <div className="flex flex-col gap-2 p-2 text-[11px]">
      {rows.map((t, i) => {
        const status = String(t.status ?? "").toUpperCase();
        return (
          <div
            key={i}
            className="bg-surfacelowest term-border p-2"
          >
            <div className="mb-1 flex items-start justify-between">
              <span className="text-[14px] text-cyan underline">
                {String(t.nct_id ?? "NCT—")}
              </span>
              {status && (
                <span className="bg-term-green px-1 text-[10px] text-black">
                  {status}
                </span>
              )}
            </div>
            <p className="leading-tight text-onsurfacevar">
              {String(t.title ?? "(UNTITLED TRIAL)").toUpperCase()}
            </p>
            {t.phase && (
              <div className="mt-1 text-[10px] text-gray">
                PHASE: {String(t.phase)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Toxicity profile ---------- */
export function ToxicityPanel({ rows }: { rows: RiskAssessment[] }) {
  if (rows.length === 0)
    return <Empty label="// NO RISK DATA YET — AWAITING TOXICITY_COMPLETE" />;
  return (
    <div className="flex flex-col gap-2 p-2 text-[11px]">
      {rows.map((r, i) => {
        const ae = Array.isArray(r.adverse_events) ? r.adverse_events : [];
        return (
          <div key={i} className="term-border p-2">
            <div className="flex items-center justify-between">
              <span className="font-600 text-foreground">
                {String(r.drug ?? "—").toUpperCase()}
              </span>
              <RiskBadge risk={String(r.toxicity_risk ?? r.risk ?? "")} />
            </div>
            {ae.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {ae.map((a, j) => (
                  <span
                    key={j}
                    className="border border-grid px-1 text-[10px] text-gray"
                  >
                    {String(a).toUpperCase()}
                  </span>
                ))}
              </div>
            )}
            {r.notes && (
              <div className="mt-1 text-[10px] text-gray">
                {String(r.notes).toUpperCase()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
