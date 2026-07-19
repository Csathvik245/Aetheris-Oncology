-- Phase 5: AI Mentor — durable, append-only memory of a resident's
-- weaknesses/strengths/mistakes/suggestions across sessions.

create table if not exists public.mentor_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete set null,
  note_type text not null check (note_type in ('weakness', 'strength', 'mistake', 'suggestion')),
  body text not null,
  related_case_id text,
  source text not null default 'auto' check (source in ('auto', 'faculty')),
  created_at timestamptz not null default now()
);

create index if not exists mentor_notes_user_id_idx on public.mentor_notes(user_id);

alter table public.mentor_notes enable row level security;

create policy "mentor_notes_own" on public.mentor_notes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "mentor_notes_cohort_select" on public.mentor_notes
  for select to authenticated
  using (institution_id = public.current_institution_id() and public.current_role() in ('faculty', 'admin'));
