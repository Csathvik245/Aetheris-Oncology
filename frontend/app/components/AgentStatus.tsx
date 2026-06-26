"use client";
import type { AgentKey } from "../lib/api";

/**
 * shadcn-style status badge component (#3 of the four shadcn pieces),
 * hand-written in the Stitch terminal style. Rendered as the AGENT STATUS
 * panel in the left column.
 */
export type AgentState = "IDLE" | "RUNNING" | "DONE" | "ERROR";

export const AGENT_ORDER: { key: AgentKey; label: string }[] = [
  { key: "genomic", label: "GENOMIC" },
  { key: "literature", label: "LITERATURE" },
  { key: "outcome", label: "OUTCOME" },
  { key: "trial", label: "TRIAL" },
  { key: "toxicity", label: "TOXICITY" },
];

function StatusChip({ state }: { state: AgentState }) {
  if (state === "RUNNING")
    return (
      <span className="border border-cyan bg-cyan px-2 py-0.5 text-black pulse-cyan">
        RUNNING
      </span>
    );
  if (state === "DONE")
    return (
      <span className="border border-term-green px-2 py-0.5 text-term-green">
        DONE
      </span>
    );
  if (state === "ERROR")
    return (
      <span className="border border-red px-2 py-0.5 text-red">ERROR</span>
    );
  return (
    <span className="term-border px-2 py-0.5 text-gray">IDLE</span>
  );
}

export function AgentStatusBadges({
  states,
}: {
  states: Record<AgentKey, AgentState>;
}) {
  const orch = states.orchestrator;
  const orchActive = orch === "RUNNING" || orch === "DONE";

  return (
    <div className="flex flex-col gap-2 p-2 text-[12px]">
      {AGENT_ORDER.map(({ key, label }) => {
        const s = states[key];
        const labelCls =
          s === "IDLE" ? "text-surfacehigh" : "text-foreground";
        return (
          <div key={key} className="flex items-center justify-between">
            <span className={labelCls}>{label}</span>
            <StatusChip state={s} />
          </div>
        );
      })}

      <div className="mt-4 flex items-center justify-between border-t border-grid pt-2">
        <span className="text-[18px] font-600 tracking-[0.05em] text-foreground">
          ORCHESTRATOR
        </span>
        {orch === "ERROR" ? (
          <span className="border border-red px-2 py-0.5 text-red">ERROR</span>
        ) : orch === "RUNNING" ? (
          <span className="border border-cyan bg-cyan px-2 py-0.5 text-black pulse-cyan">
            ACTIVE
          </span>
        ) : (
          <span
            className={`bg-surfacehigh term-border px-2 py-0.5 ${
              orchActive ? "text-cyan" : "text-foreground"
            }`}
          >
            {orch === "DONE" ? "DONE" : "ACTIVE"}
          </span>
        )}
      </div>
    </div>
  );
}
