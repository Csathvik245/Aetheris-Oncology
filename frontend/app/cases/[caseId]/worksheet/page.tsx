"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Search, X, Plus, Lightbulb } from "lucide-react";
import { Shell } from "../../../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WORKSHEET_DRUGS, TOXICITY_TAGS, WORKSHEET_TIP, WORKSHEET_STEPS } from "../../../lib/mock";
import { usePacket, isGeneratedCaseId, getGeneratedCase } from "../../../lib/generatedCase";
import { saveSubmission } from "../../../lib/session";
import { searchDrugCatalog } from "../../../lib/drugCatalog";

interface DrugEntry {
  key: string;
  name: string;
  subtitle: string;
  rationale: string;
  citation: string;
}
type Phase = "first" | "second" | "maintenance";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const MONITORING_LABELS: Record<string, string> = {
  "weekly-cbc": "Weekly CBC + CMP",
  "biweekly-cbc": "Biweekly CBC + CMP",
  "monthly-imaging": "Monthly Restaging Imaging",
};

const PHASES: { key: Phase; title: string; subtitle: string }[] = [
  { key: "first", title: "First-Line", subtitle: "Initial Systemic Therapy" },
  { key: "second", title: "Second-Line", subtitle: "Resistance Management" },
  { key: "maintenance", title: "Maintenance", subtitle: "Consolidation Phase" },
];

export default function WorksheetPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);
  const packet = usePacket(caseId);
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("second");
  const [drugs, setDrugs] = useState<DrugEntry[]>(
    WORKSHEET_DRUGS.map((d) => ({ ...d, rationale: "", citation: "" }))
  );
  const [monitoring, setMonitoring] = useState("weekly-cbc");
  const [doseModification, setDoseModification] = useState("");
  const [toxicityOptions, setToxicityOptions] = useState<string[]>(TOXICITY_TAGS);
  const [tags, setTags] = useState<string[]>(["Neutropenia", "Pneumonitis"]);
  const [confidence, setConfidence] = useState([75]);
  const [diagnosisNote, setDiagnosisNote] = useState("");
  const [biomarkerChecks, setBiomarkerChecks] = useState<Record<string, boolean>>(
    Object.fromEntries(packet.pathology.genomicProfile.map((g) => [g, true]))
  );
  const [tip, setTip] = useState(WORKSHEET_TIP);
  const [showErrors, setShowErrors] = useState(false);
  const [drugQuery, setDrugQuery] = useState("");
  const [activeMatch, setActiveMatch] = useState(0);
  const drugMatches = searchDrugCatalog(drugQuery);

  function addDrug(name: string, subtitle: string) {
    const key = slugify(name);
    setDrugs((cur) => (cur.some((d) => d.key === key) ? cur : [...cur, { key, name, subtitle, rationale: "", citation: "" }]));
    setDrugQuery("");
    setActiveMatch(0);
  }

  // Once real generated-case data resolves (usePacket loads it from
  // localStorage after mount), pull this specific case's own candidate
  // regimens, toxicity concerns, and clinical pearl into the worksheet
  // instead of the fixed mock defaults. One-shot bootstrap, not a subscription.
  useEffect(() => {
    if (!isGeneratedCaseId(caseId) || packet.caseId !== caseId) return;
    const g = getGeneratedCase(caseId);
    if (!g) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBiomarkerChecks(Object.fromEntries(packet.pathology.genomicProfile.map((m) => [m, true])));
    if (g.candidateDrugs.length > 0) {
      setDrugs(
        g.candidateDrugs.map((d) => ({ key: slugify(d.name), name: d.name, subtitle: d.subtitle, rationale: "", citation: "" }))
      );
    }
    if (g.toxicityConcerns.length > 0) {
      setToxicityOptions((cur) => Array.from(new Set([...cur, ...g.toxicityConcerns])));
      setTags(g.toxicityConcerns);
    }
    if (g.clinicalPearl) setTip(g.clinicalPearl);
  }, [caseId, packet]);

  function removeDrug(key: string) {
    setDrugs((d) => d.filter((x) => x.key !== key));
  }
  function toggleTag(tag: string) {
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  }

  function stepErrors(s: number): string[] {
    switch (s) {
      case 0:
        return diagnosisNote.trim() ? [] : ["Staging rationale is required."];
      case 1:
        return Object.values(biomarkerChecks).some(Boolean)
          ? []
          : ["Select at least one biomarker to prioritize."];
      case 2: {
        const errs: string[] = [];
        if (drugs.length === 0) errs.push("At least one drug is required in the regimen.");
        if (drugs.some((d) => !d.rationale.trim() || !d.citation.trim())) {
          errs.push("Every drug needs a clinical rationale and an evidence citation.");
        }
        if (!doseModification.trim()) errs.push("Dose modification protocol is required.");
        return errs;
      }
      case 3:
        return tags.length > 0 ? [] : ["Flag at least one toxicity concern."];
      default:
        return [];
    }
  }

  const currentErrors = showErrors ? stepErrors(step) : [];
  const allStepsValid = WORKSHEET_STEPS.every((_, i) => stepErrors(i).length === 0);

  function goToStep(i: number) {
    if (i > step) return; // forward jumps must go through validated Next
    setShowErrors(false);
    setStep(i);
  }

  function goNext() {
    const errs = stepErrors(step);
    if (errs.length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep((s) => Math.min(WORKSHEET_STEPS.length - 1, s + 1));
  }

  return (
    <Shell breadcrumb={`Case #${packet.caseId} — Clinical Decision Worksheet`}>
      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* stepper */}
        <div className="mb-6 flex items-center">
          {WORKSHEET_STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={label} className="flex flex-1 items-center last:flex-none">
                <button
                  onClick={() => goToStep(i)}
                  disabled={i > step}
                  className="flex flex-col items-center gap-1.5 disabled:cursor-not-allowed"
                >
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full text-[12px] font-semibold transition-colors ${
                      done
                        ? "bg-teal text-white"
                        : active
                          ? "bg-navy text-white"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <Check size={15} /> : i + 1}
                  </span>
                  <span
                    className={`whitespace-nowrap text-[11.5px] font-medium ${
                      active ? "text-navy" : done ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </button>
                {i < WORKSHEET_STEPS.length - 1 && (
                  <div className={`mx-2 h-px flex-1 ${done ? "bg-teal" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-6 pb-28">
          {/* main panel ~65% */}
          <div className="col-span-2 flex flex-col gap-5">
            {step === 0 && (
              <Card className="p-5">
                <h3 className="font-heading text-[15px] font-semibold text-foreground">Diagnosis</h3>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Confirm the primary diagnosis and staging basis from the patient packet before proceeding.
                </p>
                <div className="mt-4 rounded-lg border border-navy bg-navy-tint p-4">
                  <div className="text-[13.5px] font-semibold text-navy">{packet.pathology.diagnosis}</div>
                  <div className="text-[12px] text-muted-foreground">Confirmed on pathology review</div>
                </div>
                <label className="label mt-4 block">Staging Rationale</label>
                <Textarea
                  value={diagnosisNote}
                  onChange={(e) => setDiagnosisNote(e.target.value)}
                  placeholder="Explain the staging basis from imaging and pathology..."
                  className="mt-1.5"
                />
              </Card>
            )}

            {step === 1 && (
              <Card className="p-5">
                <h3 className="font-heading text-[15px] font-semibold text-foreground">Biomarker Priority</h3>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Select and rank the biomarkers that should drive this treatment decision.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {packet.pathology.genomicProfile.map((g, i) => (
                    <button
                      key={g}
                      onClick={() => setBiomarkerChecks((s) => ({ ...s, [g]: !s[g] }))}
                      className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left"
                    >
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-[13.5px] font-medium text-foreground">{g}</span>
                      {biomarkerChecks[g] && <Check size={16} className="text-teal-deep" />}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {step === 2 && (
              <Card className="p-5">
                <h3 className="font-heading text-[15px] font-semibold text-foreground">Treatment Planning</h3>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {PHASES.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setPhase(p.key)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        phase === p.key ? "border-navy bg-navy-tint" : "border-border hover:bg-muted"
                      }`}
                    >
                      <div
                        className={`text-[13px] font-semibold ${phase === p.key ? "text-navy" : "text-foreground"}`}
                      >
                        {p.title}
                      </div>
                      <div className="text-[11.5px] text-muted-foreground">{p.subtitle}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-5 border-t border-border pt-4">
                  <div className="label mb-2">Combination Strategy Builder</div>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={drugQuery}
                      onChange={(e) => {
                        setDrugQuery(e.target.value);
                        setActiveMatch(0);
                      }}
                      onKeyDown={(e) => {
                        if (drugMatches.length === 0) return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setActiveMatch((i) => Math.min(i + 1, drugMatches.length - 1));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setActiveMatch((i) => Math.max(i - 1, 0));
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          const m = drugMatches[activeMatch];
                          if (m) addDrug(m.name, m.subtitle);
                        } else if (e.key === "Escape") {
                          setDrugQuery("");
                        }
                      }}
                      placeholder="Search drugs (e.g., Letrozole, Carboplatin...)"
                      className="pl-9"
                    />
                    {drugMatches.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                        {drugMatches.map((m, i) => (
                          <button
                            key={m.name}
                            onClick={() => addDrug(m.name, m.subtitle)}
                            onMouseEnter={() => setActiveMatch(i)}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-[12.5px] ${
                              i === activeMatch ? "bg-navy-tint text-navy" : "text-foreground hover:bg-muted"
                            }`}
                          >
                            <span className="font-medium">{m.name}</span>
                            <span className="text-[11px] text-muted-foreground">{m.subtitle}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {drugQuery.trim().length > 0 && drugMatches.length === 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card p-3 text-[12px] text-muted-foreground shadow-lg">
                        No match in the drug catalog for &ldquo;{drugQuery}&rdquo;.
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-col gap-3">
                    {drugs.map((d) => (
                      <div key={d.key} className="rounded-lg border border-border p-3.5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-7 w-7 place-items-center rounded-md bg-navy text-[11px] font-bold text-white">
                              {d.name[0]}
                            </span>
                            <div>
                              <div className="text-[13.5px] font-semibold text-foreground">{d.name}</div>
                              <div className="text-[11.5px] text-muted-foreground">{d.subtitle}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeDrug(d.key)}
                            className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <label className="label">Clinical Rationale</label>
                            <Textarea
                              placeholder="Explain the selection logic..."
                              className="mt-1 min-h-16 text-[12.5px]"
                              value={d.rationale}
                              onChange={(e) =>
                                setDrugs((all) =>
                                  all.map((x) => (x.key === d.key ? { ...x, rationale: e.target.value } : x))
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="label">Evidence Citation</label>
                            <Textarea
                              placeholder="NCCN Guidelines, FLAURA trial..."
                              className="mt-1 min-h-16 text-[12.5px]"
                              value={d.citation}
                              onChange={(e) =>
                                setDrugs((all) =>
                                  all.map((x) => (x.key === d.key ? { ...x, citation: e.target.value } : x))
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 border-t border-border pt-4">
                  <div className="label mb-2">Toxicity &amp; Monitoring</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Monitoring Strategy</label>
                      <Select value={monitoring} onValueChange={(v) => v && setMonitoring(v)}>
                        <SelectTrigger className="mt-1.5 w-full">
                          <SelectValue>{(v: string) => MONITORING_LABELS[v] ?? v}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly-cbc">Weekly CBC + CMP</SelectItem>
                          <SelectItem value="biweekly-cbc">Biweekly CBC + CMP</SelectItem>
                          <SelectItem value="monthly-imaging">Monthly Restaging Imaging</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="label">Dose Modification Protocol (Grade 3/4)</label>
                      <Textarea
                        value={doseModification}
                        onChange={(e) => setDoseModification(e.target.value)}
                        placeholder="Define protocols for significant adverse events..."
                        className="mt-1.5 min-h-10"
                      />
                    </div>
                  </div>
                  <label className="label mt-3 block">Major Concerns</label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {toxicityOptions.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                          tags.includes(tag)
                            ? "border-coral-ring bg-coral-tint text-coral-text"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                    <button className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-[12px] text-muted-foreground hover:bg-muted">
                      <Plus size={12} /> Add Tag
                    </button>
                  </div>
                </div>
              </Card>
            )}

            {step === 3 && (
              <Card className="p-5">
                <h3 className="font-heading text-[15px] font-semibold text-foreground">Toxicity Planning</h3>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Confirm the monitoring cadence and flagged concerns before final review.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.length === 0 && (
                    <span className="text-[13px] text-muted-foreground">No concerns flagged yet — return to Treatment Planning to add tags.</span>
                  )}
                  {tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-coral-tint px-3 py-1 text-[12px] font-medium text-coral-text">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-border p-3">
                  <div className="label">Monitoring Strategy</div>
                  <div className="mt-1 text-[13.5px] font-semibold text-foreground">
                    {monitoring === "weekly-cbc"
                      ? "Weekly CBC + CMP"
                      : monitoring === "biweekly-cbc"
                        ? "Biweekly CBC + CMP"
                        : "Monthly Restaging Imaging"}
                  </div>
                </div>
              </Card>
            )}

            {step === 4 && (
              <Card className="p-5">
                <h3 className="font-heading text-[15px] font-semibold text-foreground">Final Review</h3>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Review your submission before sending it to the AI Orchestrator for multi-agent analysis.
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <div className="label">Treatment Phase</div>
                    <div className="mt-1 text-[13.5px] font-semibold text-foreground">
                      {PHASES.find((p) => p.key === phase)?.title}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="label">Proposed Regimen</div>
                    <div className="mt-1 text-[13.5px] font-semibold text-foreground">
                      {drugs.map((d) => d.name).join(" + ") || "No drugs selected"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="label">Confidence</div>
                    <div className="mt-1 text-[13.5px] font-semibold text-foreground">{confidence[0]}%</div>
                  </div>
                </div>
              </Card>
            )}

            {currentErrors.length > 0 && (
              <div className="rounded-lg border border-coral-ring bg-coral-tint p-3">
                {currentErrors.map((e) => (
                  <p key={e} className="text-[12.5px] text-coral-text">
                    {e}
                  </p>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <Button
                variant="outline"
                disabled={step === 0}
                onClick={() => {
                  setShowErrors(false);
                  setStep((s) => Math.max(0, s - 1));
                }}
              >
                Back
              </Button>
              {step < WORKSHEET_STEPS.length - 1 && (
                <Button className="bg-navy text-white hover:bg-navy/90" onClick={goNext}>
                  Next
                </Button>
              )}
            </div>
          </div>

          {/* right rail ~35% */}
          <div className="flex flex-col gap-5">
            <Card className="bg-navy p-5 text-white">
              <div className="label !text-white/60">Active Patient</div>
              <div className="mt-1 text-[15px] font-bold">{packet.displayId}</div>
              <div className="text-[12px] text-white/70">
                {packet.age}Y / {packet.sex} / {packet.pathology.diagnosis}
              </div>
              <div className="mt-3 flex flex-col gap-1.5 border-t border-white/15 pt-3 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Primary Mutation</span>
                  <span className="font-semibold">{packet.pathology.genomicProfile[0]}</span>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-heading text-[13.5px] font-semibold text-foreground">Resident Confidence</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">
                How certain are you that this treatment plan accounts for current resistance markers and patient
                performance status?
              </p>
              <Slider
                value={confidence}
                onValueChange={(v) => setConfidence(Array.isArray(v) ? v : [v])}
                min={0}
                max={100}
                step={1}
                className="mt-5"
              />
              <div className="mt-2 flex justify-between text-[10.5px] uppercase tracking-wide text-muted-foreground">
                <span>Uncertain</span>
                <span>Absolute</span>
              </div>
              <div className="mt-2 text-center font-heading text-2xl font-bold text-navy">{confidence[0]}%</div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start gap-2">
                <Lightbulb size={16} className="mt-0.5 shrink-0 text-coral-text" />
                <div>
                  <div className="text-[12px] font-semibold text-foreground">Did you know?</div>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{tip}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* sticky action bar */}
      <div className="sticky bottom-0 flex items-center justify-between border-t border-border bg-card px-6 py-3">
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-teal" /> Last autosaved 2m ago
        </span>
        <div className="flex gap-2">
          <Button variant="outline">Save Draft</Button>
          <Button
            className="bg-navy text-white hover:bg-navy/90 disabled:opacity-50"
            disabled={!allStepsValid || step !== WORKSHEET_STEPS.length - 1}
            onClick={() => {
              saveSubmission({
                caseId,
                phase,
                drugs: drugs.map((d) => ({ name: d.name, rationale: d.rationale, citation: d.citation })),
                monitoring,
                doseModification,
                tags,
                confidence: confidence[0],
                diagnosisNote,
                submittedAt: new Date().toISOString(),
              });
              router.push(`/cases/${caseId}/mission-control`);
            }}
          >
            Submit to AI Orchestrator
          </Button>
        </div>
      </div>
    </Shell>
  );
}
