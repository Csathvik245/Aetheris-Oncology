"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Timer } from "lucide-react";
import { Shell } from "@/app/components/shell/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/app/lib/supabase/client";

interface Question {
  id: string;
  order_index: number;
  stem: string;
  choices: { key: string; label: string }[];
}

export default function ExamTakePage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  const router = useRouter();
  const [examTitle, setExamTitle] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(20);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startedAtRef = useRef<number>(0);
  const submittedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from("profiles").select("institution_id").eq("id", user.id).single();
      const { data: exam } = await supabase.from("exams").select("title, time_limit_minutes").eq("id", examId).single();
      // No-hints: only stem/choices are selected — correct_choice/explanation
      // are never fetched to the client during the attempt.
      const { data: qs } = await supabase
        .from("exam_questions")
        .select("id, order_index, stem, choices")
        .eq("exam_id", examId)
        .order("order_index", { ascending: true })
        .returns<Question[]>();

      if (exam) {
        setExamTitle(exam.title);
        setTimeLimitMinutes(exam.time_limit_minutes);
        setSecondsLeft(exam.time_limit_minutes * 60);
      }
      setQuestions(qs ?? []);

      const { data: attempt } = await supabase
        .from("exam_attempts")
        .insert({ exam_id: examId, user_id: user.id, institution_id: profile?.institution_id ?? null })
        .select("id, started_at")
        .single();
      if (attempt) {
        setAttemptId(attempt.id);
        startedAtRef.current = new Date(attempt.started_at).getTime();
      }
    })();
  }, [examId]);

  useEffect(() => {
    if (secondsLeft === null) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s === null) return s;
        if (s <= 1) {
          clearInterval(id);
          submit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft !== null]);

  function select(questionId: string, choiceKey: string) {
    setAnswers((a) => ({ ...a, [questionId]: choiceKey }));
  }

  async function submit() {
    if (submittedRef.current || !attemptId) return;
    submittedRef.current = true;
    setSubmitting(true);
    const timeSpent = Math.round((Date.now() - startedAtRef.current) / 1000);
    const supabase = createClient();
    await supabase
      .from("exam_attempts")
      .update({ answers, submitted_at: new Date().toISOString(), time_spent_seconds: timeSpent })
      .eq("id", attemptId);
    router.push(`/exams/${examId}/results/${attemptId}`);
  }

  const q = questions[current];
  const answeredCount = Object.keys(answers).length;
  const mm = secondsLeft !== null ? Math.floor(secondsLeft / 60) : timeLimitMinutes;
  const ss = secondsLeft !== null ? secondsLeft % 60 : 0;

  return (
    <Shell breadcrumb="Board Exam">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-[19px] font-bold text-foreground">{examTitle}</h1>
          <span
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold tnum ${
              secondsLeft !== null && secondsLeft < 60 ? "border-coral-ring bg-coral-tint text-coral-text" : "border-border bg-card text-foreground"
            }`}
          >
            <Timer size={14} />
            {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Question {current + 1} of {questions.length} · {answeredCount} answered
        </p>

        {q && (
          <Card className="mt-5 p-6">
            <p className="text-[14.5px] leading-relaxed text-foreground">{q.stem}</p>
            <div className="mt-5 flex flex-col gap-2">
              {q.choices.map((c) => (
                <button
                  key={c.key}
                  onClick={() => select(q.id, c.key)}
                  className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-[13.5px] transition-colors ${
                    answers[q.id] === c.key ? "border-navy bg-navy-tint text-navy" : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="font-semibold">{c.key}.</span> {c.label}
                </button>
              ))}
            </div>
          </Card>
        )}

        <div className="mt-5 flex items-center justify-between">
          <Button variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
            Previous
          </Button>
          <div className="flex gap-1">
            {questions.map((qq, i) => (
              <button
                key={qq.id}
                onClick={() => setCurrent(i)}
                className={`h-2 w-2 rounded-full ${
                  i === current ? "bg-navy" : answers[qq.id] ? "bg-teal" : "bg-border"
                }`}
              />
            ))}
          </div>
          {current < questions.length - 1 ? (
            <Button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))} className="bg-navy text-white hover:bg-navy/90">
              Next
            </Button>
          ) : (
            <Button onClick={submit} disabled={submitting} className="bg-teal-deep text-white hover:bg-teal-deep/90">
              {submitting ? "Submitting…" : "Submit Exam"}
            </Button>
          )}
        </div>
      </div>
    </Shell>
  );
}
