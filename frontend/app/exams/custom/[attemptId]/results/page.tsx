"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, ArrowLeft } from "lucide-react";
import { Shell } from "@/app/components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/app/lib/supabase/client";

interface QuestionWithAnswer {
  id: string;
  stem: string;
  choices: { key: string; label: string }[];
  correct_choice: string;
  explanation: string;
  citation: string | null;
}

export default function CustomExamResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params);
  const [examTitle, setExamTitle] = useState("Custom Exam");
  const [questions, setQuestions] = useState<QuestionWithAnswer[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: attempt } = await supabase
        .from("exam_attempts")
        .select("custom_title, custom_question_ids, answers, score")
        .eq("id", attemptId)
        .single();
      if (!attempt) {
        setLoading(false);
        return;
      }

      setExamTitle(attempt.custom_title ?? "Custom Exam");
      const attemptAnswers = (attempt.answers ?? {}) as Record<string, string>;
      setAnswers(attemptAnswers);

      const ids: string[] = attempt.custom_question_ids ?? [];
      const { data: qs } = await supabase
        .from("exam_questions")
        .select("id, stem, choices, correct_choice, explanation, citation")
        .in("id", ids)
        .returns<QuestionWithAnswer[]>();

      const byId = new Map((qs ?? []).map((q) => [q.id, q]));
      const ordered = ids.map((id) => byId.get(id)).filter((q): q is QuestionWithAnswer => !!q);
      setQuestions(ordered);

      if (ordered.length > 0) {
        const correct = ordered.filter((q) => attemptAnswers[q.id] === q.correct_choice).length;
        const pct = Math.round((correct / ordered.length) * 100);
        setScore(pct);
        if (attempt.score == null) {
          await supabase.from("exam_attempts").update({ score: pct }).eq("id", attemptId);
        }
      }
      setLoading(false);
    })();
  }, [attemptId]);

  if (loading) return null;

  const correctCount = questions.filter((q) => answers[q.id] === q.correct_choice).length;

  return (
    <Shell breadcrumb="Exam Results">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Link href="/exams" className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Back to Exams
        </Link>

        <div className="mt-3 flex items-center justify-between">
          <h1 className="font-heading text-[22px] font-bold text-foreground">{examTitle}</h1>
          <div className="text-right">
            <div className="label">Score</div>
            <div className={`font-heading text-3xl font-bold tnum ${score !== null && score < 70 ? "text-coral-text" : "text-teal-deep"}`}>
              {score}%
            </div>
          </div>
        </div>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {correctCount} of {questions.length} correct
        </p>

        <div className="mt-6 flex flex-col gap-4">
          {questions.map((q, i) => {
            const picked = answers[q.id];
            const isCorrect = picked === q.correct_choice;
            return (
              <Card key={q.id} className="p-5">
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                      isCorrect ? "bg-teal-tint text-teal-deep" : "bg-coral-tint text-coral-text"
                    }`}
                  >
                    {isCorrect ? <Check size={14} /> : <X size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-foreground">
                      {i + 1}. {q.stem}
                    </p>
                    <div className="mt-3 flex flex-col gap-1.5">
                      {q.choices.map((c) => {
                        const isPicked = picked === c.key;
                        const isRight = c.key === q.correct_choice;
                        return (
                          <div
                            key={c.key}
                            className={`rounded-lg border px-3 py-2 text-[12.5px] ${
                              isRight
                                ? "border-teal-ring bg-teal-tint text-teal-deep"
                                : isPicked
                                  ? "border-coral-ring bg-coral-tint text-coral-text"
                                  : "border-border text-muted-foreground"
                            }`}
                          >
                            <span className="font-semibold">{c.key}.</span> {c.label}
                            {isPicked && !isRight && " — your answer"}
                            {isRight && " — correct"}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 rounded-lg bg-muted p-3">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-navy text-white">Explanation</Badge>
                        {q.citation && <span className="text-[10.5px] text-muted-foreground">{q.citation}</span>}
                      </div>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-foreground">{q.explanation}</p>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
