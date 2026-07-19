"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Circle, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { Shell } from "@/app/components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePacket } from "@/app/lib/generatedCase";
import { useAuth } from "@/app/lib/supabase/AuthProvider";
import {
  getSubmissionForUser,
  getPipelineDataForUser,
  listReviewComments,
  addReviewComment,
  type ReviewComment,
} from "@/app/lib/faculty";
import {
  computeAgreement,
  computeBiomarkerAgreement,
  computeToxicityAgreement,
  type WorksheetSubmission,
} from "@/app/lib/session";
import type { PipelineData } from "@/app/lib/pipelineData";

function ScoreCard({ label, value }: { label: string; value: number | null }) {
  const low = value !== null && value < 70;
  return (
    <Card className="p-5">
      <div className="label">{label}</div>
      {value === null ? (
        <div className="mt-1 font-heading text-3xl font-bold tnum text-muted-foreground">—</div>
      ) : (
        <>
          <div className={`mt-1 font-heading text-3xl font-bold tnum ${low ? "text-coral-text" : "text-navy"}`}>{value}%</div>
          <Progress value={value} className="mt-3" />
        </>
      )}
    </Card>
  );
}

export default function ReviewDetailPage({ params }: { params: Promise<{ caseId: string; userId: string }> }) {
  const { caseId, userId } = use(params);
  const { profile } = useAuth();
  const packet = usePacket(caseId);
  const [submission, setSubmission] = useState<WorksheetSubmission | null>(null);
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [body, setBody] = useState("");
  const [verdict, setVerdict] = useState<"approve" | "disagree" | "comment">("comment");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getSubmissionForUser(caseId, userId).then(setSubmission);
    getPipelineDataForUser(caseId, userId).then(setPipelineData);
    listReviewComments(caseId, userId).then(setComments);
  }, [caseId, userId]);

  const aiDrugNames = pipelineData?.plan?.top_treatments.map((t) => t.drug) ?? [];
  const aiGenes = pipelineData?.mutations.map((m) => m.gene).filter((g): g is string => !!g) ?? [];
  const aiAdverseEvents = pipelineData?.risks.flatMap((r) => r.adverse_events ?? []) ?? [];

  const biomarkerScore = submission && pipelineData ? computeBiomarkerAgreement(submission, aiGenes) : null;
  const treatmentScore = submission && pipelineData ? computeAgreement(submission, aiDrugNames) : null;
  const toxicityScore = submission && pipelineData ? computeToxicityAgreement(submission, aiAdverseEvents) : null;

  const residentBiomarkers = (submission?.biomarkerOrder ?? []).filter((g) => submission?.biomarkerChecks[g]);
  const topPlan = pipelineData?.plan?.top_treatments ?? [];

  async function submitComment() {
    if (!body.trim() || !profile?.institution_id) return;
    setSubmitting(true);
    await addReviewComment({
      caseId,
      submissionUserId: userId,
      institutionId: profile.institution_id,
      body: body.trim(),
      verdict,
    });
    const fresh = await listReviewComments(caseId, userId);
    setComments(fresh);
    setBody("");
    setSubmitting(false);
  }

  return (
    <Shell breadcrumb="Faculty Review">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Link href="/faculty/review" className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Back to Review Queue
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <h1 className="font-heading text-[22px] font-bold text-foreground">{packet.pathology.diagnosis}</h1>
          <Badge className="bg-muted text-muted-foreground">{packet.displayId}</Badge>
        </div>

        {!submission ? (
          <Card className="mt-6 p-6 text-[13px] text-muted-foreground">No submission found for this resident/case.</Card>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-3 gap-5">
              <ScoreCard label="Biomarkers Agreement" value={biomarkerScore} />
              <ScoreCard label="Treatment Agreement" value={treatmentScore} />
              <ScoreCard label="Toxicity Analysis" value={toxicityScore} />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6">
              <Card className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="label">Resident Biomarker Priority</span>
                </div>
                {residentBiomarkers.length === 0 ? (
                  <p className="text-[12.5px] text-muted-foreground">None flagged.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {residentBiomarkers.map((b, i) => (
                      <div key={b} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <span className="text-[13px] text-foreground">{i + 1}. {b}</span>
                        {aiGenes.some((g) => b.toLowerCase().includes(g.toLowerCase())) ? (
                          <Check size={15} className="text-teal-deep" />
                        ) : (
                          <Circle size={13} className="text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 border-t border-border pt-3">
                  <span className="label">Resident Regimen</span>
                  <div className="mt-2 flex flex-col gap-2">
                    {submission.drugs.map((d) => (
                      <div key={d.name} className="rounded-lg border border-border px-3 py-2">
                        <div className="text-[13px] font-medium text-foreground">{d.name}</div>
                        <div className="mt-0.5 text-[11.5px] text-muted-foreground">{d.rationale}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 border-t border-border pt-3">
                  <span className="label">Diagnosis Note</span>
                  <p className="mt-1.5 text-[12.5px] text-foreground">{submission.diagnosisNote || "—"}</p>
                </div>
              </Card>

              <Card className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="label">AI Top Treatments</span>
                </div>
                {!pipelineData ? (
                  <p className="text-[12.5px] text-muted-foreground">No completed pipeline run for this case/resident.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {topPlan.map((t) => (
                      <div key={t.drug} className="rounded-lg border border-navy/20 bg-navy-tint px-3 py-2">
                        <div className="text-[13px] font-medium text-navy">
                          #{t.rank} {t.drug}
                        </div>
                        <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                          {t.evidence_level} · {t.toxicity_risk} toxicity
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card className="mt-6 p-5">
              <h3 className="font-heading text-[15px] font-semibold text-foreground">Faculty Review</h3>

              {comments.length > 0 && (
                <div className="mt-3 flex flex-col gap-3 border-b border-border pb-4">
                  {comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      {c.verdict === "approve" && <ThumbsUp size={14} className="mt-0.5 text-teal-deep" />}
                      {c.verdict === "disagree" && <ThumbsDown size={14} className="mt-0.5 text-coral-text" />}
                      {c.verdict === "comment" && <MessageSquare size={14} className="mt-0.5 text-muted-foreground" />}
                      <div>
                        <div className="text-[12.5px] font-medium text-foreground">
                          {c.facultyName} <span className="text-muted-foreground">· {new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="mt-0.5 text-[12.5px] text-muted-foreground">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                {(["approve", "disagree", "comment"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVerdict(v)}
                    className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium capitalize transition-colors ${
                      verdict === v ? "border-navy bg-navy-tint text-navy" : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add feedback for this resident..."
                className="mt-3"
              />
              <Button onClick={submitComment} disabled={submitting || !body.trim()} className="mt-3 bg-navy text-white hover:bg-navy/90">
                {submitting ? "Posting…" : "Post Review"}
              </Button>
            </Card>
          </>
        )}
      </div>
    </Shell>
  );
}
