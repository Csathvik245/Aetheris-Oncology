"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Stethoscope,
  ImageIcon,
  FlaskConical,
  Microscope,
  Users,
  Printer,
  Share2,
  Eye,
  GitBranch,
  Store,
} from "lucide-react";
import { Shell } from "../../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePacket, isGeneratedCaseId } from "../../lib/generatedCase";
import { createClient } from "../../lib/supabase/client";

const VARIATIONS = [
  { value: "older_patient", label: "Older Patient" },
  { value: "new_mutation", label: "New Resistance Mutation" },
  { value: "pregnancy", label: "Pregnancy" },
  { value: "renal_failure", label: "Renal Failure" },
  { value: "brain_mets", label: "New Brain Metastases" },
  { value: "trial_closed", label: "Trial Closed" },
];

const SECTIONS = [
  { key: "summary", label: "Patient Summary", icon: User },
  { key: "history", label: "Clinical History", icon: Stethoscope },
  { key: "imaging", label: "Imaging Findings", icon: ImageIcon },
  { key: "labs", label: "Laboratory Results", icon: FlaskConical },
  { key: "pathology", label: "Pathology & Genomics", icon: Microscope },
  { key: "tumor-board", label: "Tumor Board Notes", icon: Users },
];

export default function PatientPacketPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);
  const packet = usePacket(caseId);
  const router = useRouter();
  const [section, setSection] = useState("summary");
  const [variationType, setVariationType] = useState("");
  const [branching, setBranching] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [visibility, setVisibility] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!isGeneratedCaseId(caseId)) return;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("cases").select("owner_id, visibility").eq("id", caseId).maybeSingle();
      if (data) {
        setIsOwner(data.owner_id === user.id);
        setVisibility(data.visibility);
      }
    })();
  }, [caseId]);

  async function publishToMarketplace() {
    setPublishing(true);
    const supabase = createClient();
    await supabase.from("cases").update({ visibility: "marketplace" }).eq("id", caseId);
    setVisibility("marketplace");
    setPublishing(false);
  }

  async function branchCase() {
    if (!variationType) return;
    setBranching(true);
    setBranchError(null);
    const res = await fetch("/api/case-variations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseCaseId: caseId,
        variationType,
        packet: {
          age: packet.age,
          sex: packet.sex,
          ecog: packet.ecog,
          chiefComplaint: packet.chiefComplaint,
          medicalHistory: packet.medicalHistory,
          pathology: packet.pathology,
        },
      }),
    });
    const data = await res.json();
    setBranching(false);
    if (!res.ok) {
      setBranchError(data.error ?? "Could not create variation.");
      return;
    }
    router.push(`/cases/${data.caseId}`);
  }

  return (
    <Shell breadcrumb="Patient Packet">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center gap-2">
          <Badge className="bg-navy-tint text-navy">CASE #{packet.caseId.toUpperCase()}</Badge>
          <Badge className="bg-coral-tint text-coral-text">CRITICAL REVIEW</Badge>
          <span className="text-[12px] text-muted-foreground">Last Updated: {packet.lastUpdated}</span>
        </div>

        <div className="mt-3 flex items-start justify-between">
          <div>
            <h1 className="font-heading text-[30px] font-bold tracking-tight text-navy">{packet.displayId}</h1>
            <div className="mt-3 flex items-center gap-8 text-[13px]">
              <div>
                <div className="label">Age / Sex</div>
                <div className="mt-0.5 font-semibold text-foreground">
                  {packet.age} / {packet.sex}
                </div>
              </div>
              <div>
                <div className="label">ECOG PS</div>
                <div className="mt-0.5 flex items-center gap-1.5 font-semibold text-foreground">
                  <span className="h-2 w-2 rounded-full bg-coral" /> {packet.ecog}
                </div>
              </div>
              <div>
                <div className="label">Status</div>
                <div className="mt-0.5 font-semibold text-teal-deep">{packet.status}</div>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Select value={variationType} onValueChange={(v) => v && setVariationType(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Branch this case…" />
              </SelectTrigger>
              <SelectContent>
                {VARIATIONS.map((v) => (
                  <SelectItem key={v.value} value={v.value}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={branchCase} disabled={!variationType || branching} className="gap-1.5">
              <GitBranch size={15} /> {branching ? "Branching…" : "Branch"}
            </Button>
            {isOwner && visibility !== "marketplace" && (
              <Button variant="outline" onClick={publishToMarketplace} disabled={publishing} className="gap-1.5">
                <Store size={15} /> {publishing ? "Publishing…" : "Publish to Marketplace"}
              </Button>
            )}
            <Button variant="outline" className="gap-1.5">
              <Printer size={15} /> Print Packet
            </Button>
            <Link href={`/cases/${caseId}/worksheet`}>
              <Button className="gap-1.5 bg-navy text-white hover:bg-navy/90">
                <Share2 size={15} /> Refer to Board
              </Button>
            </Link>
          </div>
        </div>
        {branchError && <p className="mt-2 text-[12.5px] text-coral-text">{branchError}</p>}

        <div className="mt-8 grid grid-cols-4 gap-6">
          <nav className="col-span-1 flex flex-col gap-1">
            {SECTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors ${
                  section === key
                    ? "bg-navy-tint font-semibold text-navy"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>

          <div className="col-span-3 flex flex-col gap-5">
            <Card className="p-5">
              <h3 className="font-heading text-[15px] font-semibold text-foreground">Clinical Presentation</h3>
              <div className="mt-4 grid grid-cols-2 gap-6">
                <div>
                  <div className="label">Chief Complaint</div>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-foreground">{packet.chiefComplaint}</p>
                </div>
                <div>
                  <div className="label">Medical History</div>
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {packet.medicalHistory.map((h) => (
                      <li key={h} className="text-[13.5px] text-foreground">
                        ✓ {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-5">
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-[14px] font-semibold text-foreground">Imaging Findings</h3>
                  <span className="flex items-center gap-1 text-[12px] font-medium text-navy">
                    <Eye size={13} /> View DICOM
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {packet.imaging.map((img) => (
                    <div key={img.study} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                        <span className="font-semibold text-foreground">{img.study}</span>
                        <span>{img.date}</span>
                      </div>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{img.finding}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="font-heading text-[14px] font-semibold text-foreground">Pathology</h3>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[15px] font-bold text-coral-text">{packet.pathology.diagnosis}</span>
                  {packet.pathology.confirmed && <Badge className="bg-teal-tint text-teal-deep">CONFIRMED</Badge>}
                </div>
                {packet.pathology.markers.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1.5">
                    {packet.pathology.markers.map((m) => (
                      <div key={m.name} className="flex items-center justify-between text-[13px]">
                        <span className="text-muted-foreground">IHC Marker: {m.name}</span>
                        <span
                          className={`font-semibold ${
                            m.value.includes("Positive") ? "text-teal-deep" : "text-coral-text"
                          }`}
                        >
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 border-t border-border pt-3">
                  <div className="label">Genomic Profile (VCF)</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {packet.pathology.genomicProfile.map((g) => (
                      <span
                        key={g}
                        className="rounded-md bg-navy px-2 py-0.5 text-[11px] font-semibold text-white"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
