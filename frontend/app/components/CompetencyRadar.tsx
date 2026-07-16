"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { COMPETENCY_SKILLS } from "@/app/lib/mock";

export function CompetencyRadar({ size = 240 }: { size?: number }) {
  return (
    <div style={{ width: "100%", height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={COMPETENCY_SKILLS} outerRadius="70%">
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
