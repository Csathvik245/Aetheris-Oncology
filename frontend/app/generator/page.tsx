"use client";

import { useState } from "react";
import { Plus, Repeat, Flame, Timer, Sparkles, Info } from "lucide-react";
import { Shell } from "../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

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

interface Preview {
  patientId: string;
  cancerType: string;
  metastaticSite: string;
  markers: string[];
  scenarioTitle: string;
  complexityLabel: string;
  objectiveTitles: string[];
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
  const [preview, setPreview] = useState<Preview | null>(null);
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

  function generate() {
    if (!isValid) {
      setTriedSubmit(true);
      return;
    }
    setGenerating(true);
    setTimeout(() => {
      const id = Math.floor(10000 + Math.random() * 90000);
      const scenarioTitle = SCENARIOS.find((s) => s.key === scenario)?.title ?? scenario;
      setPreview({
        patientId: `Synthetic-${id}`,
        cancerType,
        metastaticSite,
        markers: [...markers],
        scenarioTitle,
        complexityLabel,
        objectiveTitles: objectives.map((k) => OBJECTIVES.find((o) => o.key === k)?.title ?? k),
      });
      setGenerating(false);
    }, 600);
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
            <Info size={13} /> Mock preview — no generation backend connected
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
          </div>
        </div>

        {preview && (
          <Card className="fade-up mt-6 overflow-hidden p-0">
            <div className="p-5">
              <Badge variant="outline" className="text-muted-foreground">Mock Preview</Badge>
              <h3 className="mt-3 font-heading text-[19px] font-bold text-foreground">Patient {preview.patientId}</h3>
              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
                Synthetic case configured with the parameters below. No generation model has run — this is a
                structured echo of your configuration for review before a real case-generation backend is connected.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4 text-[13px]">
                <div>
                  <div className="label">Cancer Type</div>
                  <div className="mt-0.5 font-semibold text-foreground">{preview.cancerType}</div>
                </div>
                <div>
                  <div className="label">Metastatic Site</div>
                  <div className="mt-0.5 font-semibold text-foreground">{preview.metastaticSite}</div>
                </div>
                <div>
                  <div className="label">Scenario</div>
                  <div className="mt-0.5 font-semibold text-foreground">{preview.scenarioTitle}</div>
                </div>
                <div>
                  <div className="label">Complexity</div>
                  <div className="mt-0.5 font-semibold text-foreground">{preview.complexityLabel}</div>
                </div>
                <div>
                  <div className="label">Mutation Profile</div>
                  <div className="mt-0.5 flex flex-wrap gap-1.5">
                    {preview.markers.map((m) => (
                      <span key={m} className="rounded-md bg-navy px-2 py-0.5 text-[11px] font-semibold text-white">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="label">Learning Objectives</div>
                  <div className="mt-0.5 font-semibold text-foreground">{preview.objectiveTitles.join(", ")}</div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Shell>
  );
}
