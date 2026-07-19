"use client";

import { Award } from "lucide-react";
import type { CompetencySkill } from "@/app/lib/session";

const THRESHOLDS = [
  { level: "Gold", min: 95, dot: "bg-navy" },
  { level: "Silver", min: 85, dot: "bg-teal" },
  { level: "Bronze", min: 60, dot: "bg-coral-text" },
];

function levelFor(score: number): { level: string; dot: string } | null {
  for (const t of THRESHOLDS) {
    if (score >= t.min) return t;
  }
  return null;
}

export function CompetencyPassport({ data }: { data: CompetencySkill[] }) {
  if (data.length === 0) {
    return (
      <p className="text-[12.5px] text-muted-foreground">
        Complete cases to start unlocking skill levels — Bronze at 60%, Silver at 85%, Gold at 95% average agreement.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((s) => {
        const tier = levelFor(s.score);
        return (
          <div key={s.skill} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                tier ? tier.dot : "bg-muted"
              } text-white`}
            >
              <Award size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-foreground">{s.skill}</div>
              <div className="text-[11.5px] text-muted-foreground">{tier ? `${tier.level} · ${s.score}%` : `${s.score}% — Bronze at 60%`}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
