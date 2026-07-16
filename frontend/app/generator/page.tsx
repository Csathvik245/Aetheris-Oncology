"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Repeat, Flame, Timer, Sparkles, Info, AlertTriangle, GraduationCap } from "lucide-react";
import { Shell } from "../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { Difficulty } from "../lib/mock";
import { saveGeneratedCase, type GeneratedCase } from "../lib/generatedCase";

const DEFAULT_MARKERS = ["EGFR (L858R)", "KRAS (G12C)", "ALK Rearrangement", "BRAF (V600E)", "ROS1 Fusion"];

const SCENARIOS = [
  {
    key: "mutation-change",
    icon: Repeat,
    title: "Mutation Change",
    description: "Round 2 resistance development simulation.",
  },
  {
    key: "toxicity-focus",
    icon: Flame,
    title: "Toxicity Focus",
    description: "Manage severe Grade 3/4 immune-related AEs.",
  },
  {
    key: "rapid-progressor",
    icon: Timer,
    title: "Rapid Progressor",
    description: "Time-sensitive clinical decision tree.",
  },
];

const OBJECTIVES = [
  { key: "trial-matching", title: "Trial Matching", description: "Identify suitable Phase II/III trials" },
  { key: "variant-interpretation", title: "Variant Interpretation", description: "Rare VUS clinical significance" },
  { key: "palliative-integration", title: "Palliative Integration", description: "End-of-life care planning" },
];

const COMPLEXITY_LABELS = ["Beginner", "Intermediate", "Level 3: Interdisciplinary coordination required.", "Expert"];
const VALID_DIFFICULTIES: Difficulty[] = ["Beginner", "Intermediate", "Advanced"];

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v : fallback;
}
function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
}

/** Validates + normalizes the LLM's JSON into a GeneratedCase. Only fills structural
 * gaps (empty arrays/defaults) — never invents clinical content the model didn't return. */
function toGeneratedCase(raw: Record<string, unknown>, input: GeneratedCase["input"]): GeneratedCase {
  const id = `gen-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const pathologyRaw = (raw.pathology as Record<string, unknown>) ?? {};
  const imagingRaw = Array.isArray(raw.imaging) ? (raw.imaging as Record<string, unknown>[]) : [];
  const candidateDrugsRaw = Array.isArray(raw.candidateDrugs) ? (raw.candidateDrugs as Record<string, unknown>[]) : [];
  const markersRaw = Array.isArray(pathologyRaw.markers) ? (pathologyRaw.markers as Record<string, unknown>[]) : [];

  const difficulty = str(raw.difficulty);
  return {
    id,
    createdAt: new Date().toISOString(),
    input,
    title: str(raw.title, `${input.cancerType} — ${input.scenarioTitle}`),
    difficulty: VALID_DIFFICULTIES.includes(difficulty as Difficulty) ? (difficulty as Difficulty) : "Intermediate",
    estMinutes: typeof raw.estMinutes === "number" ? raw.estMinutes : 25,
    stage: str(raw.stage, "Unspecified"),
    tags: strArr(raw.tags),
    age: typeof raw.age === "number" ? raw.age : 60,
    sex: str(raw.sex, "Unspecified"),
    ecog: typeof raw.ecog === "number" ? raw.ecog : 1,
    chiefComplaint: str(raw.chiefComplaint),
    medicalHistory: strArr(raw.medicalHistory),
    imaging: imagingRaw.map((i) => ({
      study: str(i.study, "Imaging Study"),
      date: str(i.date, "on file"),
      finding: str(i.finding),
    })),
    pathology: {
      diagnosis: str(pathologyRaw.diagnosis, input.cancerType),
      markers: markersRaw.map((m) => ({ name: str(m.name), value: str(m.value) })),
      genomicProfile: strArr(pathologyRaw.genomicProfile).length
        ? strArr(pathologyRaw.genomicProfile)
        : input.markers,
    },
    candidateDrugs: candidateDrugsRaw.map((d) => ({ name: str(d.name), subtitle: str(d.subtitle) })),
    toxicityConcerns: strArr(raw.toxicityConcerns),
    clinicalPearl: str(raw.clinicalPearl),
  };
}

export default function CaseGeneratorPage() {
  const [cancerType, setCancerType] = useState("");
  const [metastaticSite, setMetastaticSite] = useState("");
  const [availableMarkers, setAvailableMarkers] = useState<string[]>(DEFAULT_MARKERS);
  const [markers, setMarkers] = useState<string[]>([]);
  const [scenario, setScenario] = useState("");
  const [complexity, setComplexity] = useState([50]);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatedCase, setGeneratedCase] = useState<GeneratedCase | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showCustomMarkerInput, setShowCustomMarkerInput] = useState(false);
  const [customMarkerText, setCustomMarkerText] = useState("");
  const [triedSubmit, setTriedSubmit] = useState(false);

  function toggleMarker(m: string) {
    setMarkers((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  }
  function toggleObjective(k: string) {
    setObjectives((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  }

  function addCustomMarker() {
    const value = customMarkerText.trim();
    if (!value) {
      setShowCustomMarkerInput(false);
      return;
    }
    if (!availableMarkers.includes(value)) {
      setAvailableMarkers((cur) => [...cur, value]);
    }
    setMarkers((cur) => (cur.includes(value) ? cur : [...cur, value]));
    setCustomMarkerText("");
    setShowCustomMarkerInput(false);
  }

  const complexityLabel =
    complexity[0] > 80 ? COMPLEXITY_LABELS[3] : complexity[0] > 55 ? COMPLEXITY_LABELS[2] : complexity[0] > 30 ? COMPLEXITY_LABELS[1] : COMPLEXITY_LABELS[0];

  const errors = {
    cancerType: cancerType.trim().length === 0,
    metastaticSite: metastaticSite.trim().length === 0,
    markers: markers.length === 0,
    scenario: scenario.length === 0,
    objectives: objectives.length === 0,
  };
  const isValid = !Object.values(errors).some(Boolean);

  async function generate() {
    if (!isValid) {
      setTriedSubmit(true);
      return;
    }
    setGenerating(true);
    setGenerationError(null);
    setGeneratedCase(null);

    const scenarioTitle = SCENARIOS.find((s) => s.key === scenario)?.title ?? scenario;
    const objectiveTitles = objectives.map((k) => OBJECTIVES.find((o) => o.key === k)?.title ?? k);
    const input = {
      cancerType,
      metastaticSite,
      markers: [...markers],
      scenario,
      scenarioTitle,
      complexity: complexity[0],
      objectives: [...objectives],
    };

    try {
      const res = await fetch("/api/generate-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, objectiveTitles }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerationError(data.error ?? `Generation failed (${res.status}).`);
        return;
      }
      const c = toGeneratedCase(data.case, input);
      saveGeneratedCase(c);
      setGeneratedCase(c);
    } catch {
      setGenerationError("Could not reach the generation service. Check your connection and try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Shell breadcrumb="Aetheris  ›  Case Generator">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-[24px] font-bold tracking-tight text-foreground">Synthetic Case Generator</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Configure a training case built to drill a specific competency. Not derived from real patient data.
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5 text-muted-foreground">
            <Info size={13} /> Live generation via Groq
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* main ~70% */}
          <Card className="col-span-2 p-5">
            <h3 className="font-heading text-[15px] font-semibold text-foreground">Configuration Module</h3>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="label mb-1.5 block">
                  Cancer Type <span className="text-coral-text">*</span>
                </label>
                <Input
                  value={cancerType}
                  onChange={(e) => setCancerType(e.target.value)}
                  placeholder="e.g. Non-Small Cell Lung Cancer"
                  aria-invalid={triedSubmit && errors.cancerType}
                />
                {triedSubmit && errors.cancerType && (
                  <p className="mt-1 text-[11.5px] text-coral-text">Cancer type is required.</p>
                )}
              </div>
              <div>
                <label className="label mb-1.5 block">
                  Metastatic Site <span className="text-coral-text">*</span>
                </label>
                <Input
                  value={metastaticSite}
                  onChange={(e) => setMetastaticSite(e.target.value)}
                  placeholder="e.g. Central Nervous System (Brain)"
                  aria-invalid={triedSubmit && errors.metastaticSite}
                />
                {triedSubmit && errors.metastaticSite && (
                  <p className="mt-1 text-[11.5px] text-coral-text">Metastatic site is required.</p>
                )}
              </div>
            </div>

            <div className="mt-5">
              <label className="label mb-2 block">
                Mutation Profile Selection <span className="text-coral-text">*</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {availableMarkers.map((m) => (
                  <button
                    key={m}
                    onClick={() => toggleMarker(m)}
                    className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                      markers.includes(m)
                        ? "border-navy bg-navy text-white"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {m}
                  </button>
                ))}
                {showCustomMarkerInput ? (
                  <span className="flex items-center gap-1.5">
                    <Input
                      autoFocus
                      value={customMarkerText}
                      onChange={(e) => setCustomMarkerText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addCustomMarker();
                        if (e.key === "Escape") {
                          setShowCustomMarkerInput(false);
                          setCustomMarkerText("");
                        }
                      }}
                      placeholder="Gene (variant)"
                      className="h-8 w-40 text-[12.5px]"
                    />
                    <Button size="sm" className="h-8 bg-navy text-white hover:bg-navy/90" onClick={addCustomMarker}>
                      Add
                    </Button>
                  </span>
                ) : (
                  <button
                    onClick={() => setShowCustomMarkerInput(true)}
                    className="flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-[12.5px] text-muted-foreground hover:bg-muted"
                  >
                    <Plus size={13} /> Custom Marker
                  </button>
                )}
              </div>
              {triedSubmit && errors.markers && (
                <p className="mt-1.5 text-[11.5px] text-coral-text">Select at least one mutation marker.</p>
              )}
            </div>

            <div className="mt-5">
              <label className="label mb-2 block">
                Dynamic Scenario Layer <span className="text-coral-text">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setScenario(s.key)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      scenario === s.key ? "border-navy bg-navy-tint" : "border-border hover:bg-muted"
                    }`}
                  >
                    <s.icon size={18} className={scenario === s.key ? "text-navy" : "text-muted-foreground"} />
                    <div className={`mt-2 text-[13px] font-semibold ${scenario === s.key ? "text-navy" : "text-foreground"}`}>
                      {s.title}
                    </div>
                    <div className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{s.description}</div>
                  </button>
                ))}
              </div>
              {triedSubmit && errors.scenario && (
                <p className="mt-1.5 text-[11.5px] text-coral-text">Select a scenario layer.</p>
              )}
            </div>
          </Card>

          {/* right ~30% */}
          <div className="flex flex-col gap-5">
            <Card className="p-5">
              <label className="label mb-1 block">Simulation Complexity</label>
              <div className="mb-2 flex justify-between text-[11px] text-muted-foreground">
                <span>Beginner</span>
                <span>Expert</span>
              </div>
              <Slider
                value={complexity}
                onValueChange={(v) => setComplexity(Array.isArray(v) ? v : [v])}
                min={0}
                max={100}
                step={1}
              />
              <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">{complexityLabel}</p>
            </Card>

            <Card className="p-5">
              <label className="label mb-2 block">
                Clinical Learning Objective <span className="text-coral-text">*</span>
              </label>
              <div className="flex flex-col gap-3">
                {OBJECTIVES.map((o) => (
                  <label key={o.key} className="flex cursor-pointer items-start gap-2.5">
                    <Checkbox
                      checked={objectives.includes(o.key)}
                      onCheckedChange={() => toggleObjective(o.key)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-[13px] font-semibold text-foreground">{o.title}</div>
                      <div className="text-[11.5px] text-muted-foreground">{o.description}</div>
                    </div>
                  </label>
                ))}
              </div>
              {triedSubmit && errors.objectives && (
                <p className="mt-2 text-[11.5px] text-coral-text">Select at least one learning objective.</p>
              )}
            </Card>

            <Button
              onClick={generate}
              disabled={generating}
              className="w-full gap-2 bg-navy py-5 text-white hover:bg-navy/90 disabled:opacity-50"
            >
              <Sparkles size={16} /> {generating ? "Generating…" : "Generate Synthetic Case"}
            </Button>
            {triedSubmit && !isValid && (
              <p className="text-center text-[11.5px] text-coral-text">
                Fill in all required fields (marked *) before generating.
              </p>
            )}
            {generationError && (
              <div className="flex items-start gap-2 rounded-lg border border-coral-ring bg-coral-tint p-3">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-coral-text" />
                <p className="text-[12px] leading-relaxed text-coral-text">{generationError}</p>
              </div>
            )}
          </div>
        </div>

        {generatedCase && (
          <Card className="fade-up mt-6 overflow-hidden p-0">
            <div className="p-5">
              <div className="flex items-center gap-2">
                <Badge className="bg-teal-tint text-teal-deep">Generated</Badge>
                <Badge variant="outline" className="text-muted-foreground">{generatedCase.difficulty}</Badge>
                <Badge variant="outline" className="text-muted-foreground">{generatedCase.estMinutes} min</Badge>
              </div>
              <h3 className="mt-3 font-heading text-[19px] font-bold text-foreground">{generatedCase.title}</h3>
              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
                {generatedCase.chiefComplaint}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-4 text-[13px]">
                <div>
                  <div className="label">Age / Sex</div>
                  <div className="mt-0.5 font-semibold text-foreground">
                    {generatedCase.age} / {generatedCase.sex}
                  </div>
                </div>
                <div>
                  <div className="label">Stage</div>
                  <div className="mt-0.5 font-semibold text-foreground">{generatedCase.stage}</div>
                </div>
                <div>
                  <div className="label">ECOG PS</div>
                  <div className="mt-0.5 font-semibold text-foreground">{generatedCase.ecog}</div>
                </div>
                <div className="col-span-3">
                  <div className="label">Genomic Profile</div>
                  <div className="mt-0.5 flex flex-wrap gap-1.5">
                    {generatedCase.pathology.genomicProfile.map((m) => (
                      <span key={m} className="rounded-md bg-navy px-2 py-0.5 text-[11px] font-semibold text-white">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                {generatedCase.candidateDrugs.length > 0 && (
                  <div className="col-span-3">
                    <div className="label">Candidate Regimens</div>
                    <div className="mt-0.5 flex flex-col gap-1">
                      {generatedCase.candidateDrugs.map((d) => (
                        <div key={d.name} className="text-[12.5px] text-foreground">
                          <span className="font-semibold">{d.name}</span>
                          {d.subtitle && <span className="text-muted-foreground"> — {d.subtitle}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {generatedCase.clinicalPearl && (
                  <p className="col-span-3 rounded-lg bg-muted p-3 text-[12px] italic leading-relaxed text-muted-foreground">
                    &ldquo;{generatedCase.clinicalPearl}&rdquo;
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border bg-background px-5 py-3">
              <span className="text-[11px] text-muted-foreground">Generated live — saved to your device</span>
              <Link href={`/cases/${generatedCase.id}`}>
                <Button className="gap-1.5 bg-navy text-white hover:bg-navy/90">
                  <GraduationCap size={15} /> Practice This Case
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </Shell>
  );
}
