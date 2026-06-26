"use client";

import type {
  AgentKey,
  Citation,
  DrugScore,
  Mutation,
  RiskAssessment,
  Trial,
  TreatmentPlan,
} from "../../lib/api";
import type { AgentState } from "../AgentStatus";

interface AgentData {
  mutations: Mutation[];
  citations: Citation[];
  drugScores: DrugScore[];
  trials: Trial[];
  risks: RiskAssessment[];
  plan: TreatmentPlan | null;
}

interface AgentRow {
  key: AgentKey;
  title: string;
  icon: string;
  source: string;
  idle: string;
  running: string;
  /** detail line + chips once data is in */
  done: (d: AgentData) => { line: string; chips?: string[] };
}

const ROWS: AgentRow[] = [
  {
    key: "genomic",
    title: "Genomic Analyzer",
    icon: "genetics",
    source: "OncoKB · ClinVar",
    idle: "Standby — awaiting parsed VCF variants.",
    running: "Annotating variants against OncoKB & cross-referencing ClinVar pathogenicity…",
    done: (d) => ({
      line: `Identified ${d.mutations.length} actionable driver${
        d.mutations.length === 1 ? "" : "s"
      } with drug annotations.`,
      chips: d.mutations
        .slice(0, 4)
        .map((m) => `${m.gene ?? "?"} ${m.variant ?? m.aa_change ?? ""}`.trim()),
    }),
  },
  {
    key: "literature",
    title: "Literature RAG",
    icon: "menu_book",
    source: "ChromaDB · BioBERT",
    idle: "Standby — vector index loaded (5,000 abstracts).",
    running: "Embedding mutation profile with BioBERT and running similarity search over PubMed…",
    done: (d) => ({
      line: `Retrieved ${d.citations.length} ranked papers on the variant profile.`,
      chips: d.citations.slice(0, 3).map((c) => `PMID: ${c.pmid ?? "—"}`),
    }),
  },
  {
    key: "outcome",
    title: "Outcome Predictor",
    icon: "monitoring",
    source: "PyTorch · local",
    idle: "Standby — scoring model warm.",
    running: "Scoring candidate drugs through the PyTorch scoring model…",
    done: (d) => {
      const top = d.drugScores[0];
      return {
        line: top
          ? `Top candidate ${top.drug} — benefit ${(
              top.survival_benefit_score ??
              top.score ??
              0
            ).toFixed(2)}.`
          : "Survival scoring complete.",
        chips: d.drugScores
          .slice(0, 3)
          .map(
            (s) =>
              `${s.drug} ${(s.survival_benefit_score ?? s.score ?? 0).toFixed(2)}`
          ),
      };
    },
  },
  {
    key: "trial",
    title: "Trial Matcher",
    icon: "clinical_notes",
    source: "ClinicalTrials.gov",
    idle: "Standby — no query dispatched.",
    running: "Querying ClinicalTrials.gov for actively recruiting trials matching the profile…",
    done: (d) => ({
      line: `${d.trials.length} recruiting trial${
        d.trials.length === 1 ? "" : "s"
      } matched and filtered.`,
      chips: d.trials.slice(0, 3).map((t) => t.nct_id ?? "NCT—"),
    }),
  },
  {
    key: "toxicity",
    title: "Toxicity Agent",
    icon: "warning",
    source: "OpenFDA FAERS",
    idle: "Standby — adverse-event API idle.",
    running: "Cross-checking OpenFDA adverse-event reports for top drugs…",
    done: (d) => ({
      line: `Risk profiled for ${d.risks.length} drug${
        d.risks.length === 1 ? "" : "s"
      }.`,
      chips: d.risks
        .slice(0, 3)
        .map((r) => `${r.drug}: ${(r.toxicity_risk ?? r.risk ?? "—").toUpperCase()}`),
    }),
  },
  {
    key: "orchestrator",
    title: "Report Generator",
    icon: "description",
    source: "gpt-oss-120b · groq",
    idle: "Standby — awaiting all sub-agent outputs.",
    running: "Synthesizing the five agent outputs into a ranked treatment plan…",
    done: (d) => ({
      line: d.plan
        ? `Plan ready — ${d.plan.top_treatments?.length ?? 0} ranked options for ${
            d.plan.patient_id
          }.`
        : "Synthesis complete.",
    }),
  },
];

function Icon({ name, size = 17 }: { name: string; size?: number }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size }}>
      {name}
    </span>
  );
}

function StatusChip({ state }: { state: AgentState }) {
  if (state === "RUNNING")
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-cyan">
        <span className="spinner" /> RUNNING
      </span>
    );
  if (state === "DONE")
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-green">
        <Icon name="check_circle" size={13} /> DONE
      </span>
    );
  if (state === "ERROR")
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-red">
        <Icon name="error" size={13} /> ERROR
      </span>
    );
  return <span className="label text-fgmute">Idle</span>;
}

function Row({ row, state, data }: { row: AgentRow; state: AgentState; data: AgentData }) {
  const done = state === "DONE" ? row.done(data) : null;
  const line =
    state === "DONE" && done
      ? done.line
      : state === "RUNNING"
        ? row.running
        : state === "ERROR"
          ? "Agent failed — degraded gracefully; downstream synthesis continues."
          : row.idle;
  const chips = state === "DONE" && done ? done.chips : undefined;

  const active = state === "RUNNING";
  const lit = state === "RUNNING" || state === "DONE";

  return (
    <div
      className={`card p-3 ${active ? "card-cyan row-in" : ""} ${
        state === "IDLE" ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`grid h-6 w-6 place-items-center rounded-md ${
              lit ? "text-cyan" : "text-fgmute"
            }`}
          >
            <Icon name={row.icon} />
          </span>
          <span className="text-[13px] font-semibold text-fg">{row.title}</span>
        </div>
        <StatusChip state={state} />
      </div>

      <p
        className={`mt-1.5 text-[12px] leading-relaxed ${
          lit ? "text-fgdim" : "text-fgmute"
        }`}
      >
        {line}
      </p>

      {chips && chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c}
              className="pill bg-cyan/10 font-mono text-[10px] text-cyan ring-1 ring-cyan/25"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5 text-[9px] tracking-wider text-fgmute uppercase">
        <span className="material-symbols-outlined" style={{ fontSize: 11 }}>
          database
        </span>
        {row.source}
      </div>
    </div>
  );
}

export function LiveActivity({
  states,
  syncing,
  ...data
}: {
  states: Record<AgentKey, AgentState>;
  syncing: boolean;
} & AgentData) {
  const doneCount = Object.values(states).filter((s) => s === "DONE").length;

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-line bg-base2/60 px-4 py-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="label tracking-[0.18em] text-fgdim">Live Activity</span>
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full bg-green opacity-60 ${
                syncing ? "blink" : ""
              }`}
            />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green" />
          </span>
          <span className="label text-green/80">{syncing ? "Syncing" : "Idle"}</span>
        </span>
      </div>
      <div className="mb-3 flex items-center gap-2">
        <div className="track flex-1">
          <span style={{ width: `${(doneCount / ROWS.length) * 100}%` }} />
        </div>
        <span className="tnum text-[10px] text-fgmute">
          {doneCount}/{ROWS.length}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto pr-1">
        {ROWS.map((row) => (
          <Row key={row.key} row={row} state={states[row.key]} data={data} />
        ))}
      </div>
    </aside>
  );
}
