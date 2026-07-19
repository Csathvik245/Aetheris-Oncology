-- Phase 2: case library (generated/faculty-authored) + per-resident practice data
-- Hand-authored library content (frontend/app/lib/mock.ts) intentionally stays in
-- code, not here — it's static reference content with no ownership/visibility
-- concerns. This table holds dynamic, per-account content: Case Generator output
-- now, faculty-authored cases and marketplace listings in a later phase.

create table if not exists public.cases (
  -- text PK (not uuid) so client-generated "gen-<uuid>" ids from the existing
  -- Case Generator convention keep working without touching every call site
  -- that does isGeneratedCaseId(id) string-prefix matching.
  id text primary key,
  institution_id uuid references public.institutions(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  source text not null check (source in ('synthetic', 'faculty_authored', 'vcf_upload')),
  visibility text not null default 'private' check (visibility in ('private', 'institution', 'public', 'marketplace')),
  verified boolean not null default false,

  title text not null,
  difficulty text not null,
  est_minutes int not null default 20,
  stage text,
  tags text[] not null default '{}',

  age int,
  sex text,
  ecog int,
  chief_complaint text,
  medical_history text[] not null default '{}',
  imaging jsonb not null default '[]',
  pathology jsonb not null default '{}',

  candidate_drugs jsonb not null default '[]',
  toxicity_concerns text[] not null default '{}',
  clinical_pearl text,
  objective_titles text[] not null default '{}',

  favorite_count int not null default 0,

  created_at timestamptz not null default now()
);

create index if not exists cases_owner_id_idx on public.cases(owner_id);
create index if not exists cases_institution_id_idx on public.cases(institution_id);

create table if not exists public.worksheet_drafts (
  case_id text not null references public.cases(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  step int not null default 0,
  phase text not null,
  drugs jsonb not null default '[]',
  monitoring text,
  dose_modification text,
  toxicity_options text[] not null default '{}',
  tags text[] not null default '{}',
  confidence int not null default 75,
  diagnosis_note text,
  biomarker_order text[] not null default '{}',
  biomarker_checks jsonb not null default '{}',
  saved_at timestamptz not null default now(),
  primary key (case_id, user_id)
);

-- worksheet_drafts.case_id references cases(id), but the worksheet also
-- operates on frontend/app/lib/mock.ts library cases whose ids never appear
-- in the cases table. Drop the FK constraint (keep the column) so drafts and
-- submissions can reference either a DB case row or a static mock case id.
alter table public.worksheet_drafts drop constraint if exists worksheet_drafts_case_id_fkey;

create table if not exists public.case_submissions (
  case_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete set null,
  phase text not null,
  drugs jsonb not null default '[]',
  monitoring text,
  dose_modification text,
  tags text[] not null default '{}',
  confidence int not null default 75,
  diagnosis_note text,
  biomarker_order text[] not null default '{}',
  biomarker_checks jsonb not null default '{}',
  submitted_at timestamptz not null default now(),
  primary key (case_id, user_id)
);

create table if not exists public.pipeline_runs (
  case_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete set null,
  mutations jsonb not null default '[]',
  citations jsonb not null default '[]',
  drug_scores jsonb not null default '[]',
  trials jsonb not null default '[]',
  risks jsonb not null default '[]',
  plan jsonb,
  completed_at timestamptz not null default now(),
  primary key (case_id, user_id)
);

create table if not exists public.history_entries (
  id uuid primary key default gen_random_uuid(),
  case_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete set null,
  title text not null,
  difficulty text not null,
  agreement int not null,
  occurred_at timestamptz not null default now()
);

create index if not exists history_entries_user_id_idx on public.history_entries(user_id);
create index if not exists history_entries_institution_id_idx on public.history_entries(institution_id);

alter table public.cases enable row level security;
alter table public.worksheet_drafts enable row level security;
alter table public.case_submissions enable row level security;
alter table public.pipeline_runs enable row level security;
alter table public.history_entries enable row level security;

-- cases: visible per visibility rules; writable by the owner only.
create policy "cases_select_visible" on public.cases
  for select to authenticated
  using (
    visibility in ('public', 'marketplace')
    or owner_id = auth.uid()
    or (visibility = 'institution' and institution_id = public.current_institution_id())
  );

create policy "cases_insert_own" on public.cases
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "cases_update_own" on public.cases
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "cases_delete_own" on public.cases
  for delete to authenticated
  using (owner_id = auth.uid());

-- worksheet_drafts / case_submissions / pipeline_runs: resident owns their
-- rows; faculty/admin get read-only cohort visibility (institution match).
create policy "worksheet_drafts_own" on public.worksheet_drafts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "case_submissions_own" on public.case_submissions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "case_submissions_cohort_select" on public.case_submissions
  for select to authenticated
  using (institution_id = public.current_institution_id() and public.current_role() in ('faculty', 'admin'));

create policy "pipeline_runs_own" on public.pipeline_runs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "pipeline_runs_cohort_select" on public.pipeline_runs
  for select to authenticated
  using (institution_id = public.current_institution_id() and public.current_role() in ('faculty', 'admin'));

create policy "history_entries_own" on public.history_entries
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "history_entries_cohort_select" on public.history_entries
  for select to authenticated
  using (institution_id = public.current_institution_id() and public.current_role() in ('faculty', 'admin'));
