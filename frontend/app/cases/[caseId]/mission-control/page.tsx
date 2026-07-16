"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Dna,
  BookOpen,
  LineChart,
  ClipboardList,
  ShieldAlert,
  Share2,
  ChevronRight,
} from "lucide-react";
import { Shell } from "../../../components/shell/Shell";
import { Card } from "@/components/ui/card";
import type { AgentKey } from "../../../lib/api";
import { useAgentPipeline, type AgentState } from "../../../lib/useAgentPipeline";
import { getPacket } from "../../../lib/mock";

const AGENT_META: Record<
  AgentKey,
  { label: string; icon: typeof Dna; x: number; y: number; startMsg: string; liveTag: string }
> = {
  genomic: { label: "Genomic Agent", icon: Dna, x: 50, y: 12, startMsg: "Analyzing VCF for actionable mutations…", liveTag: "LIVE STREAM" },
  literature: { label: "Literature Agent", icon: BookOpen, x: 87, y: 36, startMsg: "Scanning PubMed abstracts via ChromaDB…", liveTag: "INDEXING SOURCES" },
  trial: { label: "Trial Agent", icon: ClipboardList, x: 74, y: 86, startMsg: "Matching clinical trials on ClinicalTrials.gov…", liveTag: "QUERYING REGISTRY" },
  toxicity: { label: "Toxicity Agent", icon: ShieldAlert, x: 26, y: 86, startMsg: "Cross-checking OpenFDA adverse events…", liveTag: "MODELING RISK" },
  outcome: { label: "Outcome Agent", icon: LineChart, x: 13, y: 36, startMsg: "Running PyTorch survival model…", liveTag: "SIMULATING OUTCOME" },
  orchestrator: { label: "Orchestrator", icon: Share2, x: 50, y: 50, startMsg: "", liveTag: "" },
};

const SATELLITES: AgentKey[] = ["genomic", "literature", "trial", "toxicity", "outcome"];

function useSimulatedProgress(states: Record<AgentKey, AgentState>) {
  const [progress, setProgress] = useState<Record<AgentKey, number>>(
    Object.fromEntries(SATELLITES.map((k) => [k, 0])) as Record<AgentKey, number>
  );
  useEffect(() => {
    const id = setInterval(() => {
      setProgress((prev) => {
        const next = { ...prev };
        for (const k of SATELLITES) {
          if (states[k] === "DONE") next[k] = 100;
          else if (states[k] === "RUNNING") next[k] = Math.min(92, prev[k] + Math.random() * 9);
          else if (states[k] === "IDLE") next[k] = 0;
        }
        return next;
      });
    }, 450);
    return () => clearInterval(id);
  }, [states]);
  return progress;
}

function Ring({ percent, state }: { percent: number; state: AgentState }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const color = state === "ERROR" ? "var(--destructive)" : state === "DONE" ? "var(--teal)" : "var(--navy)";
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="shrink-0 -rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * percent) / 100}
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
    </svg>
  );
}

export default function MissionControlPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);
  const packet = getPacket(caseId);
  const pipeline = useAgentPipeline();
  const progress = useSimulatedProgress(pipeline.states);
  const triggeredRef = useRef(false);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    (async () => {
      try {
        const res = await fetch("/demo_patient.vcf");
        const blob = await res.blob();
        const file = new File([blob], "demo_patient.vcf", { type: "text/plain" });
        pipeline.runFile(file);
      } catch {
        /* backend/demo file unavailable — UI still renders idle state */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (!pipeline.startedAt.current) return;
      const s = Math.floor((Date.now() - pipeline.startedAt.current) / 1000);
      const hh = String(Math.floor(s / 3600)).padStart(2, "0");
      const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      setElapsed(`${hh}:${mm}:${ss}`);
    }, 1000);
    return () => clearInterval(id);
  }, [pipeline.startedAt]);

  useEffect(() => {
    timelineRef.current?.scrollTo({ top: timelineRef.current.scrollHeight, behavior: "smooth" });
  }, [pipeline.events]);

  const statusPill = pipeline.anyError
    ? "Pipeline Error"
    : pipeline.complete
      ? "Protocol Draft Ready"
      : pipeline.running
        ? "Generating Protocol Draft…"
        : "Awaiting Case Data";

  const phaseLabel = pipeline.anyError
    ? "Signal interrupted"
    : pipeline.complete
      ? "Synthesis complete"
      : pipeline.running
        ? "Synthesis in Progress"
        : "Preparing agent constellation…";

  return (
    <Shell breadcrumb="Mission Control">
      <div className="mx-auto flex h-full max-w-6xl flex-col px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-[20px] font-bold text-foreground">Mission Control</h1>
            <p className="text-[12.5px] text-muted-foreground">{packet.displayId} — multi-agent case analysis</p>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-teal-ring bg-teal-tint px-3 py-1.5 text-[11.5px] font-semibold text-teal-deep">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-teal-deep" />
            {pipeline.online === false ? "Backend Offline" : "Multi-Agent Active"}
          </span>
        </div>

        {/* radial constellation */}
        <Card className="relative min-h-[440px] flex-1 overflow-hidden p-0">
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            {SATELLITES.map((k) => {
              const n = AGENT_META[k];
              const st = pipeline.states[k];
              const active = st === "RUNNING" || st === "DONE";
              return (
                <line
                  key={k}
                  x1="50%"
                  y1="50%"
                  x2={`${n.x}%`}
                  y2={`${n.y}%`}
                  stroke={st === "ERROR" ? "var(--destructive)" : "var(--navy)"}
                  strokeWidth={1.4}
                  opacity={active ? 0.45 : 0.12}
                  className={st === "RUNNING" ? "flow-line" : ""}
                />
              );
            })}
          </svg>

          <div className="pointer-events-none absolute left-5 top-4 z-10">
            <div className="label">Agent Constellation</div>
            <div className="mt-1 text-[13px] font-semibold text-foreground">{phaseLabel}</div>
          </div>

          {SATELLITES.map((k) => {
            const n = AGENT_META[k];
            const st = pipeline.states[k];
            const lastEvent = [...pipeline.events].reverse().find((e) => e.agent === k);
            const line1 = st === "IDLE" ? "Awaiting upstream data…" : lastEvent?.message || n.startMsg;
            const Icon = n.icon;
            return (
              <div
                key={k}
                className="absolute w-56 -translate-x-1/2 -translate-y-1/2 fade-up"
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
              >
                <div className="panel p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`grid h-8 w-8 place-items-center rounded-lg ${
                          st === "DONE" ? "bg-teal-tint text-teal-deep" : st === "ERROR" ? "bg-coral-tint text-destructive" : "bg-navy-tint text-navy"
                        }`}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="text-[12.5px] font-semibold text-foreground">{n.label}</span>
                    </div>
                    <Ring percent={st === "DONE" ? 100 : progress[k] ?? 0} state={st} />
                  </div>
                  <p className="mt-2 truncate text-[12px] font-semibold text-foreground">{line1}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {st === "DONE" ? "Analysis complete" : st === "ERROR" ? "Failed — see reasoning timeline" : "Processing…"}
                  </p>
                  {st !== "IDLE" && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-navy">
                      <span className={`h-1.5 w-1.5 rounded-full ${st === "RUNNING" ? "bg-navy pulse-dot" : "bg-teal-deep"}`} />
                      {st === "DONE" ? "Complete" : n.liveTag}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* center orchestrator hub */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative grid h-28 w-28 place-items-center">
              {pipeline.running && (
                <span className="hub-ring absolute inset-0 rounded-full border border-navy/50" />
              )}
              <div className="grid h-24 w-24 place-items-center rounded-full border-2 border-navy bg-navy text-white shadow-lg">
                <Share2 size={26} />
              </div>
            </div>
            <div className="mt-2 text-center">
              <div className="text-[12px] font-bold text-navy">Orchestrator</div>
              <div className="label">Decision Engine v4.2</div>
            </div>
          </div>
        </Card>

        <p className="mt-4 text-center text-[13px] text-muted-foreground">
          Aggregating cross-agent findings to construct treatment recommendation draft.
        </p>

        {/* reasoning timeline */}
        <Card className="mt-4 p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-[12.5px] font-semibold text-foreground">Reasoning Timeline</span>
            <span className="text-[11px] tnum text-muted-foreground">Elapsed: {elapsed}</span>
          </div>
          <div ref={timelineRef} className="max-h-40 overflow-auto px-4 py-2">
            {pipeline.events.length === 0 && (
              <div className="py-4 text-center text-[12px] text-muted-foreground">Waiting for the pipeline to start…</div>
            )}
            {pipeline.events.map((e) => (
              <div key={e.id} className="fade-up flex items-start gap-3 py-1.5">
                <span className="w-14 shrink-0 text-[11px] tnum text-muted-foreground">{e.time}</span>
                <span
                  className={`w-24 shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.06em] ${
                    e.status === "error" ? "text-destructive" : "text-navy"
                  }`}
                >
                  {e.agent}
                </span>
                <span className="text-[12.5px] text-foreground">{e.message}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="pointer-events-none sticky bottom-0 flex justify-end px-6 pb-5">
        {pipeline.complete ? (
          <Link
            href={`/cases/${caseId}/comparison`}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg hover:bg-navy/90"
          >
            View Comparison Analysis <ChevronRight size={15} />
          </Link>
        ) : (
          <span className="pointer-events-auto flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg">
            <span className="spinner border-white/30 [border-top-color:white]" />
            {statusPill}
          </span>
        )}
      </div>
    </Shell>
  );
}
