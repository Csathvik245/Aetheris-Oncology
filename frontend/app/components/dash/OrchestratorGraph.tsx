"use client";

import type { AgentKey } from "../../lib/api";
import type { AgentState } from "../AgentStatus";

type NodeKey = AgentKey | "vcf";

interface NodeDef {
  key: NodeKey;
  label: string;
  icon: string;
  x: number; // %
  y: number; // %
}

// Layout mirrors the Aetheris reference: VCF top, two analyzers upper flanks,
// Core Nexus center, predictor / matcher lower flanks, report at the base.
const NODES: NodeDef[] = [
  { key: "vcf", label: "VCF Parser", icon: "biotech", x: 50, y: 13 },
  { key: "genomic", label: "Genomic Analyzer", icon: "genetics", x: 22, y: 32 },
  { key: "literature", label: "Literature RAG", icon: "menu_book", x: 78, y: 32 },
  { key: "outcome", label: "Outcome Predictor", icon: "monitoring", x: 28, y: 82 },
  { key: "trial", label: "Trial Matcher", icon: "clinical_notes", x: 72, y: 80 },
  { key: "orchestrator", label: "Report Gen", icon: "description", x: 50, y: 92 },
];

const CENTER = { x: 50, y: 52 };

function stateOf(
  node: NodeKey,
  states: Record<AgentKey, AgentState>,
  hasFile: boolean
): AgentState {
  if (node === "vcf") return hasFile ? "DONE" : "IDLE";
  return states[node];
}

function nodeClasses(st: AgentState): string {
  switch (st) {
    case "RUNNING":
      return "node-active border-cyan/80 text-cyan bg-cyan/5";
    case "DONE":
      return "border-cyan/45 text-cyan bg-panel2";
    case "ERROR":
      return "border-red/70 text-red bg-red/5";
    default:
      return "border-line2 text-fgmute bg-panel";
  }
}

function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size }}>
      {name}
    </span>
  );
}

export function OrchestratorGraph({
  states,
  hasFile,
  running,
}: {
  states: Record<AgentKey, AgentState>;
  hasFile: boolean;
  running: boolean;
}) {
  const anyError = Object.values(states).includes("ERROR");
  // the constellation "forms" as agents resolve; phase narrates that
  const phase = anyError
    ? "Signal interrupted"
    : states.orchestrator === "DONE"
      ? "Constellation formed"
      : running
        ? "Forming constellation…"
        : hasFile
          ? "Linking nodes…"
          : "Awaiting analysis";

  return (
    <div className="relative h-full w-full">
      {/* connectors */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <radialGradient id="nexusGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,255,229,0.18)" />
            <stop offset="100%" stopColor="rgba(0,255,229,0)" />
          </radialGradient>
        </defs>
        {/* faint guide lattice — the latent constellation, always hinted */}
        {NODES.map((n) => (
          <line
            key={`guide-${n.key}`}
            x1={`${CENTER.x}%`}
            y1={`${CENTER.y}%`}
            x2={`${n.x}%`}
            y2={`${n.y}%`}
            stroke="rgba(108,123,143,0.14)"
            strokeWidth={1}
          />
        ))}
        {/* draw-in edges — each lights from the nexus outward as its agent
            resolves, so the constellation forms in pipeline sequence */}
        {NODES.map((n) => {
          const st = stateOf(n.key, states, hasFile);
          const drawn = st === "DONE";
          const reaching = st === "RUNNING";
          const err = st === "ERROR";
          return (
            <line
              key={`edge-${n.key}`}
              x1={`${CENTER.x}%`}
              y1={`${CENTER.y}%`}
              x2={`${n.x}%`}
              y2={`${n.y}%`}
              pathLength={1}
              stroke={err ? "rgba(255,93,108,0.8)" : "rgba(0,255,229,0.75)"}
              strokeWidth={1.4}
              strokeLinecap="round"
              style={{
                strokeDasharray: "1 1",
                strokeDashoffset: drawn || err ? 0 : reaching ? 0.4 : 1,
                opacity: st === "IDLE" ? 0 : 1,
                transition:
                  "stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1), opacity 0.45s ease, stroke 0.3s ease",
              }}
            />
          );
        })}
      </svg>

      {/* constellation label — frames the graph without altering layout */}
      <div className="pointer-events-none absolute left-4 top-3 z-10">
        <div className="label text-fgmute">Agent Constellation</div>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-cyan/70 uppercase">
          <span
            className={`h-1 w-1 rounded-full ${
              anyError
                ? "bg-red"
                : running
                  ? "bg-cyan blink"
                  : states.orchestrator === "DONE"
                    ? "bg-cyan"
                    : "bg-fgmute"
            }`}
          />
          {phase}
        </div>
      </div>

      {/* center glow plate */}
      <div
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${CENTER.x}%`, top: `${CENTER.y}%`, width: 360, height: 360 }}
      >
        <svg viewBox="0 0 360 360" className="h-full w-full">
          <circle cx="180" cy="180" r="180" fill="url(#nexusGlow)" />
        </svg>
      </div>

      {/* outer nodes */}
      {NODES.map((n) => {
        const st = stateOf(n.key, states, hasFile);
        return (
          <div
            key={n.key}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <div
              className={`grid h-16 w-16 place-items-center rounded-full border transition-colors ${nodeClasses(
                st
              )}`}
            >
              <Icon name={n.icon} />
            </div>
            <span
              className={`label text-center ${
                st === "RUNNING" || st === "DONE" ? "text-cyan/80" : "text-fgmute"
              }`}
            >
              {n.label}
            </span>
          </div>
        );
      })}

      {/* core nexus */}
      <div
        className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
        style={{ left: `${CENTER.x}%`, top: `${CENTER.y}%` }}
      >
        <div className="relative grid h-28 w-28 place-items-center">
          {running && (
            <>
              <span className="nexus-ring absolute inset-0 rounded-full border border-cyan/60" />
              <span
                className="nexus-ring absolute inset-0 rounded-full border border-cyan/40"
                style={{ animationDelay: "0.9s" }}
              />
            </>
          )}
          <span className="spin-slow absolute inset-1 rounded-full border border-dashed border-cyan/25" />
          <div className="glow-cyan grid h-24 w-24 place-items-center rounded-full border border-cyan/60 bg-base2">
            <span className="material-symbols-outlined text-cyan text-glow" style={{ fontSize: 34 }}>
              hub
            </span>
          </div>
          <span className="absolute -top-1 right-3 h-2 w-2 rounded-full bg-cyan text-glow" />
        </div>
        <span className="label mt-3 text-cyan/80">Core Nexus</span>
      </div>
    </div>
  );
}
