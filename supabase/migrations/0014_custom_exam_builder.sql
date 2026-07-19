-- Board Exam Mode v2: a "Build Your Own Exam" mode that filters across every
-- seeded exam's question bank by cancer type + difficulty + count, instead
-- of only offering the 2 fixed exams. A custom attempt has no parent exams
-- row (it's an ad-hoc question set), so exam_id becomes nullable and the
-- attempt itself carries the resolved question id list + a synthesized
-- title/time limit.

alter table public.exam_questions add column if not exists difficulty text
  check (difficulty in ('Beginner', 'Intermediate', 'Advanced'));

alter table public.exam_attempts alter column exam_id drop not null;
alter table public.exam_attempts add column if not exists is_custom boolean not null default false;
alter table public.exam_attempts add column if not exists custom_question_ids uuid[];
alter table public.exam_attempts add column if not exists custom_title text;
alter table public.exam_attempts add column if not exists time_limit_minutes int;

-- Backfill difficulty on the 24 existing questions (Melanoma/BRAF, NSCLC/EGFR)
-- — first half of each seeded exam trends foundational, second half advanced,
-- matching how they were actually written.
update public.exam_questions
set difficulty = case
  when order_index < 4 then 'Beginner'
  when order_index < 8 then 'Intermediate'
  else 'Advanced'
end
where difficulty is null;
