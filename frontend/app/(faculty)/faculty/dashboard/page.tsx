"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, TrendingUp, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Shell } from "@/app/components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/lib/supabase/AuthProvider";
import { listCohortRoster, cohortTrend, cohortCommonTags, type RosterResident, type CohortTrendPoint, type CohortMistake } from "@/app/lib/faculty";

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default function FacultyDashboardPage() {
  const { profile } = useAuth();
  const [roster, setRoster] = useState<RosterResident[]>([]);
  const [trend, setTrend] = useState<CohortTrendPoint[]>([]);
  const [mistakes, setMistakes] = useState<CohortMistake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const institutionId = profile?.institution_id;
    if (!institutionId) return;
    Promise.all([listCohortRoster(institutionId), cohortTrend(institutionId), cohortCommonTags(institutionId)]).then(
      ([r, t, m]) => {
        setRoster(r.sort((a, b) => (b.casesCompleted ?? 0) - (a.casesCompleted ?? 0)));
        setTrend(t);
        setMistakes(m);
        setLoading(false);
      },
    );
  }, [profile?.institution_id]);

  const totalCases = roster.reduce((a, r) => a + r.casesCompleted, 0);
  const avgAgreementValues = roster.map((r) => r.avgAgreement).filter((v): v is number => v !== null);
  const cohortAvg = avgAgreementValues.length
    ? Math.round(avgAgreementValues.reduce((a, b) => a + b, 0) / avgAgreementValues.length)
    : null;

  return (
    <Shell breadcrumb="Faculty Dashboard">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="font-heading text-[24px] font-bold tracking-tight text-foreground">Faculty Dashboard</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Every resident's competency progression, weakest reasoning domains, and cohort trends.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy-tint text-navy">
                <Users size={16} />
              </span>
            </div>
            <div className="mt-3 font-heading text-2xl font-bold tnum text-navy">{roster.length}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">Residents</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-tint text-teal-deep">
                <TrendingUp size={16} />
              </span>
            </div>
            <div className="mt-3 font-heading text-2xl font-bold tnum text-navy">{cohortAvg != null ? `${cohortAvg}%` : "—"}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">Cohort Avg. Agreement</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-coral-tint text-coral-text">
                <AlertCircle size={16} />
              </span>
            </div>
            <div className="mt-3 font-heading text-2xl font-bold tnum text-navy">{totalCases}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">Cases Completed (cohort)</div>
          </Card>
        </div>

        <Card className="mt-5 p-5">
          <h3 className="font-heading text-[15px] font-semibold text-foreground">Cohort Agreement Trend</h3>
          {trend.length === 0 ? (
            <p className="mt-3 text-[12.5px] text-muted-foreground">No completed sessions yet.</p>
          ) : (
            <div className="mt-3" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "var(--border)" }} />
                  <Line type="monotone" dataKey="avgAgreement" stroke="var(--navy)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <div className="mt-5 grid grid-cols-3 gap-5">
          <Card className="col-span-2 p-0">
            <div className="p-5 pb-0">
              <h3 className="font-heading text-[15px] font-semibold text-foreground">Resident Roster</h3>
            </div>
            {!loading && roster.length === 0 ? (
              <p className="p-5 text-[12.5px] text-muted-foreground">No residents in this institution yet.</p>
            ) : (
              <div className="mt-3 flex flex-col divide-y divide-border">
                {roster.map((r) => (
                  <div key={r.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium text-foreground">{r.fullName}</div>
                      <div className="truncate text-[11.5px] text-muted-foreground">{r.displayRole ?? "Resident"}</div>
                    </div>
                    <div className="w-20 text-right text-[12.5px] tnum text-muted-foreground">{r.casesCompleted} cases</div>
                    <div className={`w-16 text-right font-heading text-[13px] font-bold tnum ${r.avgAgreement !== null && r.avgAgreement < 70 ? "text-coral-text" : "text-teal-deep"}`}>
                      {r.avgAgreement !== null ? `${r.avgAgreement}%` : "—"}
                    </div>
                    <div className="w-16 text-right text-[11.5px] text-muted-foreground">{timeAgo(r.lastActive)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-heading text-[14px] font-semibold text-foreground">Most-Flagged Toxicity Concerns</h3>
            {mistakes.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-muted-foreground">No submissions yet.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {mistakes.map((m) => (
                  <div key={m.label} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-foreground">{m.label}</span>
                    <Badge className="bg-muted text-muted-foreground">{m.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="mt-4 text-right">
          <Link href="/faculty/review" className="text-[12.5px] font-medium text-navy hover:underline">
            Open Review Queue →
          </Link>
        </div>
      </div>
    </Shell>
  );
}
