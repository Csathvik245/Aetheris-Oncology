"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, ArrowRight, ClipboardCheck, Percent, Award } from "lucide-react";
import { Shell } from "./components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CompetencyRadar } from "./components/CompetencyRadar";
import { CASES, WORKSHEET_STEPS } from "./lib/mock";
import { getProfile, type Profile } from "./lib/profile";
import { getGeneratedCase, isGeneratedCaseId } from "./lib/generatedCase";
import {
  computeDashboardStats,
  computeCompetencyProfile,
  computeStreakDays,
  listDrafts,
  listHistoryEntries,
  type DashboardStats,
  type CompetencySkill,
  type WorksheetDraft,
} from "./lib/session";

function draftCaseTitle(caseId: string): string {
  const mockCase = CASES.find((c) => c.id === caseId);
  if (mockCase) return mockCase.title;
  if (isGeneratedCaseId(caseId)) {
    const g = getGeneratedCase(caseId);
    if (g) return g.title;
  }
  return `Case ${caseId}`;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({ casesCompleted: 0, avgReasoningAgreement: null, advancedCasesCompleted: 0 });
  const [skills, setSkills] = useState<CompetencySkill[]>([]);
  const [streak, setStreak] = useState(0);
  const [draft, setDraft] = useState<WorksheetDraft | null>(null);
  const [suggested, setSuggested] = useState<typeof CASES>(CASES.slice(0, 3));

  useEffect(() => {
    // One-shot bootstrap read from localStorage (unavailable during SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(getProfile());
    setStats(computeDashboardStats());
    setSkills(computeCompetencyProfile());
    setStreak(computeStreakDays());
    setDraft(listDrafts()[0] ?? null);
    const done = new Set(listHistoryEntries().map((h) => h.caseId));
    const remaining = CASES.filter((c) => !done.has(c.id));
    setSuggested((remaining.length > 0 ? remaining : CASES).slice(0, 3));
  }, []);

  const STATS = [
    { label: "Cases Completed", value: String(stats.casesCompleted), icon: ClipboardCheck },
    {
      label: "Avg. Reasoning Agreement",
      value: stats.avgReasoningAgreement != null ? `${stats.avgReasoningAgreement}%` : "—",
      icon: Percent,
    },
    { label: "Advanced Cases Completed", value: String(stats.advancedCasesCompleted), icon: Award },
  ];

  const sortedSkills = [...skills].sort((a, b) => b.score - a.score);
  const topSkill = sortedSkills[0];
  const growthArea = sortedSkills[sortedSkills.length - 1];

  return (
    <Shell streakDays={streak > 0 ? streak : undefined}>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="font-heading text-[26px] font-bold tracking-tight text-foreground">
          Welcome{profile ? `, ${profile.name}` : ""}.
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {stats.casesCompleted > 0
            ? `You've completed ${stats.casesCompleted} case${stats.casesCompleted === 1 ? "" : "s"}${
                stats.avgReasoningAgreement != null ? ` with an average reasoning agreement of ${stats.avgReasoningAgreement}%` : ""
              }.`
            : "Browse the Case Library or generate a synthetic case to start your first practice session."}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-5">
          {/* left ~2/3 */}
          <div className="col-span-2 flex flex-col gap-5">
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between gap-6 p-6">
                <div className="min-w-0">
                  {draft ? (
                    <>
                      <Badge className="bg-navy text-white">IN PROGRESS</Badge>
                      <h2 className="mt-3 font-heading text-[19px] font-semibold text-foreground">
                        {draftCaseTitle(draft.caseId)}
                      </h2>
                      <div className="mt-3 flex items-center gap-4 text-[12.5px] text-muted-foreground">
                        <span>
                          Step {draft.step + 1} of {WORKSHEET_STEPS.length}: {WORKSHEET_STEPS[draft.step]}
                        </span>
                      </div>
                      <div className="mt-4 max-w-xs">
                        <Progress value={((draft.step + 1) / WORKSHEET_STEPS.length) * 100} />
                      </div>
                    </>
                  ) : (
                    <>
                      <Badge className="bg-muted text-muted-foreground">GET STARTED</Badge>
                      <h2 className="mt-3 font-heading text-[19px] font-semibold text-foreground">
                        Start your first case
                      </h2>
                      <p className="mt-2 max-w-sm text-[13px] text-muted-foreground">
                        Browse the Case Library or generate a synthetic case to begin practicing.
                      </p>
                    </>
                  )}
                </div>
                <Link href={draft ? `/cases/${draft.caseId}/worksheet` : "/cases"}>
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
                <h3 className="font-heading text-[15px] font-semibold text-foreground">Suggested Cases</h3>
                <Link href="/cases" className="flex items-center gap-1 text-[12.5px] font-medium text-navy hover:underline">
                  View All Library <ArrowRight size={13} />
                </Link>
              </div>
              <div className="flex flex-col divide-y divide-border">
                {suggested.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-coral-tint text-[11px] font-bold text-coral-text">
                      {c.difficulty[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium text-foreground">{c.title}</div>
                      <div className="truncate text-[12px] text-muted-foreground">{c.description}</div>
                    </div>
                    <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
                      {c.difficulty}
                    </span>
                    <span className="w-10 shrink-0 text-right text-[12px] text-muted-foreground">{c.estMinutes}m</span>
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
              <CompetencyRadar data={skills} />
              {skills.length > 0 && (
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
              )}
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
