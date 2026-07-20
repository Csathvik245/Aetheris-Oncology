"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  API,
  postAnalyze,
  getResult,
  type AgentKey,
  type SSEEvent,
  type Mutation,
  type Citation,
  type DrugScore,
  type Trial,
  type RiskAssessment,
  type TreatmentPlan,
  type ResidentContext,
} from "./api";

export type AgentState = "IDLE" | "RUNNING" | "DONE" | "ERROR";

export interface LogEvent {
  id: number;
  time: string;
  agent: string;
  message: string;
  status: "running" | "done" | "error" | "info";
}

const IDLE_STATES: Record<AgentKey, AgentState> = {
  genomic: "IDLE",
  literature: "IDLE",
  outcome: "IDLE",
  trial: "IDLE",
  toxicity: "IDLE",
  orchestrator: "IDLE",
};

const EVENT_MAP: Record<string, { agent: AgentKey; to: AgentState }> = {
  GENOMIC_START: { agent: "genomic", to: "RUNNING" },
  GENOMIC_COMPLETE: { agent: "genomic", to: "DONE" },
  LITERATURE_START: { agent: "literature", to: "RUNNING" },
  LITERATURE_COMPLETE: { agent: "literature", to: "DONE" },
  OUTCOME_START: { agent: "outcome", to: "RUNNING" },
  OUTCOME_COMPLETE: { agent: "outcome", to: "DONE" },
  TRIAL_START: { agent: "trial", to: "RUNNING" },
  TRIAL_COMPLETE: { agent: "trial", to: "DONE" },
  TOXICITY_START: { agent: "toxicity", to: "RUNNING" },
  TOXICITY_COMPLETE: { agent: "toxicity", to: "DONE" },
  ORCHESTRATOR_START: { agent: "orchestrator", to: "RUNNING" },
  ORCHESTRATOR_COMPLETE: { agent: "orchestrator", to: "DONE" },
};

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/**
 * Drives the six-agent SSE pipeline. Shared by Mission Control so the live
 * agent stream is implemented once and only restyled per screen.
 */
export function useAgentPipeline() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const [states, setStates] = useState<Record<AgentKey, AgentState>>(IDLE_STATES);
  const [mutations, setMutations] = useState<Mutation[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [drugScores, setDrugScores] = useState<DrugScore[]>([]);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [events, setEvents] = useState<LogEvent[]>([]);

  const esRef = useRef<EventSource | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const evId = useRef(0);
  const startedAt = useRef<number | null>(null);

  const pushEvent = useCallback((agent: string, message: string, status: LogEvent["status"]) => {
    const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
    setEvents((prev) => [...prev.slice(-199), { id: evId.current++, time, agent, message, status }]);
  }, []);

  useEffect(() => {
    return () => esRef.current?.close();
  }, []);

  const resetRun = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setStates(IDLE_STATES);
    setMutations([]);
    setCitations([]);
    setDrugScores([]);
    setTrials([]);
    setRisks([]);
    setPlan(null);
    setEvents([]);
    startedAt.current = null;
  }, []);

  const ingestData = useCallback((data: Record<string, unknown> | null | undefined) => {
    if (!data) return;
    if (data.mutations) setMutations(asArray<Mutation>(data.mutations));
    if (data.variants) setMutations(asArray<Mutation>(data.variants));
    if (data.citations) setCitations(asArray<Citation>(data.citations));
    if (data.literature) setCitations(asArray<Citation>(data.literature));
    if (data.drug_scores) setDrugScores(asArray<DrugScore>(data.drug_scores));
    if (data.scores) setDrugScores(asArray<DrugScore>(data.scores));
    if (data.trials) setTrials(asArray<Trial>(data.trials));
    if (data.risk_assessments) setRisks(asArray<RiskAssessment>(data.risk_assessments));
    if (data.toxicity) setRisks(asArray<RiskAssessment>(data.toxicity));
  }, []);

  const fetchPlan = useCallback(async (id: string) => {
    try {
      const p = await getResult(id);
      setPlan(p);
    } catch {
      /* keep last known state */
    }
  }, []);

  const handleEvent = useCallback(
    (ev: SSEEvent) => {
      const name = ev.event || "";
      const agent = String(ev.agent || name.split("_")[0] || "pipeline");
      const msg = ev.message || ev.status || name;
      if (name === "ERROR") {
        const a = (ev.agent as AgentKey) || undefined;
        if (a && a in IDLE_STATES) setStates((s) => ({ ...s, [a]: "ERROR" }));
        pushEvent(agent, msg, "error");
        return;
      }
      const map = EVENT_MAP[name];
      if (map) setStates((s) => ({ ...s, [map.agent]: map.to }));
      if (ev.data) ingestData(ev.data);
      const status: LogEvent["status"] = name.endsWith("_START")
        ? "running"
        : name.endsWith("_COMPLETE")
          ? "done"
          : "info";
      pushEvent(agent, msg, status);
      if (name === "PIPELINE_COMPLETE" && jobIdRef.current) {
        fetchPlan(jobIdRef.current);
      }
    },
    [ingestData, fetchPlan, pushEvent]
  );

  const openStream = useCallback(
    (id: string) => {
      const es = new EventSource(`${API}/stream/${id}`);
      esRef.current = es;
      es.onmessage = (e) => {
        try {
          handleEvent(JSON.parse(e.data) as SSEEvent);
        } catch {
          /* ignore malformed frame */
        }
      };
      es.onerror = () => {
        es.close();
        esRef.current = null;
      };
    },
    [handleEvent]
  );

  const runFile = useCallback(
    async (file: File, residentContext?: ResidentContext) => {
      resetRun();
      setBusy(true);
      startedAt.current = Date.now();
      pushEvent("intake", `Uploading ${file.name} → POST /analyze`, "running");
      try {
        const { job_id } = await postAnalyze(file, residentContext);
        setJobId(job_id);
        jobIdRef.current = job_id;
        setOnline(true);
        pushEvent("intake", `Job accepted · ${job_id}`, "done");
        openStream(job_id);
      } catch (e) {
        setOnline(false);
        pushEvent("intake", `Analyze failed — is the backend up? (${(e as Error).message})`, "error");
      } finally {
        setBusy(false);
      }
    },
    [resetRun, openStream, pushEvent]
  );

  const running = busy || Object.values(states).some((s) => s === "RUNNING");
  const anyError = Object.values(states).includes("ERROR");
  const complete = states.orchestrator === "DONE";

  return {
    online,
    busy,
    jobId,
    states,
    mutations,
    citations,
    drugScores,
    trials,
    risks,
    plan,
    events,
    running,
    anyError,
    complete,
    startedAt,
    runFile,
  };
}
