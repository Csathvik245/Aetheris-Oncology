"use client";

import { useEffect, useState } from "react";
import { Trophy, TrendingUp, ShieldCheck, FlaskConical, Target } from "lucide-react";
import { Shell } from "../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { createClient } from "../lib/supabase/client";

interface LeaderboardRow {
  category: string;
  user_id: string;
  full_name: string;
  value: number;
}

const CATEGORIES = [
  { key: "most_active", label: "Most Cases Completed", icon: Trophy, unit: "" },
  { key: "most_improved", label: "Most Improved", icon: TrendingUp, unit: " pts" },
  { key: "evidence_master", label: "Evidence Master", icon: ShieldCheck, unit: "%" },
  { key: "trial_expert", label: "Trial Expert", icon: FlaskConical, unit: "" },
  { key: "consistency", label: "Most Consistent", icon: Target, unit: " σ" },
];

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("get_leaderboard").then(({ data }) => {
      setRows((data ?? []) as LeaderboardRow[]);
      setLoading(false);
    });
  }, []);

  return (
    <Shell breadcrumb="Leaderboard">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-heading text-[24px] font-bold tracking-tight text-foreground">Leaderboard</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Your institution only — never compared across other programs.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-5">
          {CATEGORIES.map(({ key, label, icon: Icon, unit }) => {
            const entries = rows
              .filter((r) => r.category === key)
              .sort((a, b) => (key === "consistency" ? a.value - b.value : b.value - a.value))
              .slice(0, 5);
            return (
              <Card key={key} className="p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy-tint text-navy">
                    <Icon size={15} />
                  </span>
                  <h3 className="font-heading text-[14px] font-semibold text-foreground">{label}</h3>
                </div>
                {!loading && entries.length === 0 ? (
                  <p className="mt-3 text-[12px] text-muted-foreground">Not enough data yet.</p>
                ) : (
                  <div className="mt-3 flex flex-col gap-1.5">
                    {entries.map((e, i) => (
                      <div key={e.user_id} className="flex items-center justify-between text-[12.5px]">
                        <span className="flex items-center gap-2 text-foreground">
                          <span className="w-4 text-muted-foreground">{i + 1}.</span>
                          {e.full_name}
                        </span>
                        <span className="tnum font-semibold text-navy">
                          {e.value}
                          {unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
