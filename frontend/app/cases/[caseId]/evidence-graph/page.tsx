"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Dna, ShieldCheck, Pill, FlaskConical, ShieldAlert } from "lucide-react";
import { Shell } from "../../../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePacket } from "../../../lib/generatedCase";
import { getPipelineData, type PipelineData } from "../../../lib/pipelineData";

function Node({
  icon: Icon,
  color,
  label,
  detail,
  children,
  defaultOpen = false,
}: {
  icon: typeof Dna;
  color: string;
  label: string;
  detail?: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-l-2 border-border pl-4">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2.5 py-2 text-left">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${color}`}>
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-foreground">{label}</div>
          {detail && <div className="truncate text-[11.5px] text-muted-foreground">{detail}</div>}
        </div>
        {children && (
          <ChevronDown size={14} className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>
      {open && children && <div className="ml-4 flex flex-col gap-1 pb-2 pl-4">{children}</div>}
    </div>
  );
}

export default function EvidenceGraphPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = use(params);
  const packet = usePacket(caseId);
  const [pd, setPd] = useState<PipelineData | null>(null);

  useEffect(() => {
    getPipelineData(caseId).then(setPd);
  }, [caseId]);

  return (
    <Shell breadcrumb="Live Evidence Graph">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Link href={`/cases/${caseId}/comparison`} className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Back to Comparison Analysis
        </Link>
        <h1 className="mt-3 font-heading text-[22px] font-bold text-foreground">Live Evidence Graph</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {packet.displayId} — click any node to trace the reasoning chain from mutation to recommended treatment.
        </p>

        {!pd ? (
          <Card className="mt-6 p-6 text-[13px] text-muted-foreground">
            Run this case through Mission Control first — the evidence graph is built entirely from that real pipeline output.
          </Card>
        ) : (
          <div className="mt-6 flex flex-col gap-5">
            {(pd.plan?.top_treatments ?? []).map((t) => {
              const sourceMutations = pd.mutations.filter((m) => m.drug && t.drug.toLowerCase().includes(m.drug.toLowerCase()));
              const citations = pd.citations.filter((c) => t.supporting_citations?.some((id) => String(id) === String(c.pmid)));
              const risk = pd.risks.find((r) => r.drug === t.drug);

              return (
                <Card key={t.drug} className="p-5">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-navy text-white">#{t.rank}</Badge>
                    <span className="font-heading text-[15px] font-semibold text-foreground">{t.drug}</span>
                  </div>

                  <div className="mt-3 flex flex-col gap-0.5">
                    <Node icon={Dna} color="bg-navy-tint text-navy" label="Actionable Mutation" detail={sourceMutations.map((m) => `${m.gene} ${m.variant ?? m.aa_change ?? ""}`).join(", ") || "Not directly linked"}>
                      {sourceMutations.map((m) => (
                        <div key={m.gene} className="text-[12px] text-muted-foreground">
                          {m.gene} — oncogenic: {String(m.oncogenic)}, evidence: {m.evidence_level ?? m.evidence ?? "—"}
                        </div>
                      ))}
                    </Node>

                    <Node icon={ShieldCheck} color="bg-teal-tint text-teal-deep" label="Evidence Level" detail={t.evidence_level}>
                      {citations.length === 0 ? (
                        <span className="text-[12px] text-muted-foreground">No linked citations.</span>
                      ) : (
                        citations.map((c) => (
                          <div key={String(c.pmid)} className="text-[12px] text-muted-foreground">
                            PMID {c.pmid} — {c.title}
                          </div>
                        ))
                      )}
                    </Node>

                    <Node icon={Pill} color="bg-navy-tint text-navy" label={`Drug: ${t.drug}`} detail={`Survival benefit score: ${t.survival_benefit_score}`} />

                    <Node icon={FlaskConical} color="bg-teal-tint text-teal-deep" label="Matching Trial" detail={t.matching_trial ? `${t.matching_trial.nct_id} — ${t.matching_trial.title}` : "No open trial matched"} />

                    <Node icon={ShieldAlert} color="bg-coral-tint text-coral-text" label={`Toxicity: ${t.toxicity_risk}`} detail={t.toxicity_notes}>
                      {risk?.adverse_events?.length ? (
                        risk.adverse_events.map((e) => (
                          <div key={e} className="text-[12px] text-muted-foreground">
                            {e}
                          </div>
                        ))
                      ) : (
                        <span className="text-[12px] text-muted-foreground">No adverse events listed.</span>
                      )}
                    </Node>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}
