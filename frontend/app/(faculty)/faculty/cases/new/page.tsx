"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, CheckCircle2 } from "lucide-react";
import { Shell } from "@/app/components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/app/lib/supabase/AuthProvider";
import { createClient } from "@/app/lib/supabase/client";

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;

function csv(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function FacultyCaseBuilderPage() {
  const router = useRouter();
  const { profile } = useAuth();

  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("Intermediate");
  const [stage, setStage] = useState("");
  const [tags, setTags] = useState("");
  const [estMinutes, setEstMinutes] = useState(20);

  const [age, setAge] = useState(60);
  const [sex, setSex] = useState("Female");
  const [ecog, setEcog] = useState(1);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [imagingStudy, setImagingStudy] = useState("");
  const [imagingFinding, setImagingFinding] = useState("");

  const [diagnosis, setDiagnosis] = useState("");
  const [markers, setMarkers] = useState("");
  const [genomicProfile, setGenomicProfile] = useState("");

  const [candidateDrugs, setCandidateDrugs] = useState("");
  const [toxicityConcerns, setToxicityConcerns] = useState("");
  const [clinicalPearl, setClinicalPearl] = useState("");
  const [questions, setQuestions] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isValid = title.trim() && diagnosis.trim() && chiefComplaint.trim() && genomicProfile.trim();

  async function save() {
    if (!isValid || !profile) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const id = `faculty-${crypto.randomUUID()}`;

    const { error: insertError } = await supabase.from("cases").insert({
      id,
      institution_id: profile.institution_id,
      owner_id: profile.id,
      source: "faculty_authored",
      visibility: "institution",
      title: title.trim(),
      difficulty,
      est_minutes: estMinutes,
      stage: stage.trim() || null,
      tags: csv(tags),
      age,
      sex,
      ecog,
      chief_complaint: chiefComplaint.trim(),
      medical_history: csv(medicalHistory),
      imaging: imagingStudy.trim() ? [{ study: imagingStudy.trim(), date: "Recent", finding: imagingFinding.trim() }] : [],
      pathology: {
        diagnosis: diagnosis.trim(),
        markers: csv(markers).map((m) => {
          const [name, value] = m.split(":").map((x) => x.trim());
          return { name, value: value ?? "Positive" };
        }),
        genomicProfile: csv(genomicProfile),
      },
      candidate_drugs: csv(candidateDrugs).map((name) => ({ name, subtitle: "" })),
      toxicity_concerns: csv(toxicityConcerns),
      clinical_pearl: clinicalPearl.trim() || null,
      objective_titles: csv(questions),
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSaved(true);
    setTimeout(() => router.push(`/cases/${id}`), 1200);
  }

  return (
    <Shell breadcrumb="Case Builder">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy text-white">
            <FilePlus2 size={17} />
          </span>
          <div>
            <h1 className="font-heading text-[22px] font-bold tracking-tight text-foreground">Faculty Case Builder</h1>
            <p className="text-[13px] text-muted-foreground">
              Author a case for your institution's residents to practice — no AI generation, your own clinical content.
            </p>
          </div>
        </div>

        <Card className="mt-6 p-6">
          <h3 className="font-heading text-[14px] font-semibold text-foreground">Basics</h3>
          <label className="label mb-1.5 mt-4 block">Case Title *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Refractory DLBCL with CNS Involvement" />

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <label className="label mb-1.5 block">Difficulty</label>
              <Select value={difficulty} onValueChange={(v) => v && setDifficulty(v as typeof difficulty)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="label mb-1.5 block">Stage</label>
              <Input value={stage} onChange={(e) => setStage(e.target.value)} placeholder="e.g. IV" />
            </div>
            <div>
              <label className="label mb-1.5 block">Est. Minutes</label>
              <Input type="number" value={estMinutes} onChange={(e) => setEstMinutes(Number(e.target.value) || 20)} />
            </div>
          </div>

          <label className="label mb-1.5 mt-4 block">Tags (comma-separated)</label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="TKI RESISTANCE, STAGING" />
        </Card>

        <Card className="mt-5 p-6">
          <h3 className="font-heading text-[14px] font-semibold text-foreground">Patient Packet</h3>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <label className="label mb-1.5 block">Age</label>
              <Input type="number" value={age} onChange={(e) => setAge(Number(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label mb-1.5 block">Sex</label>
              <Select value={sex} onValueChange={(v) => v && setSex(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="label mb-1.5 block">ECOG</label>
              <Input type="number" min={0} max={4} value={ecog} onChange={(e) => setEcog(Number(e.target.value) || 0)} />
            </div>
          </div>

          <label className="label mb-1.5 mt-4 block">Chief Complaint *</label>
          <Textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} placeholder="Patient-reported symptoms..." />

          <label className="label mb-1.5 mt-4 block">Medical History (comma-separated)</label>
          <Input value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} placeholder="Type 2 diabetes, Prior smoking history" />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1.5 block">Imaging Study</label>
              <Input value={imagingStudy} onChange={(e) => setImagingStudy(e.target.value)} placeholder="PET-CT" />
            </div>
            <div>
              <label className="label mb-1.5 block">Imaging Finding</label>
              <Input value={imagingFinding} onChange={(e) => setImagingFinding(e.target.value)} placeholder="Hypermetabolic RUL mass..." />
            </div>
          </div>
        </Card>

        <Card className="mt-5 p-6">
          <h3 className="font-heading text-[14px] font-semibold text-foreground">Pathology & Genomics</h3>
          <label className="label mb-1.5 mt-4 block">Diagnosis *</label>
          <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Diffuse Large B-Cell Lymphoma" />

          <label className="label mb-1.5 mt-4 block">IHC Markers (name:value, comma-separated)</label>
          <Input value={markers} onChange={(e) => setMarkers(e.target.value)} placeholder="ER:Positive, PR:Negative" />

          <label className="label mb-1.5 mt-4 block">Genomic Profile / Mutations (comma-separated) *</label>
          <Input value={genomicProfile} onChange={(e) => setGenomicProfile(e.target.value)} placeholder="MYC rearrangement, TP53 mutation" />
        </Card>

        <Card className="mt-5 p-6">
          <h3 className="font-heading text-[14px] font-semibold text-foreground">Treatment & Toxicity</h3>
          <label className="label mb-1.5 mt-4 block">Candidate Drugs (comma-separated)</label>
          <Input value={candidateDrugs} onChange={(e) => setCandidateDrugs(e.target.value)} placeholder="R-CHOP, Pola-R-CHP" />

          <label className="label mb-1.5 mt-4 block">Toxicity Concerns (comma-separated)</label>
          <Input value={toxicityConcerns} onChange={(e) => setToxicityConcerns(e.target.value)} placeholder="Neutropenia, Peripheral neuropathy" />

          <label className="label mb-1.5 mt-4 block">Clinical Pearl</label>
          <Textarea value={clinicalPearl} onChange={(e) => setClinicalPearl(e.target.value)} placeholder="One sentence of real clinical guidance..." />

          <label className="label mb-1.5 mt-4 block">Discussion Questions (comma-separated)</label>
          <Textarea value={questions} onChange={(e) => setQuestions(e.target.value)} placeholder="What second-line regimen would you consider and why?" />
        </Card>

        {error && <p className="mt-4 text-[12.5px] text-coral-text">{error}</p>}

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={save} disabled={!isValid || saving} className="bg-navy text-white hover:bg-navy/90 disabled:opacity-50">
            {saving ? "Publishing…" : "Publish Case to Institution"}
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-teal-deep">
              <CheckCircle2 size={15} /> Published — opening case…
            </span>
          )}
        </div>
      </div>
    </Shell>
  );
}
