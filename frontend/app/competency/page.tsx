"use client";

import { useEffect, useState } from "react";
import { Shell } from "../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CompetencyRadar } from "../components/CompetencyRadar";
import { CompetencyPassport } from "../components/CompetencyPassport";
import { computeCompetencyProfile, type CompetencySkill } from "../lib/session";

export default function CompetencyProfilePage() {
  const [skills, setSkills] = useState<CompetencySkill[]>([]);

  useEffect(() => {
    computeCompetencyProfile().then(setSkills);
  }, []);

  const sorted = [...skills].sort((a, b) => b.score - a.score);
  const topSkill = sorted[0];
  const growthArea = sorted[sorted.length - 1];

  return (
    <Shell breadcrumb="Competency Profile">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-heading text-[24px] font-bold tracking-tight text-foreground">Competency Profile</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Real averages from your completed sessions — the same agreement scores shown on each
          case&rsquo;s Comparison Analysis, aggregated across every case you&rsquo;ve run.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <Card className="p-5">
            <CompetencyRadar data={skills} size={280} />
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

          <Card className="p-5">
            <h3 className="font-heading text-[14px] font-semibold text-foreground">Skill Breakdown</h3>
            {skills.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-muted-foreground">
                No completed sessions yet — this fills in once you&rsquo;ve run cases through Mission
                Control.
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {skills.map((s) => (
                  <div key={s.skill}>
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="font-medium text-foreground">{s.skill}</span>
                      <span className="tnum text-muted-foreground">{s.score}%</span>
                    </div>
                    <Progress value={s.score} className="mt-1.5" />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="mt-6 p-5">
          <h3 className="font-heading text-[14px] font-semibold text-foreground">Competency Passport</h3>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Bronze at 60%, Silver at 85%, Gold at 95% average agreement — same scores as above, per skill.
          </p>
          <div className="mt-4">
            <CompetencyPassport data={skills} />
          </div>
        </Card>
      </div>
    </Shell>
  );
}
