import { Shell } from "../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CompetencyRadar } from "../components/CompetencyRadar";
import { COMPETENCY_SKILLS } from "../lib/mock";

export default function CompetencyProfilePage() {
  const topSkill = [...COMPETENCY_SKILLS].sort((a, b) => b.score - a.score)[0];
  const growthArea = [...COMPETENCY_SKILLS].sort((a, b) => a.score - b.score)[0];

  return (
    <Shell breadcrumb="Competency Profile">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-heading text-[24px] font-bold tracking-tight text-foreground">Competency Profile</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Longitudinal skill tracking across the six agent-mapped reasoning competencies.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <Card className="p-5">
            <CompetencyRadar size={280} />
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
            <h3 className="font-heading text-[14px] font-semibold text-foreground">Skill Breakdown</h3>
            <div className="mt-4 flex flex-col gap-4">
              {COMPETENCY_SKILLS.map((s) => (
                <div key={s.skill}>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="font-medium text-foreground">{s.skill}</span>
                    <span className="tnum text-muted-foreground">{s.score}%</span>
                  </div>
                  <Progress value={s.score} className="mt-1.5" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
