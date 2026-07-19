// One-off seed script: inserts hand-written board exams (global,
// institution_id=null) if they don't already exist by title.
// Run: node scripts/seed-exams.mjs [data-file.json]  (defaults to exam-data.json)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = process.argv[2] || "exam-data.json";
const data = JSON.parse(readFileSync(path.join(__dirname, dataFile), "utf-8"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

for (const exam of data.exams) {
  const { data: existing } = await supabase.from("exams").select("id").eq("title", exam.title).maybeSingle();
  if (existing) {
    console.log(`Skipping "${exam.title}" — already exists (${existing.id})`);
    continue;
  }

  const { data: examRow, error: examError } = await supabase
    .from("exams")
    .insert({ title: exam.title, specialty_tag: exam.specialtyTag, time_limit_minutes: exam.timeLimitMinutes, institution_id: null })
    .select("id")
    .single();

  if (examError) {
    console.error(`Failed to insert exam "${exam.title}":`, examError.message);
    continue;
  }

  const questionRows = exam.questions.map((q, i) => ({
    exam_id: examRow.id,
    order_index: i,
    stem: q.stem,
    choices: q.choices,
    correct_choice: q.correctChoice,
    explanation: q.explanation,
    citation: q.citation ?? null,
    difficulty: q.difficulty ?? null,
    topic_tags: q.topicTags ?? [],
  }));

  const { error: questionsError } = await supabase.from("exam_questions").insert(questionRows);
  if (questionsError) {
    console.error(`Failed to insert questions for "${exam.title}":`, questionsError.message);
    continue;
  }

  console.log(`Seeded "${exam.title}" — ${questionRows.length} questions (${examRow.id})`);
}
