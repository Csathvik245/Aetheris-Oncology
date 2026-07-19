"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Dna, BookOpen, LineChart, ClipboardList, ShieldAlert, Send, Users, ArrowRight } from "lucide-react";
import { Shell } from "../../../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePacket } from "../../../lib/generatedCase";
import { getPipelineData, type PipelineData } from "../../../lib/pipelineData";

type PanelKey = "genomic" | "literature" | "outcome" | "trial" | "toxicity";

const PANEL_META: Record<PanelKey, { label: string; icon: typeof Dna; color: string }> = {
  genomic: { label: "Genomic Interpreter", icon: Dna, color: "text-navy" },
  literature: { label: "Literature Retrieval", icon: BookOpen, color: "text-teal-deep" },
  outcome: { label: "Outcome / Survival", icon: LineChart, color: "text-coral-text" },
  trial: { label: "Trial Matching", icon: ClipboardList, color: "text-navy" },
  toxicity: { label: "Toxicity Assessment", icon: ShieldAlert, color: "text-coral-text" },
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface TranscriptEntry {
  speaker: "resident" | PanelKey;
  content: string;
  error?: boolean;
}

function agentDataFor(agentKey: PanelKey, pd: PipelineData): unknown {
  switch (agentKey) {
    case "genomic":
      return pd.mutations;
    case "literature":
      return pd.citations;
    case "outcome":
      return { aiTopTreatments: pd.plan?.top_treatments ?? [], survivalScores: pd.drugScores };
    case "trial":
      return pd.trials;
    case "toxicity":
      return pd.risks;
  }
}

function participantsFor(pd: PipelineData): PanelKey[] {
  const keys: PanelKey[] = [];
  if (pd.mutations.length > 0) keys.push("genomic");
  if (pd.citations.length > 0) keys.push("literature");
  if ((pd.plan?.top_treatments.length ?? 0) > 0 || pd.drugScores.length > 0) keys.push("outcome");
  if (pd.trials.length > 0) keys.push("trial");
  if (pd.risks.length > 0) keys.push("toxicity");
  return keys;
}

export default function TumorBoardPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);
  const packet = usePacket(caseId);
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [agentHistories, setAgentHistories] = useState<Record<PanelKey, ChatMessage[]>>({} as Record<PanelKey, ChatMessage[]>);
  const [pending, setPending] = useState<Set<PanelKey>>(new Set());
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getPipelineData(caseId).then(setPipelineData);
  }, [caseId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript, pending]);

  const participants = pipelineData ? participantsFor(pipelineData) : [];
  const caseSummary = `${packet.displayId} — ${packet.pathology.diagnosis}`;

  function ask() {
    const question = input.trim();
    if (!question || pending.size > 0 || !pipelineData || participants.length === 0) return;
    setInput("");
    setTranscript((t) => [...t, { speaker: "resident", content: question }]);
    setPending(new Set(participants));

    for (const agentKey of participants) {
      const priorMessages = agentHistories[agentKey] ?? [];
      const nextMessages: ChatMessage[] = [...priorMessages, { role: "user", content: question }];
      fetch("/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentKey,
          agentData: agentDataFor(agentKey, pipelineData),
          caseSummary,
          messages: nextMessages,
        }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
          setAgentHistories((h) => ({ ...h, [agentKey]: [...nextMessages, { role: "assistant", content: data.reply }] }));
          setTranscript((t) => [...t, { speaker: agentKey, content: data.reply }]);
        })
        .catch((e: Error) => {
          setTranscript((t) => [...t, { speaker: agentKey, content: e.message, error: true }]);
        })
        .finally(() => {
          setPending((s) => {
            const next = new Set(s);
            next.delete(agentKey);
            return next;
          });
        });
    }
  }

  return (
    <Shell breadcrumb="AI Tumor Board">
      <div className="mx-auto flex h-full max-w-4xl flex-col px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-[20px] font-bold text-foreground">AI Tumor Board</h1>
            <p className="text-[12.5px] text-muted-foreground">{packet.displayId} — question the panel directly</p>
          </div>
          {pipelineData && participants.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-teal-ring bg-teal-tint px-3 py-1.5 text-[11.5px] font-semibold text-teal-deep">
              <Users size={13} /> {participants.length} Panelist{participants.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {!pipelineData || participants.length === 0 ? (
          <Card className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
            <Users size={28} className="text-muted-foreground/50" />
            <p className="text-[13.5px] font-medium text-foreground">No panel available yet</p>
            <p className="max-w-sm text-[12.5px] text-muted-foreground">
              The tumor board is made up of this case&rsquo;s real agent findings. Run this case through
              Mission Control first, then come back to question the panel.
            </p>
            <Link href={`/cases/${caseId}/mission-control`}>
              <Button className="mt-2 gap-1.5 bg-navy text-white hover:bg-navy/90">
                Go to Mission Control <ArrowRight size={14} />
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {participants.map((k) => {
                const meta = PANEL_META[k];
                const Icon = meta.icon;
                return (
                  <span
                    key={k}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground"
                  >
                    <Icon size={13} className={meta.color} /> {meta.label}
                  </span>
                );
              })}
            </div>

            <Card className="flex flex-1 flex-col overflow-hidden p-0">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
                {transcript.length === 0 && (
                  <div className="grid h-full place-items-center text-center">
                    <p className="max-w-sm text-[12.5px] text-muted-foreground">
                      Ask the panel a question — e.g. &ldquo;Why not pembrolizumab?&rdquo; Every
                      panelist who has real findings for this case will weigh in with only their
                      own domain.
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {transcript.map((entry, i) =>
                    entry.speaker === "resident" ? (
                      <div key={i} className="ml-auto max-w-[75%] rounded-lg bg-navy px-3.5 py-2.5 text-[13px] text-white">
                        {entry.content}
                      </div>
                    ) : (
                      <div key={i} className="max-w-[85%] rounded-lg border border-border bg-card p-3">
                        <div className={`flex items-center gap-1.5 text-[11.5px] font-semibold ${PANEL_META[entry.speaker].color}`}>
                          {(() => {
                            const Icon = PANEL_META[entry.speaker].icon;
                            return <Icon size={13} />;
                          })()}
                          {PANEL_META[entry.speaker].label} Agent
                        </div>
                        <p className={`mt-1.5 text-[13px] leading-relaxed ${entry.error ? "text-coral-text" : "text-foreground"}`}>
                          {entry.content}
                        </p>
                      </div>
                    )
                  )}
                  {[...pending].map((k) => (
                    <div key={k} className="max-w-[85%] rounded-lg border border-border bg-card p-3">
                      <div className={`flex items-center gap-1.5 text-[11.5px] font-semibold ${PANEL_META[k].color}`}>
                        {(() => {
                          const Icon = PANEL_META[k].icon;
                          return <Icon size={13} />;
                        })()}
                        {PANEL_META[k].label} Agent
                      </div>
                      <p className="mt-1.5 text-[12.5px] text-muted-foreground">Considering…</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 border-t border-border p-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && ask()}
                  placeholder="Ask the panel a question…"
                  disabled={pending.size > 0}
                />
                <Button onClick={ask} disabled={pending.size > 0 || !input.trim()} className="shrink-0 bg-navy text-white hover:bg-navy/90">
                  <Send size={15} />
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </Shell>
  );
}
