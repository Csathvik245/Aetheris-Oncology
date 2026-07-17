"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import type { CompetencySkill } from "@/app/lib/session";

export function CompetencyRadar({ data, size = 240 }: { data: CompetencySkill[]; size?: number }) {
  if (data.length === 0) {
    return (
      <div style={{ width: "100%", height: size }} className="grid place-items-center text-center">
        <p className="max-w-[220px] text-[12.5px] text-muted-foreground">
          Complete a case through Mission Control to start building your competency profile.
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            tickLine={false}
          />
          <Radar
            dataKey="score"
            stroke="var(--navy)"
            fill="var(--navy)"
            fillOpacity={0.18}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
