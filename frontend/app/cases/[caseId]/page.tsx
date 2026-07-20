"use client";

import { use, useState } from "react";
import Link from "next/link";
import { User, Stethoscope, ImageIcon, Microscope, Share2, Eye } from "lucide-react";
import { Shell } from "../../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePacket } from "../../lib/generatedCase";

const SECTIONS = [
  { key: "summary", label: "Patient Summary", icon: User },
  { key: "history", label: "Clinical History", icon: Stethoscope },
  { key: "imaging", label: "Imaging Findings", icon: ImageIcon },
  { key: "pathology", label: "Pathology & Genomics", icon: Microscope },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export default function PatientPacketPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);
  const packet = usePacket(caseId);
  const [section, setSection] = useState<SectionKey>("summary");

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
            <Link href={`/cases/${caseId}/worksheet`}>
              <Button className="gap-1.5 bg-navy text-white hover:bg-navy/90">
                <Share2 size={15} /> Refer to Board
              </Button>
            </Link>
          </div>
        </div>

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
            {section === "summary" && (
              <Card className="p-5">
                <h3 className="font-heading text-[15px] font-semibold text-foreground">Patient Summary</h3>
                <div className="mt-4 grid grid-cols-2 gap-6">
                  <div>
                    <div className="label">Chief Complaint</div>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-foreground">{packet.chiefComplaint}</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="label">Diagnosis</div>
                      <p className="mt-1.5 text-[13.5px] font-semibold text-foreground">{packet.pathology.diagnosis}</p>
                    </div>
                    <div>
                      <div className="label">Status</div>
                      <p className="mt-1.5 text-[13.5px] font-semibold text-teal-deep">{packet.status}</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {section === "history" && (
              <Card className="p-5">
                <h3 className="font-heading text-[15px] font-semibold text-foreground">Clinical History</h3>
                {packet.medicalHistory.length === 0 ? (
                  <p className="mt-3 text-[12.5px] text-muted-foreground">No clinical history documented for this case.</p>
                ) : (
                  <ul className="mt-4 flex flex-col gap-2">
                    {packet.medicalHistory.map((h) => (
                      <li key={h} className="text-[13.5px] text-foreground">
                        ✓ {h}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {section === "imaging" && (
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-[15px] font-semibold text-foreground">Imaging Findings</h3>
                  {packet.imaging.length > 0 && (
                    <span className="flex items-center gap-1 text-[12px] font-medium text-navy">
                      <Eye size={13} /> View DICOM
                    </span>
                  )}
                </div>
                {packet.imaging.length === 0 ? (
                  <p className="mt-3 text-[12.5px] text-muted-foreground">No imaging findings documented for this case.</p>
                ) : (
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
                )}
              </Card>
            )}

            {section === "pathology" && (
              <Card className="p-5">
                <h3 className="font-heading text-[15px] font-semibold text-foreground">Pathology</h3>
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
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
