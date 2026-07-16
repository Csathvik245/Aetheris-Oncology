"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, ChevronDown } from "lucide-react";
import { Shell } from "../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CASES, type Difficulty } from "../lib/mock";

const DIFFICULTY_TONE: Record<Difficulty, string> = {
  Advanced: "bg-cyan-tint-bg text-teal-deep",
  Intermediate: "bg-coral-tint text-coral-text",
  Beginner: "bg-navy-tint text-navy",
};

function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <div className="flex-1">
      <label className="label mb-1.5 block">{label}</label>
      <button className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground">
        {options[0]}
        <ChevronDown size={15} className="text-muted-foreground" />
      </button>
    </div>
  );
}

export default function CaseLibraryPage() {
  const [difficulty] = useState<string | null>(null);
  const rows = useMemo(() => CASES, [difficulty]);

  return (
    <Shell breadcrumb="Case Library">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading text-[24px] font-bold tracking-tight text-foreground">Case Library</h1>
            <p className="mt-1 text-[13.5px] text-muted-foreground">
              Curated high-fidelity oncology simulations for clinical mastery and diagnostic precision.
            </p>
          </div>
          <button className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[12.5px] font-medium text-foreground">
            Recently Added <ChevronDown size={14} />
          </button>
        </div>

        <Card className="mt-6 p-5">
          <div className="flex items-end gap-4">
            <FilterSelect label="Cancer Type" options={["All Types"]} />
            <FilterSelect label="Difficulty" options={["All Levels"]} />
            <FilterSelect label="Mutation" options={["Any Mutation"]} />
            <FilterSelect label="Organ System" options={["All Systems"]} />
            <Button className="bg-navy text-white hover:bg-navy/90">Apply Filters</Button>
          </div>
        </Card>

        <div className="mt-6 grid grid-cols-3 gap-5">
          {rows.map((c) => (
            <Link key={c.id} href={`/cases/${c.id}`}>
              <Card className="lift h-full p-5">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${DIFFICULTY_TONE[c.difficulty]}`}>
                    {c.difficulty}
                  </span>
                  <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                    <Clock size={13} /> {c.estMinutes} mins
                  </span>
                </div>
                <h3 className="mt-3 font-heading text-[16.5px] font-semibold leading-snug text-foreground">
                  {c.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{c.description}</p>

                <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3 text-[12.5px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Stage</span>
                    <span className="font-semibold text-foreground">{c.stage}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Mutation</span>
                    <span className="font-semibold text-foreground">{c.mutation}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.tags.map((t) => (
                    <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <button className="rounded-lg border border-border bg-card px-5 py-2.5 text-[13px] font-medium text-foreground hover:bg-muted">
            Load More Cases
          </button>
        </div>
      </div>
    </Shell>
  );
}
