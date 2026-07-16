import Link from "next/link";
import { Play, ArrowRight, ClipboardCheck, Percent, FlaskConical } from "lucide-react";
import { Shell } from "./components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CompetencyRadar } from "./components/CompetencyRadar";
import {
  RESIDENT,
  DASHBOARD_STATS,
  ASSIGNED_CASES,
  COMPETENCY_SKILLS,
  RECENT_FEEDBACK,
  PATIENT_842,
} from "./lib/mock";

const STATS = [
  { label: "Cases Completed", value: DASHBOARD_STATS.casesCompleted, icon: ClipboardCheck },
  { label: "Avg. Reasoning Agreement", value: `${DASHBOARD_STATS.avgReasoningAgreement}%`, icon: Percent },
  { label: "Clinical Trial Accuracy", value: `${DASHBOARD_STATS.clinicalTrialAccuracy}%`, icon: FlaskConical },
];

const topSkill = [...COMPETENCY_SKILLS].sort((a, b) => b.score - a.score)[0];
const growthArea = [...COMPETENCY_SKILLS].sort((a, b) => a.score - b.score)[0];

export default function DashboardPage() {
  return (
    <Shell streakDays={14}>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="font-heading text-[26px] font-bold tracking-tight text-foreground">
          Welcome back, {RESIDENT.name.replace("Dr. ", "Dr. ")}.
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Your diagnostic accuracy improved by 4% this week. Continue your session on EGFR
          resistance to stay on track for certification.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-5">
          {/* left ~2/3 */}
          <div className="col-span-2 flex flex-col gap-5">
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between gap-6 p-6">
                <div className="min-w-0">
                  <Badge className="bg-navy text-white">IN PROGRESS</Badge>
                  <h2 className="mt-3 font-heading text-[19px] font-semibold text-foreground">
                    Case #{PATIENT_842.caseId}: Metastatic NSCLC with EGFR Resistance
                  </h2>
                  <div className="mt-3 flex items-center gap-4 text-[12.5px] text-muted-foreground">
                    <span>⏱ 24m remaining</span>
                    <span className="rounded-full border border-border px-2.5 py-0.5">
                      Advanced Pathology
                    </span>
                  </div>
                  <div className="mt-4 max-w-xs">
                    <Progress value={38} />
                  </div>
                </div>
                <Link href={`/cases/${PATIENT_842.caseId}`}>
                  <button className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-navy text-white transition-transform hover:scale-105">
                    <Play size={20} fill="currentColor" />
                  </button>
                </Link>
              </div>
            </Card>

            <div className="grid grid-cols-3 gap-4">
              {STATS.map(({ label, value, icon: Icon }) => (
                <Card key={label} className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy-tint text-navy">
                      <Icon size={16} />
                    </span>
                  </div>
                  <div className="mt-3 font-heading text-2xl font-bold text-navy tnum">{value}</div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">{label}</div>
                </Card>
              ))}
            </div>

            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-heading text-[15px] font-semibold text-foreground">Assigned Cases</h3>
                <Link href="/cases" className="flex items-center gap-1 text-[12.5px] font-medium text-navy hover:underline">
                  View All Library <ArrowRight size={13} />
                </Link>
              </div>
              <div className="flex flex-col divide-y divide-border">
                {ASSIGNED_CASES.map((c) => (
                  <Link
                    key={c.caseId}
                    href={`/cases/${c.caseId}`}
                    className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-coral-tint text-[11px] font-bold text-coral-text">
                      {c.level}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium text-foreground">{c.title}</div>
                      <div className="truncate text-[12px] text-muted-foreground">{c.subtitle}</div>
                    </div>
                    <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
                      {c.difficulty}
                    </span>
                    <span className="w-10 shrink-0 text-right text-[12px] text-muted-foreground">{c.minutes}m</span>
                    <ArrowRight size={15} className="shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </Card>
          </div>

          {/* right ~1/3 */}
          <div className="flex flex-col gap-5">
            <Card className="p-5">
              <h3 className="font-heading text-[15px] font-semibold text-foreground">Competency Profile</h3>
              <CompetencyRadar />
              <div className="mt-2 grid grid-cols-2 gap-3 border-t border-border pt-3">
                <div>
                  <div className="label">Top Skill</div>
                  <div className="mt-0.5 text-[13px] font-semibold text-foreground">{topSkill.skill}</div>
                </div>
                <div>
                  <div className="label">Growth Area</div>
                  <div className="mt-0.5 text-[13px] font-semibold text-coral-text">{growthArea.skill}</div>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-heading text-[14px] font-semibold text-foreground">Recent Feedback</h3>
              <blockquote className="mt-3 border-l-2 border-navy pl-3 text-[13px] italic leading-relaxed text-muted-foreground">
                &ldquo;{RECENT_FEEDBACK.quote}&rdquo;
              </blockquote>
              <div className="mt-3 text-[12px] font-medium text-foreground">{RECENT_FEEDBACK.author}</div>
            </Card>

            <Card className="bg-navy p-5 text-white">
              <h3 className="font-heading text-[15px] font-semibold">Weekly Challenge</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-white/80">
                Complete 3 rare hematology cases for the &lsquo;Precision Master&rsquo; badge.
              </p>
              <Button className="mt-4 w-full bg-white text-navy hover:bg-white/90">Start Challenge</Button>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
