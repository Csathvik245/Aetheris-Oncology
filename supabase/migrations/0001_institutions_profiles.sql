-- Phase 1: auth + multi-tenancy foundation
-- institutions (tenant/billing root) and profiles (1:1 auth.users, role + tenant link)

create extension if not exists pgcrypto;

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan_tier text not null default 'free_pilot'
    check (plan_tier in ('free_pilot', 'starter', 'professional', 'academic', 'enterprise')),

  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_subscription_status text,

  learner_seat_limit int,          -- null = unlimited
  storage_limit_mb int,            -- null = unlimited
  case_gen_monthly_limit int,      -- null = unlimited
  case_gen_used_this_period int not null default 0,
  usage_period_start date not null default date_trunc('month', now())::date,
  storage_used_mb numeric not null default 0,

  free_pilot_started_at timestamptz,
  free_pilot_expires_at timestamptz,

  feature_flags jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete set null,
  role text not null check (role in ('resident', 'faculty', 'admin')),
  display_role text,               -- clinical training level label (PGY-1, Fellow, ...)
  full_name text not null,
  avatar_initials text,
  onboarded_at timestamptz,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_institution_id_idx on public.profiles(institution_id);
create index if not exists institutions_slug_idx on public.institutions(slug);

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists institutions_set_updated_at on public.institutions;
create trigger institutions_set_updated_at
  before update on public.institutions
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- prevent self-escalation: only service_role may change role or institution_id on an existing profile
create or replace function public.protect_profile_role_institution()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_setting('role', true) <> 'service_role' then
    if new.role is distinct from old.role or new.institution_id is distinct from old.institution_id then
      raise exception 'role and institution_id can only be changed by an administrative process';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role_institution on public.profiles;
create trigger profiles_protect_role_institution
  before update on public.profiles
  for each row execute function public.protect_profile_role_institution();

-- helper: current caller's institution_id + role, used throughout RLS policies
create or replace function public.current_institution_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select institution_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.institutions enable row level security;
alter table public.profiles enable row level security;

-- institutions: members can read their own institution; only admins can update it;
-- inserts happen only via service-role server code (signup flow), so no insert policy for anon/authenticated.
create policy "institutions_select_own" on public.institutions
  for select to authenticated
  using (id = public.current_institution_id());

create policy "institutions_update_admin_only" on public.institutions
  for update to authenticated
  using (id = public.current_institution_id() and public.current_role() = 'admin')
  with check (id = public.current_institution_id() and public.current_role() = 'admin');

-- profiles: self read/write; faculty/admin can read their institution's cohort (select-only)
create policy "profiles_select_self" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles_select_cohort_for_faculty" on public.profiles
  for select to authenticated
  using (
    institution_id = public.current_institution_id()
    and public.current_role() in ('faculty', 'admin')
  );

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
