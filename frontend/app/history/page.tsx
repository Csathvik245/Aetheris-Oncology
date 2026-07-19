"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Shell } from "../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listHistoryEntries, type HistoryEntry } from "../lib/session";

const DIFFICULTY_TONE: Record<string, string> = {
  Advanced: "bg-cyan-tint-bg text-teal-deep",
  Intermediate: "bg-coral-tint text-coral-text",
  Beginner: "bg-navy-tint text-navy",
};

export default function PracticeHistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    listHistoryEntries().then((list) => {
      setEntries([...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });
  }, []);

  return (
    <Shell breadcrumb="Practice History">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-heading text-[24px] font-bold tracking-tight text-foreground">Practice History</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Completed case reviews and reasoning-agreement scores from past sessions.
        </p>

        {entries.length === 0 ? (
          <Card className="mt-6 flex flex-col items-center gap-2 p-10 text-center">
            <ClipboardList size={28} className="text-muted-foreground/50" />
            <p className="text-[13.5px] font-medium text-foreground">No completed sessions yet</p>
            <p className="max-w-sm text-[12.5px] text-muted-foreground">
              Work a case through the worksheet, submit it to the AI Orchestrator, and let Mission
              Control finish a real run — it&rsquo;ll show up here.
            </p>
          </Card>
        ) : (
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
                    <div className="truncate text-[13.5px] font-medium text-foreground">{h.title}</div>
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
        )}
      </div>
    </Shell>
  );
}
