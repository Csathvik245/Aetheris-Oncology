-- Faculty assigning specific cases to specific residents. case_id is
-- intentionally unconstrained (no FK to cases(id)) — same reasoning as
-- case_submissions/pipeline_runs/history_entries: the library also includes
-- static frontend/app/lib/mock.ts cases whose ids never appear in the
-- `cases` table. case_title is denormalized at assignment time so this
-- table doesn't need to join out to resolve a mock case's title.

create table case_assignments (
  id uuid primary key default gen_random_uuid(),
  case_id text not null,
  case_title text not null,
  institution_id uuid references institutions(id) on delete cascade,
  assigned_by uuid not null references profiles(id) on delete cascade,
  assigned_to uuid not null references profiles(id) on delete cascade,
  note text,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  unique (case_id, assigned_to)
);

create index case_assignments_assigned_to_idx on case_assignments(assigned_to);
create index case_assignments_institution_id_idx on case_assignments(institution_id);

alter table case_assignments enable row level security;

create policy "case_assignments_select_own_or_cohort" on case_assignments
  for select to authenticated
  using (
    assigned_to = auth.uid()
    or (institution_id = public.current_institution_id() and public.current_role() in ('faculty', 'admin'))
  );

create policy "case_assignments_insert_faculty" on case_assignments
  for insert to authenticated
  with check (
    assigned_by = auth.uid()
    and public.current_role() in ('faculty', 'admin')
    and institution_id = public.current_institution_id()
  );

create policy "case_assignments_delete_faculty" on case_assignments
  for delete to authenticated
  using (public.current_role() in ('faculty', 'admin') and institution_id = public.current_institution_id());
