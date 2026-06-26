"use client";

import { useMemo, useState } from "react";
import type { AgentCard, Trial } from "../../lib/api";
import { Modal, Icon } from "./Modal";

/* ---------- shared shell ---------- */
function ViewShell({
  title,
  count,
  search,
  onSearch,
  placeholder,
  children,
}: {
  title: string;
  count: string;
  search?: string;
  onSearch?: (v: string) => void;
  placeholder?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[18px] font-semibold text-fg">{title}</h1>
          <div className="label mt-0.5">{count}</div>
        </div>
        {onSearch && (
          <div className="flex h-9 w-72 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-fgmute">
            <Icon name="search" size={18} />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent text-[13px] text-fgdim placeholder:text-fgmute focus:outline-none"
            />
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  const tone =
    s.includes("ACTIVE") || s.includes("RECRUIT")
      ? "text-green ring-green/30 bg-green/10"
      : s.includes("REVIEW") || s.includes("PENDING")
        ? "text-amber ring-amber/30 bg-amber/10"
        : "text-fgdim ring-line2 bg-panel2";
  return <span className={`pill ring-1 ${tone}`}>{status}</span>;
}

/* ================= PATIENTS ================= */
interface PatientRow {
  id: string;
  diagnosis: string;
  variant: string;
  stage: string;
  status: string;
  updated: string;
}

const BASE_PATIENTS: PatientRow[] = [
  { id: "PNT-9982", diagnosis: "Metastatic Adenocarcinoma", variant: "BRAF V600E", stage: "IV-B", status: "In Treatment", updated: "2h ago" },
  { id: "PNT-8821", diagnosis: "Lung Adenocarcinoma", variant: "EGFR L858R", stage: "III-A", status: "Under Review", updated: "5h ago" },
  { id: "PNT-7715", diagnosis: "Colorectal Carcinoma", variant: "KRAS G12C", stage: "IV-A", status: "In Treatment", updated: "1d ago" },
  { id: "PNT-6620", diagnosis: "Melanoma", variant: "BRAF V600K", stage: "III-C", status: "Remission", updated: "3d ago" },
  { id: "PNT-5540", diagnosis: "Breast Carcinoma", variant: "PIK3CA H1047R", stage: "II-B", status: "Under Review", updated: "4d ago" },
];

export function PatientsView({
  search,
  onSearch,
  live,
}: {
  search: string;
  onSearch: (v: string) => void;
  live?: PatientRow | null;
}) {
  const [selected, setSelected] = useState<PatientRow | null>(null);
  const rows = useMemo(() => {
    const all = live ? [live, ...BASE_PATIENTS.filter((p) => p.id !== live.id)] : BASE_PATIENTS;
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((p) =>
      [p.id, p.diagnosis, p.variant, p.stage, p.status].some((f) =>
        f.toLowerCase().includes(q)
      )
    );
  }, [search, live]);

  return (
    <ViewShell
      title="Patient Records"
      count={`${rows.length} patient${rows.length === 1 ? "" : "s"}`}
      search={search}
      onSearch={onSearch}
      placeholder="Search by ID, diagnosis, variant..."
    >
      <div className="card overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-fgmute">
              {["Patient ID", "Diagnosis", "Driver Variant", "Stage", "Status", "Updated", ""].map(
                (h) => (
                  <th key={h} className="label px-4 py-2.5 font-semibold">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.id}
                className="border-b border-line/60 transition-colors last:border-0 hover:bg-cyan/[0.04]"
              >
                <td className="px-4 py-3 font-mono font-semibold text-cyan">{p.id}</td>
                <td className="px-4 py-3 text-fg">{p.diagnosis}</td>
                <td className="px-4 py-3">
                  <span className="pill bg-cyan/10 font-mono text-cyan ring-1 ring-cyan/25">
                    {p.variant}
                  </span>
                </td>
                <td className="px-4 py-3 tnum text-fgdim">{p.stage}</td>
                <td className="px-4 py-3">
                  <StatusPill status={p.status} />
                </td>
                <td className="px-4 py-3 text-fgmute">{p.updated}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setSelected(p)}
                    className="rounded-md border border-line px-2.5 py-1 text-[11px] text-fgdim hover:border-cyan/40 hover:text-cyan"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-fgmute">
                  No patients match “{search}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal
          title={selected.id}
          subtitle={selected.diagnosis}
          icon="folder_shared"
          onClose={() => setSelected(null)}
        >
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Driver Variant", selected.variant],
              ["Stage", selected.stage],
              ["Status", selected.status],
              ["Last Updated", selected.updated],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-line bg-panel2 p-3">
                <div className="label">{k}</div>
                <div className="mt-1 text-[13px] font-semibold text-fg">{v}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-fgmute">
            Full genomic report and treatment history available from the Orchestrator
            dashboard once an analysis is run for this patient.
          </p>
        </Modal>
      )}
    </ViewShell>
  );
}

/* ================= TRIALS ================= */
const BASE_TRIALS: Trial[] = [
  { nct_id: "NCT03970447", title: "Temozolomide + Radiotherapy in Newly Diagnosed Glioblastoma", phase: "Phase 3", status: "RECRUITING", eligibility_summary: "Newly diagnosed IDH-wildtype glioblastoma." },
  { nct_id: "NCT04164901", title: "Vorasidenib in IDH-Mutant Low-Grade Glioma (INDIGO)", phase: "Phase 3", status: "RECRUITING", eligibility_summary: "Residual/recurrent grade-2 IDH-mutant glioma." },
  { nct_id: "NCT02034110", title: "Dabrafenib + Trametinib in BRAF V600-Mutant Melanoma", phase: "Phase 3", status: "RECRUITING", eligibility_summary: "Unresectable/metastatic BRAF V600-mutant melanoma." },
  { nct_id: "NCT03600883", title: "Sotorasib in KRAS G12C-Mutated Advanced Solid Tumors", phase: "Phase 2", status: "RECRUITING", eligibility_summary: "Advanced KRAS G12C-mutant solid tumors." },
  { nct_id: "NCT02296125", title: "Osimertinib in EGFR-Mutant NSCLC", phase: "Phase 3", status: "RECRUITING", eligibility_summary: "EGFR sensitizing mutation, advanced NSCLC." },
];

export function TrialsView({
  search,
  onSearch,
  liveTrials,
}: {
  search: string;
  onSearch: (v: string) => void;
  liveTrials: Trial[];
}) {
  const rows = useMemo(() => {
    const merged: Trial[] = [...liveTrials];
    const seen = new Set(merged.map((t) => t.nct_id));
    for (const t of BASE_TRIALS) if (!seen.has(t.nct_id)) merged.push(t);
    const q = search.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter((t) =>
      [t.nct_id, t.title, t.phase, t.status].some((f) =>
        (f ?? "").toLowerCase().includes(q)
      )
    );
  }, [search, liveTrials]);

  return (
    <ViewShell
      title="Clinical Trials"
      count={`${rows.length} trials`}
      search={search}
      onSearch={onSearch}
      placeholder="Search by NCT, title, phase..."
    >
      <div className="flex flex-col gap-3">
        {rows.map((t) => (
          <a
            key={t.nct_id}
            href={`https://clinicaltrials.gov/study/${t.nct_id}`}
            target="_blank"
            rel="noreferrer"
            className="lift card flex items-center justify-between gap-4 p-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="pill bg-purple/15 font-mono text-purple ring-1 ring-purple/30">
                  {t.nct_id}
                </span>
                <StatusPill status={t.status ?? "RECRUITING"} />
                <span className="label">{t.phase}</span>
              </div>
              <div className="mt-2 truncate text-[13px] font-medium text-fg">{t.title}</div>
              <div className="mt-0.5 truncate text-[12px] text-fgmute">
                {t.eligibility_summary}
              </div>
            </div>
            <Icon name="open_in_new" />
          </a>
        ))}
        {rows.length === 0 && (
          <div className="card p-10 text-center text-fgmute">No trials match “{search}”.</div>
        )}
      </div>
    </ViewShell>
  );
}

/* ================= AGENT ORCHESTRATION ================= */
export function AgentsView({ cards }: { cards: AgentCard[] }) {
  return (
    <ViewShell title="Agent Orchestration" count={`${cards.length} registered agents · A2A registry`}>
      {cards.length === 0 ? (
        <div className="card p-10 text-center text-fgmute">
          Backend offline — agent registry unavailable. Start the API on :8000 to load cards.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {cards.map((c) => (
            <div key={c.name} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-cyan/12 text-cyan ring-1 ring-cyan/25">
                    <Icon name="smart_toy" size={16} />
                  </span>
                  <span className="text-[13px] font-semibold text-fg">{c.name}</span>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] text-green">
                  <span className="h-1.5 w-1.5 rounded-full bg-green" /> v{c.version}
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-fgdim">{c.description}</p>
              {c.capabilities?.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {c.capabilities.map((cap) => (
                    <span key={cap} className="pill bg-panel2 text-[10px] text-fgdim ring-1 ring-line2">
                      {cap}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5">
                <span className="label">Sources</span>
                {c.data_sources?.map((d) => (
                  <span key={d} className="pill bg-cyan/10 text-[10px] text-cyan ring-1 ring-cyan/25">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </ViewShell>
  );
}
