-- Phase 5: Board Exam Mode — timed, no-hints exam interface with AI
-- explanations shown only after submission.

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete set null, -- null = global seed content
  title text not null,
  specialty_tag text,
  time_limit_minutes int not null default 20,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  order_index int not null,
  stem text not null,
  choices jsonb not null, -- [{key, label}]
  correct_choice text not null,
  explanation text not null,
  citation text,
  created_at timestamptz not null default now()
);

create index if not exists exam_questions_exam_id_idx on public.exam_questions(exam_id);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete set null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  answers jsonb not null default '{}', -- { question_id: choice_key }
  score int,
  time_spent_seconds int
);

create index if not exists exam_attempts_user_id_idx on public.exam_attempts(user_id);

alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_attempts enable row level security;

-- exams: readable institution-wide or globally (null institution_id); writable by faculty/admin only.
create policy "exams_select_visible" on public.exams
  for select to authenticated
  using (institution_id is null or institution_id = public.current_institution_id());

create policy "exams_write_faculty" on public.exams
  for all to authenticated
  using (public.current_role() in ('faculty', 'admin'))
  with check (public.current_role() in ('faculty', 'admin'));

-- exam_questions: same visibility as their parent exam. Choices/stem are
-- fine to expose pre-submission (no hints leak — correct_choice/explanation
-- are still visible via this same row, but the client only ever reveals
-- them in the UI after submission; RLS can't easily hide columns
-- conditionally, so this is a client-enforced no-hints rule, not a
-- database-enforced one).
create policy "exam_questions_select_visible" on public.exam_questions
  for select to authenticated
  using (
    exam_id in (
      select id from public.exams where institution_id is null or institution_id = public.current_institution_id()
    )
  );

create policy "exam_questions_write_faculty" on public.exam_questions
  for all to authenticated
  using (public.current_role() in ('faculty', 'admin'))
  with check (public.current_role() in ('faculty', 'admin'));

-- exam_attempts: resident owns their own; faculty/admin get cohort read access.
create policy "exam_attempts_own" on public.exam_attempts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "exam_attempts_cohort_select" on public.exam_attempts
  for select to authenticated
  using (institution_id = public.current_institution_id() and public.current_role() in ('faculty', 'admin'));
