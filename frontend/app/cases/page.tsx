"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, ChevronDown } from "lucide-react";
import { Shell } from "../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CASES, type Difficulty } from "../lib/mock";

const DIFFICULTY_TONE: Record<Difficulty, string> = {
  Advanced: "bg-cyan-tint-bg text-teal-deep",
  Intermediate: "bg-coral-tint text-coral-text",
  Beginner: "bg-navy-tint text-navy",
};

const ALL = "All";
const CANCER_TYPES = [ALL, ...Array.from(new Set(CASES.map((c) => c.cancerType)))];
const DIFFICULTIES = [ALL, "Beginner", "Intermediate", "Advanced"];
const MUTATIONS = [ALL, ...Array.from(new Set(CASES.map((c) => c.mutation)))];
const ORGAN_SYSTEMS = [ALL, ...Array.from(new Set(CASES.map((c) => c.organSystem)))];

const PAGE_SIZE = 6;

interface Filters {
  cancerType: string;
  difficulty: string;
  mutation: string;
  organSystem: string;
}

const DEFAULT_FILTERS: Filters = { cancerType: ALL, difficulty: ALL, mutation: ALL, organSystem: ALL };

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex-1">
      <label className="label mb-1.5 block">{label}</label>
      <Select value={value} onValueChange={(v) => onChange(v ?? ALL)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o === ALL ? `All ${label}` : o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function CaseLibraryPage() {
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<Filters>(DEFAULT_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const rows = useMemo(
    () =>
      CASES.filter(
        (c) =>
          (applied.cancerType === ALL || c.cancerType === applied.cancerType) &&
          (applied.difficulty === ALL || c.difficulty === applied.difficulty) &&
          (applied.mutation === ALL || c.mutation === applied.mutation) &&
          (applied.organSystem === ALL || c.organSystem === applied.organSystem)
      ),
    [applied]
  );

  const visibleRows = rows.slice(0, visibleCount);
  const hasMore = visibleCount < rows.length;

  function applyFilters() {
    setApplied(draft);
    setVisibleCount(PAGE_SIZE);
  }

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
            <FilterSelect
              label="Cancer Type"
              options={CANCER_TYPES}
              value={draft.cancerType}
              onChange={(v) => setDraft((d) => ({ ...d, cancerType: v }))}
            />
            <FilterSelect
              label="Difficulty"
              options={DIFFICULTIES}
              value={draft.difficulty}
              onChange={(v) => setDraft((d) => ({ ...d, difficulty: v }))}
            />
            <FilterSelect
              label="Mutation"
              options={MUTATIONS}
              value={draft.mutation}
              onChange={(v) => setDraft((d) => ({ ...d, mutation: v }))}
            />
            <FilterSelect
              label="Organ System"
              options={ORGAN_SYSTEMS}
              value={draft.organSystem}
              onChange={(v) => setDraft((d) => ({ ...d, organSystem: v }))}
            />
            <Button onClick={applyFilters} className="bg-navy text-white hover:bg-navy/90">
              Apply Filters
            </Button>
          </div>
        </Card>

        {rows.length === 0 ? (
          <p className="mt-8 text-center text-[13px] text-muted-foreground">
            No cases match the selected filters.
          </p>
        ) : (
        <div className="mt-6 grid grid-cols-3 gap-5">
          {visibleRows.map((c) => (
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
        )}

        {hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              className="rounded-lg border border-border bg-card px-5 py-2.5 text-[13px] font-medium text-foreground hover:bg-muted"
            >
              Load More Cases
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}
