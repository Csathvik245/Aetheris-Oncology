-- Phase 4: Faculty Review Mode — comments/verdicts on a resident's case submission.

create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  case_id text not null,
  submission_user_id uuid not null references public.profiles(id) on delete cascade,
  faculty_id uuid not null references public.profiles(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete set null,
  body text not null,
  verdict text check (verdict in ('approve', 'disagree', 'comment')),
  created_at timestamptz not null default now()
);

create index if not exists review_comments_submission_idx on public.review_comments(case_id, submission_user_id);

alter table public.review_comments enable row level security;

-- Insert: faculty/admin only, and only within their own institution.
create policy "review_comments_insert_faculty" on public.review_comments
  for insert to authenticated
  with check (
    faculty_id = auth.uid()
    and public.current_role() in ('faculty', 'admin')
    and institution_id = public.current_institution_id()
  );

-- Select: the faculty author, or the resident who owns the underlying submission.
create policy "review_comments_select_author" on public.review_comments
  for select to authenticated
  using (faculty_id = auth.uid());

create policy "review_comments_select_subject" on public.review_comments
  for select to authenticated
  using (submission_user_id = auth.uid());

create policy "review_comments_select_cohort_faculty" on public.review_comments
  for select to authenticated
  using (institution_id = public.current_institution_id() and public.current_role() in ('faculty', 'admin'));
