"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio } from "lucide-react";
import { Shell } from "../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PRACTICE_HISTORY } from "../lib/mock";
import { listHistoryEntries, type HistoryEntry } from "../lib/session";

const DIFFICULTY_TONE: Record<string, string> = {
  Advanced: "bg-cyan-tint-bg text-teal-deep",
  Intermediate: "bg-coral-tint text-coral-text",
  Beginner: "bg-navy-tint text-navy",
};

const DEMO_SEED: HistoryEntry[] = PRACTICE_HISTORY.map((h) => ({ ...h, source: "demo" }));

export default function PracticeHistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>(DEMO_SEED);

  useEffect(() => {
    const merged = [...listHistoryEntries(), ...DEMO_SEED].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    // One-shot bootstrap read from localStorage (unavailable during SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(merged);
  }, []);

  return (
    <Shell breadcrumb="Practice History">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-heading text-[24px] font-bold tracking-tight text-foreground">Practice History</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Completed case reviews and reasoning-agreement scores from past sessions.
        </p>

        <Card className="mt-6 p-0">
          <div className="flex flex-col divide-y divide-border">
            {entries.map((h, i) => (
              <Link
                key={`${h.caseId}-${h.date}-${i}`}
                href={`/cases/${h.caseId}/comparison`}
                className="flex items-center gap-4 px-5 py-4"
              >
                <Badge className={DIFFICULTY_TONE[h.difficulty]}>{h.difficulty}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate text-[13.5px] font-medium text-foreground">
                    {h.title}
                    {h.source === "live" && (
                      <span className="flex items-center gap-1 rounded-full bg-teal-tint px-1.5 py-0.5 text-[9.5px] font-semibold text-teal-deep">
                        <Radio size={9} /> LIVE RUN
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-muted-foreground">{h.date}</div>
                </div>
                <div className="text-right">
                  <div className="label">Agreement</div>
                  <div
                    className={`font-heading text-[15px] font-bold tnum ${
                      h.agreement < 70 ? "text-coral-text" : "text-teal-deep"
                    }`}
                  >
                    {h.agreement}%
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
}
