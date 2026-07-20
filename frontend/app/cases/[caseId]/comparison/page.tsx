"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Circle, SearchX, ChevronDown, Users, Share2, Sparkles, BrainCircuit } from "lucide-react";
import { Shell } from "../../../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePacket } from "../../../lib/generatedCase";
import { getPipelineData, type PipelineData } from "../../../lib/pipelineData";
import {
  getSubmission,
  computeAgreement,
  computeBiomarkerAgreement,
  computeToxicityAgreement,
  computeConflictResolution,
  computeTimeToDecision,
  type WorksheetSubmission,
} from "../../../lib/session";
import { AgentChat } from "../../../components/AgentChat";
import { createClient } from "../../../lib/supabase/client";

interface MentorNote {
  note_type: string;
  body: string;
}

function ScoreCard({ label, value }: { label: string; value: number | null }) {
  const low = value !== null && value < 70;
  return (
    <Card className="p-5">
      <div className="label">{label}</div>
      {value === null ? (
        <>
          <div className="mt-1 font-heading text-3xl font-bold tnum text-muted-foreground">—</div>
          <p className="mt-3 text-[11.5px] text-muted-foreground">Run this case through Mission Control to compute this.</p>
        </>
      ) : (
        <>
          <div className={`mt-1 font-heading text-3xl font-bold tnum ${low ? "text-coral-text" : "text-navy"}`}>
            {value}%
          </div>
          <Progress value={value} className="mt-3" />
          {low && (
            <span className="mt-2 inline-block rounded-full bg-coral-tint px-2 py-0.5 text-[11px] font-semibold text-coral-text">
              Action Required
            </span>
          )}
        </>
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
  const [whyOpen, setWhyOpen] = useState<"resident" | "ai" | null>(null);
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [submission, setSubmission] = useState<WorksheetSubmission | null>(null);
  const [mentorNotes, setMentorNotes] = useState<MentorNote[]>([]);

  useEffect(() => {
    getPipelineData(caseId).then(setPipelineData);
    getSubmission(caseId).then(setSubmission);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("mentor_notes")
        .select("note_type, body")
        .eq("user_id", user.id)
        .eq("related_case_id", caseId)
        .order("created_at", { ascending: false })
        .then(({ data }) => setMentorNotes(data ?? []));
    });
  }, [caseId]);

  const live = pipelineData !== null;
  const hasSubmission = submission !== null;
  const caseSummary = `${packet.displayId} — ${packet.pathology.diagnosis}`;

  const aiDrugNames = pipelineData?.plan?.top_treatments.map((t) => t.drug) ?? [];
  const aiGenes = pipelineData?.mutations.map((m) => m.gene).filter((g): g is string => !!g) ?? [];
  const aiAdverseEvents = pipelineData?.risks.flatMap((r) => r.adverse_events ?? []) ?? [];

  const biomarkerScore = live && hasSubmission ? computeBiomarkerAgreement(submission, aiGenes) : null;
  const treatmentScore = live && hasSubmission ? computeAgreement(submission, aiDrugNames) : null;
  const toxicityScore = live && hasSubmission ? computeToxicityAgreement(submission, aiAdverseEvents) : null;
  const conflict = computeConflictResolution(submission, aiDrugNames);
  const timeToDecision =
    submission && pipelineData ? computeTimeToDecision(submission.submittedAt, pipelineData.completedAt) : "—";

  const residentBiomarkers = (submission?.biomarkerOrder ?? []).filter((g) => submission?.biomarkerChecks[g]);
  const topPlan = pipelineData?.plan?.top_treatments ?? [];

  return (
    <Shell breadcrumb="Comparison Analysis">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-[22px] font-bold text-foreground">Comparison Analysis</h1>
            <Badge className="bg-muted text-muted-foreground">{packet.displayId}</Badge>
            {live && <Badge className="bg-teal-tint text-teal-deep">Live Agent Data</Badge>}
          </div>
          {live && (
            <div className="flex gap-2">
              <Link
                href={`/cases/${caseId}/evidence-graph`}
                className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-[12.5px] font-semibold text-foreground hover:bg-muted"
              >
                <Share2 size={14} /> Evidence Graph
              </Link>
              <Link
                href={`/cases/${caseId}/tumor-board`}
                className="flex items-center gap-1.5 rounded-full border border-navy px-3.5 py-1.5 text-[12.5px] font-semibold text-navy hover:bg-navy-tint"
              >
                <Users size={14} /> Ask the Tumor Board
              </Link>
            </div>
          )}
        </div>
        <p className="mb-6 text-[13px] text-muted-foreground">
          {live && hasSubmission
            ? "Resident Reasoning reflects your actual worksheet submission; AI Orchestrator reflects this case's real completed pipeline run."
            : "Complete the worksheet and run this case through Mission Control to see your real submission compared against the AI's real findings."}
        </p>

        <div className="grid grid-cols-3 gap-5">
          <ScoreCard label="Biomarkers Agreement" value={biomarkerScore} />
          <ScoreCard label="Treatment Agreement" value={treatmentScore} />
          <ScoreCard label="Toxicity Analysis" value={toxicityScore} />
        </div>

        {pipelineData?.plan?.resident_feedback && (
          <Card className="mt-5 border-navy/30 bg-navy-tint/40 p-5">
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-navy">
              <Sparkles size={14} /> How the AI Read Your Reasoning
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-foreground">{pipelineData.plan.resident_feedback}</p>
          </Card>
        )}

        {mentorNotes.length > 0 && (
          <Card className="mt-4 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-teal-deep">
                <BrainCircuit size={14} /> How to Improve
              </div>
              <Link href={`/mentor`} className="text-[12px] font-semibold text-navy hover:underline">
                Continue in AI Mentor →
              </Link>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {mentorNotes.map((n, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {n.note_type}
                  </span>
                  <p className="text-[13px] leading-relaxed text-foreground">{n.body}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

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
            {!hasSubmission ? (
              <p className="text-[12.5px] text-muted-foreground">No worksheet submitted yet for this case.</p>
            ) : residentBiomarkers.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">No biomarkers were flagged as decision-driving.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {residentBiomarkers.map((b, i) => (
                  <div key={b} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="text-[13px] text-foreground">
                      {i + 1}. {b}
                    </span>
                    {aiGenes.some((g) => b.toLowerCase().includes(g.toLowerCase())) ? (
                      <Check size={15} className="text-teal-deep" />
                    ) : (
                      <Circle size={13} className="text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="label">AI Rank Prediction</span>
              <span className="rounded-md bg-teal-tint px-2 py-0.5 text-[10.5px] font-medium text-teal-deep">Computed</span>
            </div>
            {!live ? (
              <p className="text-[12.5px] text-muted-foreground">No live genomic run yet for this case.</p>
            ) : pipelineData!.mutations.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">No actionable mutations returned.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {[...pipelineData!.mutations]
                  .sort((a, b) => (Number(b.confidence) || 0) - (Number(a.confidence) || 0))
                  .map((m, i) => {
                    const label = `${m.gene ?? "?"} ${m.variant ?? ""}`.trim();
                    const isNew = !residentBiomarkers.some((b) => b.toLowerCase().includes((m.gene ?? "").toLowerCase()));
                    return (
                      <div key={`${m.gene}-${i}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <span className="text-[13px] text-foreground">
                          {i + 1}. {label}
                        </span>
                        <span className={`text-[11px] font-semibold ${isNew ? "text-coral-text" : "text-teal-deep"}`}>
                          {isNew ? "New Insight" : `Match${m.confidence != null ? ` (${m.confidence})` : ""}`}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>

        <div className="my-5 flex justify-center">
          <AgentChat
            agentKey="genomic"
            caseSummary={caseSummary}
            scopeNote="This agent only sees the biomarker priority box above — your submitted ranking and the genomic agent's real mutation findings — nothing about literature, outcome scores, trials, or toxicity."
            agentData={{
              residentPriority: hasSubmission ? { order: submission!.biomarkerOrder, checks: submission!.biomarkerChecks } : null,
              aiMutations: pipelineData?.mutations ?? [],
              note: !live ? "No live genomic run has completed for this case yet." : undefined,
            }}
          />
        </div>

        {/* treatment comparison */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="border-l-[3px] !border-l-coral p-4">
            <span className="label text-coral-text">Proposed Therapy</span>
            {!hasSubmission ? (
              <p className="mt-2 text-[12.5px] text-muted-foreground">No worksheet submitted yet for this case.</p>
            ) : (
              <>
                <h3 className="mt-1 font-heading text-[16px] font-semibold text-foreground">
                  {submission!.drugs.map((d) => d.name).join(" + ") || "No drugs selected"}
                </h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                  {submission!.drugs.map((d) => d.rationale).filter(Boolean).join(" ") || "No rationale recorded."}
                </p>
                <button
                  onClick={() => setWhyOpen(whyOpen === "resident" ? null : "resident")}
                  className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-navy"
                >
                  See Why <ChevronDown size={13} className={whyOpen === "resident" ? "rotate-180" : ""} />
                </button>
                {whyOpen === "resident" && (
                  <div className="mt-2 flex flex-col gap-2 rounded-lg bg-muted p-3 text-[12px] text-muted-foreground">
                    {submission!.drugs.map((d) => (
                      <div key={d.name}>
                        <span className="font-semibold text-foreground">{d.name}:</span> {d.rationale || "No rationale."}
                        {d.citation && <span className="italic"> — {d.citation}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>
          <Card className="border-l-[3px] !border-l-teal p-4">
            <span className="label text-teal-deep">Recommended Therapy</span>
            {!live ? (
              <p className="mt-2 text-[12.5px] text-muted-foreground">No live outcome run yet for this case.</p>
            ) : topPlan.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-muted-foreground">No treatment plan returned.</p>
            ) : (
              <>
                <h3 className="mt-1 font-heading text-[16px] font-semibold text-foreground">{topPlan[0].drug}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                  Ranked #1 by survival-benefit score ({Math.round(topPlan[0].survival_benefit_score * 100)}%), evidence
                  level {topPlan[0].evidence_level}
                  {topPlan[0].matching_trial ? `, matched to trial ${topPlan[0].matching_trial.nct_id}` : ""}. Toxicity
                  risk: {topPlan[0].toxicity_risk}.
                </p>
                <button
                  onClick={() => setWhyOpen(whyOpen === "ai" ? null : "ai")}
                  className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-navy"
                >
                  See Why <ChevronDown size={13} className={whyOpen === "ai" ? "rotate-180" : ""} />
                </button>
                {whyOpen === "ai" && (
                  <div className="mt-2 flex flex-col gap-2 rounded-lg bg-muted p-3 text-[12px] text-muted-foreground">
                    {topPlan.map((t) => (
                      <div key={t.drug}>
                        <span className="font-semibold text-foreground">
                          #{t.rank} {t.drug}:
                        </span>{" "}
                        {Math.round(t.survival_benefit_score * 100)}% survival benefit, evidence {t.evidence_level},{" "}
                        {t.toxicity_risk} toxicity risk.
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        <div className="my-5 flex justify-center">
          <AgentChat
            agentKey="outcome"
            triggerLabel="Chat with Outcome / Survival Scoring Agent"
            caseSummary={caseSummary}
            scopeNote="This agent sees the treatment box above — your submitted regimen, its own drug scores, the AI's top treatments, and the literature citations backing them — nothing about mutations, trials, or toxicity."
            agentData={{
              residentRegimen: submission?.drugs ?? [],
              residentDoseModification: submission?.doseModification ?? "",
              aiTopTreatments: topPlan,
              survivalScores: pipelineData?.drugScores ?? [],
              supportingCitations: pipelineData?.citations ?? [],
              note: !live ? "No live outcome run has completed for this case yet." : undefined,
            }}
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
                {pipelineData?.trials.length ?? 0} Matches
              </span>
            </div>
            {!live ? (
              <p className="text-[12.5px] text-muted-foreground">No live trial-matching run yet for this case.</p>
            ) : pipelineData!.trials.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">No matching trials returned.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {pipelineData!.trials.map((t) => (
                  <div key={t.nct_id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-semibold text-foreground">{t.nct_id}</span>
                      {t.status && (
                        <span className="rounded-full bg-teal-tint px-2 py-0.5 text-[10.5px] font-semibold text-teal-deep">
                          {t.status}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12px] text-muted-foreground">{t.title}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="my-5 flex justify-center">
          <AgentChat
            agentKey="trial"
            caseSummary={caseSummary}
            scopeNote="This agent only sees the trials it matched for this case — nothing about mutations, citations, survival scores, or toxicity."
            agentData={{
              aiTrials: pipelineData?.trials ?? [],
              note: !live ? "No live trial-matching run has completed for this case yet." : undefined,
            }}
          />
        </div>

        {/* stat strip */}
        <Card className="mt-2 grid grid-cols-4 divide-x divide-border p-0">
          {[
            ["Time to Decision", timeToDecision],
            ["Evidence Depth", `${pipelineData?.citations.length ?? 0} Citations`],
            ["Conflict Resolution", conflict],
            ["Resident Confidence", submission ? `${submission.confidence}%` : "—"],
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
