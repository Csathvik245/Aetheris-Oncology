"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScrollText, Clock, ListChecks, Settings2 } from "lucide-react";
import { Shell } from "../components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "../lib/supabase/client";

interface ExamSummary {
  id: string;
  title: string;
  specialty_tag: string | null;
  time_limit_minutes: number;
  questionCount: number;
  bestScore: number | null;
}

export default function ExamsPage() {
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: examRows } = await supabase.from("exams").select("id, title, specialty_tag, time_limit_minutes");
      const { data: questionCounts } = await supabase.from("exam_questions").select("exam_id");
      const { data: attempts } = user
        ? await supabase.from("exam_attempts").select("exam_id, score").eq("user_id", user.id).not("score", "is", null)
        : { data: [] };

      const countByExam = new Map<string, number>();
      for (const q of questionCounts ?? []) {
        countByExam.set(q.exam_id, (countByExam.get(q.exam_id) ?? 0) + 1);
      }
      const bestByExam = new Map<string, number>();
      for (const a of attempts ?? []) {
        bestByExam.set(a.exam_id, Math.max(bestByExam.get(a.exam_id) ?? 0, a.score ?? 0));
      }

      setExams(
        (examRows ?? []).map((e) => ({
          ...e,
          questionCount: countByExam.get(e.id) ?? 0,
          bestScore: bestByExam.get(e.id) ?? null,
        })),
      );
      setLoading(false);
    })();
  }, []);

  return (
    <Shell breadcrumb="Board Exam Mode">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy text-white">
            <ScrollText size={17} />
          </span>
          <div className="flex-1">
            <h1 className="font-heading text-[24px] font-bold tracking-tight text-foreground">Board Exam Mode</h1>
            <p className="text-[13px] text-muted-foreground">Timed, no-hints. Full explanations only after you submit.</p>
          </div>
          <Link href="/exams/custom">
            <Button variant="outline" className="gap-1.5">
              <Settings2 size={14} /> Build Your Own Exam
            </Button>
          </Link>
        </div>

        {!loading && exams.length === 0 && (
          <Card className="mt-6 p-6 text-[13px] text-muted-foreground">No exams available yet.</Card>
        )}

        <div className="mt-6 grid grid-cols-2 gap-5">
          {exams.map((e) => (
            <Link key={e.id} href={`/exams/${e.id}`}>
              <Card className="lift h-full p-5">
                <div className="flex items-center justify-between">
                  {e.specialty_tag && <Badge className="bg-navy-tint text-navy">{e.specialty_tag}</Badge>}
                  {e.bestScore !== null && (
                    <span className={`text-[12px] font-semibold ${e.bestScore < 70 ? "text-coral-text" : "text-teal-deep"}`}>
                      Best: {e.bestScore}%
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-heading text-[16px] font-semibold leading-snug text-foreground">{e.title}</h3>
                <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-[12px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> {e.time_limit_minutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <ListChecks size={13} /> {e.questionCount} questions
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Shell>
  );
}
