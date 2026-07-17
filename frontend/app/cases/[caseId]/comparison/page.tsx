"use client";

import { use, useEffect, useState } from "react";
import { Check, Circle, SearchX, ChevronDown } from "lucide-react";
import { Shell } from "../../../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { COMPARISON_842 } from "../../../lib/mock";
import { usePacket } from "../../../lib/generatedCase";
import { getPipelineData, type PipelineData } from "../../../lib/pipelineData";
import { AgentChat } from "../../../components/AgentChat";

function ScoreCard({
  label,
  value,
  chat,
}: {
  label: string;
  value: number;
  chat?: React.ReactNode;
}) {
  const low = value < 70;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="label">{label}</div>
        {chat}
      </div>
      <div className={`mt-1 font-heading text-3xl font-bold tnum ${low ? "text-coral-text" : "text-navy"}`}>
        {value}%
      </div>
      <Progress value={value} className="mt-3" />
      {low && (
        <span className="mt-2 inline-block rounded-full bg-coral-tint px-2 py-0.5 text-[11px] font-semibold text-coral-text">
          Action Required
        </span>
      )}
    </Card>
  );
}

export default function ComparisonPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);
  const packet = usePacket(caseId);
  const data = COMPARISON_842;
  const [whyOpen, setWhyOpen] = useState<"resident" | "ai" | null>(null);
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);

  useEffect(() => {
    // One-shot bootstrap read from localStorage (unavailable during SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPipelineData(getPipelineData(caseId));
  }, [caseId]);

  const caseSummary = `${packet.displayId} — ${packet.pathology.diagnosis}`;
  const live = pipelineData !== null;

  return (
    <Shell breadcrumb="Comparison Analysis">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-1 flex items-center gap-2">
          <h1 className="font-heading text-[22px] font-bold text-foreground">Comparison Analysis</h1>
          <Badge className="bg-muted text-muted-foreground">{packet.displayId}</Badge>
          {live && <Badge className="bg-teal-tint text-teal-deep">Live Agent Data</Badge>}
        </div>
        <p className="mb-6 text-[13px] text-muted-foreground">
          {live
            ? "Scores below are illustrative — each agent's chat reflects its real output from this case's completed run."
            : "Illustrative scoring — run this case through Mission Control to unlock each agent's real findings in chat."}
        </p>

        <div className="grid grid-cols-3 gap-5">
          <ScoreCard label="Biomarkers Agreement" value={data.scores.biomarkers} />
          <ScoreCard label="Treatment Agreement" value={data.scores.treatment} />
          <ScoreCard
            label="Toxicity Analysis"
            value={data.scores.toxicity}
            chat={
              <AgentChat
                agentKey="toxicity"
                triggerLabel="Chat"
                caseSummary={caseSummary}
                scopeNote={
                  live
                    ? "This agent only sees adverse-event risk data it computed per drug — nothing about mutations, literature, trials, or survival scores."
                    : "No live toxicity run yet for this case."
                }
                agentData={live ? pipelineData!.risks : { note: "No live run completed yet." }}
              />
            }
          />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <Circle size={8} className="fill-muted-foreground text-muted-foreground" /> Resident Reasoning
          </div>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-navy">
            <span className="grid h-4 w-4 place-items-center rounded bg-navy-tint">
              <Circle size={7} className="fill-navy text-navy" />
            </span>
            AI Orchestrator
          </div>
        </div>

        {/* biomarker priority */}
        <div className="mt-3 grid grid-cols-2 gap-6">
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="label">Biomarker Priority</span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">Manual Input</span>
            </div>
            <div className="flex flex-col gap-2">
              {data.biomarkerPriority.resident.map((b, i) => (
                <div key={b.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-[13px] text-foreground">
                    {i + 1}. {b.label}
                  </span>
                  {b.matched ? <Check size={15} className="text-teal-deep" /> : <Circle size={13} className="text-muted-foreground" />}
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="label">AI Rank Prediction</span>
              <span className="rounded-md bg-teal-tint px-2 py-0.5 text-[10.5px] font-medium text-teal-deep">Computed</span>
            </div>
            <div className="flex flex-col gap-2">
              {data.biomarkerPriority.ai.map((b, i) => (
                <div key={b.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-[13px] text-foreground">
                    {i + 1}. {b.label}
                  </span>
                  <span
                    className={`text-[11px] font-semibold ${
                      b.tag === "New Insight" ? "text-coral-text" : "text-teal-deep"
                    }`}
                  >
                    {b.tag}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="my-5 flex justify-center">
          <AgentChat
            agentKey="genomic"
            caseSummary={caseSummary}
            scopeNote={
              live
                ? "This agent only sees this case's annotated mutations — not literature, outcome scores, trials, or toxicity data."
                : "No live genomic run yet for this case — it only has the mutation list from the patient packet."
            }
            agentData={live ? pipelineData!.mutations : { genomicProfile: packet.pathology.genomicProfile, note: "No live run completed yet." }}
          />
        </div>

        {/* treatment comparison */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="border-l-[3px] !border-l-coral p-4">
            <span className="label text-coral-text">Proposed Therapy</span>
            <h3 className="mt-1 font-heading text-[16px] font-semibold text-foreground">
              {data.treatment.resident.title}
            </h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{data.treatment.resident.rationale}</p>
            <button
              onClick={() => setWhyOpen(whyOpen === "resident" ? null : "resident")}
              className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-navy"
            >
              See Why <ChevronDown size={13} className={whyOpen === "resident" ? "rotate-180" : ""} />
            </button>
            {whyOpen === "resident" && (
              <p className="mt-2 rounded-lg bg-muted p-3 text-[12px] text-muted-foreground">
                Resident rationale weighted TP53 co-mutation as a marker of poor prognosis, favoring
                combination therapy for faster initial disease control.
              </p>
            )}
          </Card>
          <Card className="border-l-[3px] !border-l-teal p-4">
            <span className="label text-teal-deep">Recommended Therapy</span>
            <h3 className="mt-1 font-heading text-[16px] font-semibold text-foreground">{data.treatment.ai.title}</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{data.treatment.ai.rationale}</p>
            <button
              onClick={() => setWhyOpen(whyOpen === "ai" ? null : "ai")}
              className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-navy"
            >
              See Why <ChevronDown size={13} className={whyOpen === "ai" ? "rotate-180" : ""} />
            </button>
            {whyOpen === "ai" && (
              <p className="mt-2 rounded-lg bg-muted p-3 text-[12px] text-muted-foreground">
                FLAURA (NCT02296125) demonstrated osimertinib monotherapy PFS benefit without added
                chemotherapy toxicity in EGFR-mutant, T790M-negative disease — matching this profile.
              </p>
            )}
          </Card>
        </div>

        <div className="my-5 flex justify-center gap-3">
          <AgentChat
            agentKey="outcome"
            caseSummary={caseSummary}
            scopeNote={
              live
                ? "This agent only sees its own survival-benefit drug scores — not mutations, citations, trials, or toxicity data."
                : "No live outcome run yet — it only has the resident-vs-AI treatment summary shown here."
            }
            agentData={live ? pipelineData!.drugScores : { resident: data.treatment.resident, ai: data.treatment.ai, note: "No live run completed yet." }}
          />
          <AgentChat
            agentKey="literature"
            caseSummary={caseSummary}
            scopeNote={
              live
                ? "This agent only sees the PubMed citations it retrieved for this case — nothing about mutations, scores, trials, or toxicity."
                : "No live literature run yet for this case."
            }
            agentData={live ? pipelineData!.citations : { citationCount: data.stats.evidenceDepth, note: "No live run completed yet — citation list unavailable." }}
          />
        </div>

        {/* trial matching */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="flex min-h-40 flex-col items-center justify-center p-4 text-center">
            <span className="label mb-2 self-start">Eligible Trials Found</span>
            <SearchX size={28} className="text-muted-foreground/50" />
            <p className="mt-2 text-[12.5px] text-muted-foreground">No specific trials identified by resident.</p>
          </Card>
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="label">AI Discovery</span>
              <span className="rounded-md bg-teal-tint px-2 py-0.5 text-[10.5px] font-medium text-teal-deep">
                {data.trials.aiMatches.length} High Matches
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {data.trials.aiMatches.map((t) => (
                <div key={t.nctId} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-semibold text-foreground">
                      {t.nctId} ({t.label})
                    </span>
                    {t.match != null && (
                      <span className="rounded-full bg-teal-tint px-2 py-0.5 text-[10.5px] font-semibold text-teal-deep">
                        {t.match}% Match
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] text-muted-foreground">{t.title}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="my-5 flex justify-center">
          <AgentChat
            agentKey="trial"
            caseSummary={caseSummary}
            scopeNote={
              live
                ? "This agent only sees the clinical trials it matched for this case — not mutations, citations, scores, or toxicity data."
                : "No live trial-matching run yet — it only has the trial list shown here."
            }
            agentData={live ? pipelineData!.trials : { aiMatches: data.trials.aiMatches, note: "No live run completed yet." }}
          />
        </div>

        {/* stat strip */}
        <Card className="mt-2 grid grid-cols-4 divide-x divide-border p-0">
          {[
            ["Time to Decision", data.stats.timeToDecision],
            ["Evidence Depth", `${data.stats.evidenceDepth} Citations`],
            ["Conflict Resolution", data.stats.conflictResolution],
            ["Learning Progress", data.stats.learningProgress],
          ].map(([k, v]) => (
            <div key={k} className="p-4 text-center">
              <div className="label">{k}</div>
              <div className="mt-1 text-[15px] font-bold text-navy">{v}</div>
            </div>
          ))}
        </Card>
      </div>
    </Shell>
  );
}
