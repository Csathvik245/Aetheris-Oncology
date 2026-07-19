-- Phase 5: Adaptive Curriculum — regenerate-on-demand weekly learning path
-- built from the resident's own weakest-skill history.

create table if not exists public.curriculum_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete set null,
  generated_at timestamptz not null default now(),
  weeks jsonb not null default '[]',
  active boolean not null default true
);

create index if not exists curriculum_plans_user_id_idx on public.curriculum_plans(user_id);

alter table public.curriculum_plans enable row level security;

create policy "curriculum_plans_own" on public.curriculum_plans
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "curriculum_plans_cohort_select" on public.curriculum_plans
  for select to authenticated
  using (institution_id = public.current_institution_id() and public.current_role() in ('faculty', 'admin'));
