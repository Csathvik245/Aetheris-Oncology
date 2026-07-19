"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Route, RefreshCw, Clock } from "lucide-react";
import { Shell } from "../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "../lib/supabase/client";
import { computeCompetencyProfile } from "../lib/session";
import { CASES } from "../lib/mock";

interface Week {
  weekNumber: number;
  focusSkill: string;
  focusBiomarkers: string[];
  recommendedCaseIds: string[];
  rationale: string;
}

export default function CurriculumPage() {
  const [weeks, setWeeks] = useState<Week[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadExisting() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("curriculum_plans")
      .select("weeks, generated_at")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();
    if (data) {
      setWeeks(data.weeks as Week[]);
      setGeneratedAt(data.generated_at);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadExisting();
  }, []);

  async function generate() {
    setGenerating(true);
    setError(null);
    const skills = await computeCompetencyProfile();
    const res = await fetch("/api/curriculum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skills }),
    });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(data.error ?? "Could not generate a curriculum.");
      return;
    }
    setWeeks(data.weeks);
    setGeneratedAt(data.generated_at);
  }

  return (
    <Shell breadcrumb="Adaptive Curriculum">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-[24px] font-bold tracking-tight text-foreground">Adaptive Curriculum</h1>
            <p className="mt-1 text-[13.5px] text-muted-foreground">
              A 4-week learning path built from your real competency scores — regenerate anytime.
            </p>
          </div>
          <Button onClick={generate} disabled={generating} className="gap-1.5 bg-navy text-white hover:bg-navy/90">
            <RefreshCw size={14} className={generating ? "animate-spin" : ""} />
            {generating ? "Building…" : weeks ? "Regenerate" : "Generate My Plan"}
          </Button>
        </div>

        {error && <p className="mt-3 text-[12.5px] text-coral-text">{error}</p>}

        {loading ? null : !weeks ? (
          <Card className="mt-6 flex flex-col items-center gap-2 p-10 text-center">
            <Route size={28} className="text-muted-foreground/50" />
            <p className="text-[13.5px] font-medium text-foreground">No curriculum yet</p>
            <p className="max-w-sm text-[12.5px] text-muted-foreground">
              Generate a plan — it'll prioritize your weakest skill first, or a broad foundation if you're just starting out.
            </p>
          </Card>
        ) : (
          <>
            {generatedAt && (
              <p className="mt-4 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <Clock size={12} /> Generated {new Date(generatedAt).toLocaleString()}
              </p>
            )}
            <div className="mt-3 flex flex-col gap-4">
              {weeks.map((w) => (
                <Card key={w.weekNumber} className="p-5">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-navy text-white">Week {w.weekNumber}</Badge>
                    <span className="font-heading text-[15px] font-semibold text-foreground">{w.focusSkill}</span>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{w.rationale}</p>
                  {w.focusBiomarkers?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {w.focusBiomarkers.map((b) => (
                        <span key={b} className="rounded-md bg-navy-tint px-2 py-0.5 text-[11px] font-semibold text-navy">
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                  {w.recommendedCaseIds?.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
                      {w.recommendedCaseIds.map((id) => {
                        const c = CASES.find((x) => x.id === id);
                        if (!c) return null;
                        return (
                          <Link key={id} href={`/cases/${id}`} className="flex items-center justify-between text-[12.5px] hover:underline">
                            <span className="text-foreground">{c.title}</span>
                            <span className="text-muted-foreground">{c.difficulty}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
