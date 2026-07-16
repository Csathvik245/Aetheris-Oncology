"use client";

import { useState } from "react";
import { Plus, Repeat, Flame, Timer, Sparkles, ShieldCheck, Database, GraduationCap } from "lucide-react";
import { Shell } from "../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

const MARKERS = ["EGFR (L858R)", "KRAS (G12C)", "ALK Rearrangement", "BRAF (V600E)", "ROS1 Fusion"];

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
  summary: string;
  confidence: number;
  nodes: number;
}

export default function CaseGeneratorPage() {
  const [cancerType, setCancerType] = useState("Non-Small Cell Lung Cancer");
  const [metastaticSite, setMetastaticSite] = useState("Central Nervous System (Brain)");
  const [markers, setMarkers] = useState<string[]>(["EGFR (L858R)"]);
  const [scenario, setScenario] = useState("mutation-change");
  const [complexity, setComplexity] = useState([62]);
  const [objectives, setObjectives] = useState<string[]>(["variant-interpretation"]);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  function toggleMarker(m: string) {
    setMarkers((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  }
  function toggleObjective(k: string) {
    setObjectives((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  }

  function generate() {
    setGenerating(true);
    setTimeout(() => {
      const id = Math.floor(10000 + Math.random() * 90000);
      setPreview({
        patientId: `Synthetic-${id}`,
        summary: `The engine is synthesizing a 64-year-old patient profile with metastatic ${cancerType.toLowerCase()}, integrating NGS data showing ${
          markers[0] ?? "an unspecified marker"
        } with a ${scenario.replace("-", " ")} scenario layer.`,
        confidence: 96 + Math.random() * 3,
        nodes: 900 + Math.floor(Math.random() * 500),
      });
      setGenerating(false);
    }, 900);
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
          <Badge className="gap-1.5 bg-teal-tint text-teal-deep">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-teal-deep" /> Core Engine 4.2: Active
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* main ~70% */}
          <Card className="col-span-2 p-5">
            <h3 className="font-heading text-[15px] font-semibold text-foreground">Configuration Module</h3>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="label mb-1.5 block">Cancer Type</label>
                <Input value={cancerType} onChange={(e) => setCancerType(e.target.value)} />
              </div>
              <div>
                <label className="label mb-1.5 block">Metastatic Site</label>
                <Input value={metastaticSite} onChange={(e) => setMetastaticSite(e.target.value)} />
              </div>
            </div>

            <div className="mt-5">
              <label className="label mb-2 block">Mutation Profile Selection</label>
              <div className="flex flex-wrap gap-2">
                {MARKERS.map((m) => (
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
                <button className="flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-[12.5px] text-muted-foreground hover:bg-muted">
                  <Plus size={13} /> Custom Marker
                </button>
              </div>
            </div>

            <div className="mt-5">
              <label className="label mb-2 block">Dynamic Scenario Layer</label>
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
              <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                {complexity[0] > 80 ? COMPLEXITY_LABELS[3] : complexity[0] > 55 ? COMPLEXITY_LABELS[2] : complexity[0] > 30 ? COMPLEXITY_LABELS[1] : COMPLEXITY_LABELS[0]}
              </p>
            </Card>

            <Card className="p-5">
              <label className="label mb-2 block">Clinical Learning Objective</label>
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
            </Card>

            <Button onClick={generate} disabled={generating} className="w-full gap-2 bg-navy py-5 text-white hover:bg-navy/90">
              <Sparkles size={16} /> {generating ? "Generating…" : "Generate Synthetic Case"}
            </Button>
          </div>
        </div>

        {preview && (
          <Card className="fade-up mt-6 overflow-hidden p-0">
            <div className="p-5">
              <Badge className="bg-navy-tint text-navy">Pre-Generation Estimate</Badge>
              <h3 className="mt-3 font-heading text-[19px] font-bold text-foreground">Patient {preview.patientId}</h3>
              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">{preview.summary}</p>
              <div className="mt-4 flex items-center gap-8">
                <div>
                  <div className="label">Confidence</div>
                  <div className="font-heading text-2xl font-bold text-teal-deep tnum">{preview.confidence.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="label">Nodes Generated</div>
                  <div className="font-heading text-2xl font-bold text-navy tnum">{preview.nodes.toLocaleString()}</div>
                </div>
              </div>
              <p className="mt-4 max-w-lg rounded-lg bg-muted p-3 text-[12px] italic leading-relaxed text-muted-foreground">
                &ldquo;Ready for deployment. This case will test longitudinal treatment transitions and secondary
                resistance management.&rdquo;
              </p>
            </div>
            <div className="flex items-center gap-5 border-t border-border bg-background px-5 py-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} /> Clinically Validated Engine v4.2
              </span>
              <span className="flex items-center gap-1.5">
                <Database size={13} /> Connected to SEER Database 2024
              </span>
              <span className="flex items-center gap-1.5">
                <GraduationCap size={13} /> Compliant with ACGME Educational Standards
              </span>
            </div>
          </Card>
        )}
      </div>
    </Shell>
  );
}
