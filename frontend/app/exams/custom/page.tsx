"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Settings2, ArrowLeft } from "lucide-react";
import { Shell } from "@/app/components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/app/lib/supabase/client";

const DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced"];
const COUNTS = [5, 10, 15, 20];
const TOPICS = [
  { value: "first-line-therapy", label: "First-Line Therapy" },
  { value: "resistance-mechanisms", label: "Resistance Mechanisms" },
  { value: "toxicity-management", label: "Toxicity Management" },
  { value: "adjuvant-therapy", label: "Adjuvant Therapy" },
  { value: "biomarker-testing", label: "Biomarker Testing" },
  { value: "trial-eligibility", label: "Trial Eligibility" },
  { value: "monitoring", label: "Monitoring" },
  { value: "salvage-therapy", label: "Salvage / Later-Line Therapy" },
];

export default function CustomExamBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cancerTypes, setCancerTypes] = useState<string[]>([]);
  const [cancerType, setCancerType] = useState(() => searchParams.get("cancerType") ?? "All");
  const [difficulty, setDifficulty] = useState(() => searchParams.get("difficulty") ?? "All");
  const [topics, setTopics] = useState<string[]>(() => {
    const fromQuery = searchParams.get("topics");
    const knownValues = new Set(TOPICS.map((t) => t.value));
    // Defensive: a linked-in filter (e.g. from the Adaptive Curriculum) may
    // suggest a topic slug outside our fixed vocabulary — drop it rather
    // than silently producing a query that can never match.
    return fromQuery ? fromQuery.split(",").filter((t) => knownValues.has(t)) : [];
  });
  const [count, setCount] = useState(10);
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("exams")
      .select("specialty_tag")
      .then(({ data }) => {
        const tags = Array.from(new Set((data ?? []).map((e) => e.specialty_tag).filter(Boolean))) as string[];
        setCancerTypes(tags);
      });
  }, []);

  function toggleTopic(value: string) {
    setTopics((cur) => (cur.includes(value) ? cur.filter((t) => t !== value) : [...cur, value]));
  }

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      let query = supabase.from("exam_questions").select("id, exams!inner(specialty_tag)", { count: "exact", head: true });
      if (cancerType !== "All") query = query.eq("exams.specialty_tag", cancerType);
      if (difficulty !== "All") query = query.eq("difficulty", difficulty);
      if (topics.length > 0) query = query.overlaps("topic_tags", topics);
      const { count: total } = await query;
      setAvailableCount(total ?? 0);
    })();
  }, [cancerType, difficulty, topics]);

  async function buildExam() {
    setBuilding(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in.");
      setBuilding(false);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();

    let query = supabase.from("exam_questions").select("id, exams!inner(specialty_tag)");
    if (cancerType !== "All") query = query.eq("exams.specialty_tag", cancerType);
    if (difficulty !== "All") query = query.eq("difficulty", difficulty);
    if (topics.length > 0) query = query.overlaps("topic_tags", topics);
    const { data: matches, error: matchError } = await query;

    if (matchError) {
      setError(matchError.message);
      setBuilding(false);
      return;
    }
    if (!matches || matches.length === 0) {
      setError("No questions match these filters. Try broadening them.");
      setBuilding(false);
      return;
    }

    const shuffled = [...matches].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(count, shuffled.length)).map((m) => m.id);
    const filterBits = [
      cancerType !== "All" ? cancerType : null,
      difficulty !== "All" ? difficulty : null,
      topics.length > 0 ? `${topics.length} topic${topics.length === 1 ? "" : "s"}` : null,
    ].filter(Boolean);
    const title = `Custom Exam — ${filterBits.length > 0 ? filterBits.join(" · ") : "All Cancer Types"}`;
    const timeLimitMinutes = Math.max(10, Math.round(picked.length * 1.8));

    const { data: attempt, error: insertError } = await supabase
      .from("exam_attempts")
      .insert({
        exam_id: null,
        user_id: user.id,
        institution_id: profile?.institution_id ?? null,
        is_custom: true,
        custom_question_ids: picked,
        custom_title: title,
        time_limit_minutes: timeLimitMinutes,
      })
      .select("id")
      .single();

    setBuilding(false);
    if (insertError || !attempt) {
      setError(insertError?.message ?? "Could not build the exam.");
      return;
    }
    router.push(`/exams/custom/${attempt.id}`);
  }

  return (
    <Shell breadcrumb="Build Your Own Exam">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <a href="/exams" className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Back to Exams
        </a>
        <div className="mt-3 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy text-white">
            <Settings2 size={17} />
          </span>
          <div>
            <h1 className="font-heading text-[22px] font-bold tracking-tight text-foreground">Build Your Own Exam</h1>
            <p className="text-[13px] text-muted-foreground">Filter the full question bank by cancer type, topic, difficulty, and length.</p>
          </div>
        </div>

        <Card className="mt-6 p-6">
          <label className="label mb-1.5 block">Cancer Type</label>
          <Select value={cancerType} onValueChange={(v) => v && setCancerType(v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Cancer Types</SelectItem>
              {cancerTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="label mb-1.5 mt-4 block">Difficulty</label>
          <Select value={difficulty} onValueChange={(v) => v && setDifficulty(v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d}>
                  {d === "All" ? "All Difficulties" : d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="label mb-1.5 mt-4 block">Topics (optional — leave blank for any)</label>
          <div className="grid grid-cols-2 gap-2">
            {TOPICS.map((t) => (
              <button
                key={t.value}
                onClick={() => toggleTopic(t.value)}
                className={`rounded-lg border px-3 py-2 text-left text-[12.5px] font-medium transition-colors ${
                  topics.includes(t.value) ? "border-navy bg-navy-tint text-navy" : "border-border text-foreground hover:bg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <label className="label mb-1.5 mt-4 block">Number of Questions</label>
          <div className="grid grid-cols-4 gap-2">
            {COUNTS.map((c) => (
              <button
                key={c}
                onClick={() => setCount(c)}
                className={`rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors ${
                  count === c ? "border-navy bg-navy-tint text-navy" : "border-border text-foreground hover:bg-muted"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <p className="mt-4 text-[12px] text-muted-foreground">
            {availableCount === null ? "Checking available questions…" : `${availableCount} question${availableCount === 1 ? "" : "s"} match these filters.`}
          </p>

          {availableCount === 0 && (
            <div className="mt-2 flex items-center justify-between rounded-lg bg-coral-tint px-3 py-2 text-[12px] text-coral-text">
              <span>No questions match this exact combination.</span>
              <button
                onClick={() => {
                  setCancerType("All");
                  setDifficulty("All");
                  setTopics([]);
                }}
                className="font-semibold underline"
              >
                Clear filters
              </button>
            </div>
          )}

          {error && <p className="mt-3 text-[12.5px] text-coral-text">{error}</p>}

          <Button
            onClick={buildExam}
            disabled={building || availableCount === 0}
            className="mt-5 w-full bg-navy py-5 text-white hover:bg-navy/90 disabled:opacity-50"
          >
            {building ? "Building…" : "Build & Start Exam"}
          </Button>
        </Card>
      </div>
    </Shell>
  );
}
