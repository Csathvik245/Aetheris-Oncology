"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  API,
  postAnalyze,
  getResult,
  getAgents,
  type AgentKey,
  type SSEEvent,
  type Mutation,
  type Citation,
  type DrugScore,
  type Trial,
  type RiskAssessment,
  type TreatmentPlan,
  type AgentCard,
} from "./lib/api";
import type { AgentState } from "./components/AgentStatus";
import { TopNav, type View } from "./components/dash/TopNav";
import { Sidebar } from "./components/dash/Sidebar";
import { PatientCard } from "./components/dash/PatientCard";
import { ActiveTreatment } from "./components/dash/ActiveTreatment";
import { OrchestratorGraph } from "./components/dash/OrchestratorGraph";
import { OutcomePanel } from "./components/dash/OutcomePanel";
import { LiveActivity } from "./components/dash/LiveActivity";
import { StatusBar } from "./components/dash/StatusBar";
import { PatientsView, TrialsView, AgentsView } from "./components/dash/Views";
import {
  LogsPanel,
  SupportModal,
  SettingsModal,
  HelpModal,
  NotificationsModal,
  type LogEvent,
} from "./components/dash/Overlays";

type Overlay = "logs" | "support" | "settings" | "help" | "notifications" | null;

function titleCase(s: string): string {
  return s
    .replace(/_/g, " ")
    .trim()
    .replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
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

export default function Page() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, setJobId] = useState<string | null>(null);

  const [states, setStates] = useState<Record<AgentKey, AgentState>>(IDLE_STATES);
  const [mutations, setMutations] = useState<Mutation[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [drugScores, setDrugScores] = useState<DrugScore[]>([]);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [agentCards, setAgentCards] = useState<AgentCard[]>([]);

  const [view, setView] = useState<View>("orchestrator");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState<LogEvent[]>([]);

  const esRef = useRef<EventSource | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const evId = useRef(0);

  const pushEvent = useCallback(
    (agent: string, message: string, status: LogEvent["status"]) => {
      const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
      setEvents((prev) => [
        ...prev.slice(-199),
        { id: evId.current++, time, agent, message, status },
      ]);
    },
    []
  );

  // ---- probe backend ----
  const probe = useCallback(async () => {
    try {
      const cards = await getAgents();
      setAgentCards(cards);
      setOnline(true);
    } catch {
      setOnline((prev) => (prev === true ? prev : false));
    }
  }, []);

  useEffect(() => {
    void probe();
    const id = setInterval(() => void probe(), 15000);
    return () => clearInterval(id);
  }, [probe]);

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
  }, []);

  const ingestData = useCallback(
    (data: Record<string, unknown> | null | undefined) => {
      if (!data) return;
      if (data.mutations) setMutations(asArray<Mutation>(data.mutations));
      if (data.variants) setMutations(asArray<Mutation>(data.variants));
      if (data.citations) setCitations(asArray<Citation>(data.citations));
      if (data.literature) setCitations(asArray<Citation>(data.literature));
      if (data.drug_scores) setDrugScores(asArray<DrugScore>(data.drug_scores));
      if (data.scores) setDrugScores(asArray<DrugScore>(data.scores));
      if (data.trials) setTrials(asArray<Trial>(data.trials));
      if (data.risk_assessments)
        setRisks(asArray<RiskAssessment>(data.risk_assessments));
      if (data.toxicity) setRisks(asArray<RiskAssessment>(data.toxicity));
    },
    []
  );

  const fetchPlan = useCallback(async (id: string) => {
    try {
      const p = await getResult(id);
      setPlan(p);
      setMutations((m) => (m.length ? m : deriveMutations(p)));
      setRisks((r) => (r.length ? r : deriveRisks(p)));
      setTrials((t) => (t.length ? t : deriveTrials(p)));
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

  const onFile = useCallback(
    async (file: File) => {
      resetRun();
      setView("orchestrator");
      setFileName(file.name);
      setBusy(true);
      pushEvent("intake", `Uploading ${file.name} → POST /analyze`, "running");
      try {
        const { job_id } = await postAnalyze(file);
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

  const triggerUpload = useCallback(() => fileInputRef.current?.click(), []);

  const running =
    busy || Object.values(states).some((s) => s === "RUNNING");
  const activeNodes =
    12 + Object.values(states).filter((s) => s === "RUNNING").length;
  const hasFile = !!fileName;

  const livePatient =
    plan || mutations.length
      ? {
          id: plan?.patient_id ?? "CURRENT",
          diagnosis: titleCase(
            (mutations.find((m) => m.cancer_type)?.cancer_type as string) ||
              "Unknown Primary"
          ),
          variant: (() => {
            const d = mutations.find((m) => m.gene);
            return d ? `${d.gene} ${d.variant ?? ""}`.trim() : "—";
          })(),
          stage: "—",
          status: plan ? "Analyzed" : running ? "In Pipeline" : "Pending",
          updated: "now",
        }
      : null;

  return (
    <div className="app-bg flex h-screen w-full flex-col text-fg">
      <input
        ref={fileInputRef}
        type="file"
        accept=".vcf,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />

      <TopNav
        view={view}
        onNav={setView}
        search={search}
        onSearch={setSearch}
        onSubmitSearch={() => setView("patients")}
        onBell={() => setOverlay("notifications")}
        onSettings={() => setOverlay("settings")}
        onHelp={() => setOverlay("help")}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          activeNodes={activeNodes}
          onNewAnalysis={triggerUpload}
          busy={busy}
          view={view}
          onNav={setView}
          onOpenLogs={() => setOverlay("logs")}
          onOpenSupport={() => setOverlay("support")}
        />

        {view === "orchestrator" && (
          <>
            <main className="flex min-h-0 flex-1">
              {/* left column — patient + treatment */}
              <div className="flex w-72 shrink-0 flex-col gap-4 overflow-auto border-r border-line p-4">
                <PatientCard plan={plan} mutations={mutations} />
                <ActiveTreatment drugScores={drugScores} />
              </div>

              {/* center — orchestrator node graph + ranked outcome */}
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <div className="relative min-h-0 flex-1 overflow-hidden">
                  <OrchestratorGraph
                    states={states}
                    hasFile={hasFile}
                    running={running}
                  />
                </div>
                <OutcomePanel plan={plan} risks={risks} running={running} />
              </div>
            </main>

            <LiveActivity
              states={states}
              syncing={running}
              mutations={mutations}
              citations={citations}
              drugScores={drugScores}
              trials={trials}
              risks={risks}
              plan={plan}
            />
          </>
        )}

        {view === "patients" && (
          <PatientsView search={search} onSearch={setSearch} live={livePatient} />
        )}
        {view === "trials" && (
          <TrialsView search={search} onSearch={setSearch} liveTrials={trials} />
        )}
        {view === "agents" && <AgentsView cards={agentCards} />}
      </div>

      <StatusBar online={online} />

      {overlay === "logs" && (
        <LogsPanel events={events} onClose={() => setOverlay(null)} />
      )}
      {overlay === "support" && <SupportModal onClose={() => setOverlay(null)} />}
      {overlay === "settings" && (
        <SettingsModal api={API} online={online} onClose={() => setOverlay(null)} />
      )}
      {overlay === "help" && <HelpModal onClose={() => setOverlay(null)} />}
      {overlay === "notifications" && (
        <NotificationsModal events={events} onClose={() => setOverlay(null)} />
      )}
    </div>
  );
}

/* ---- derive partials from final plan when SSE didn't carry them ---- */
function deriveMutations(p: TreatmentPlan): Mutation[] {
  return p.top_treatments.map((t) => ({
    gene: "—",
    variant: "—",
    oncogenic: "—",
    evidence: t.evidence_level,
    drug: t.drug,
  }));
}
function deriveRisks(p: TreatmentPlan): RiskAssessment[] {
  return p.top_treatments.map((t) => ({
    drug: t.drug,
    toxicity_risk: t.toxicity_risk,
    notes: t.toxicity_notes,
  }));
}
function deriveTrials(p: TreatmentPlan): Trial[] {
  return p.top_treatments
    .filter((t) => t.matching_trial)
    .map((t) => ({
      nct_id: t.matching_trial!.nct_id,
      title: t.matching_trial!.title,
    }));
}
