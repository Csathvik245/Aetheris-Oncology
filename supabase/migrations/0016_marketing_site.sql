-- Marketing/sales site: per-tier purchase caps, pending-payment institution
-- status, pilot request/redemption codes, and a platform-admin flag for the
-- founder-only /admin console.

alter table institutions
  add column status text not null default 'active'
    check (status in ('active', 'pending_payment'));

alter table profiles
  add column is_platform_admin boolean not null default false;

-- Per-tier institution purchase caps ("only that number of seats are
-- available"). Counted against institutions.status = 'active' only, so an
-- abandoned checkout doesn't consume a slot. Founder-editable via /admin.
create table plan_seat_caps (
  plan_tier text primary key check (plan_tier in ('starter', 'professional', 'academic')),
  max_institutions int not null check (max_institutions >= 0),
  updated_at timestamptz not null default now()
);

insert into plan_seat_caps (plan_tier, max_institutions) values
  ('starter', 15),
  ('professional', 10),
  ('academic', 6);

-- Sales-call pilot codes. A code with target_institution_id set can only be
-- redeemed by that institution (upgrade path); a code with it null can spin
-- up a brand-new institution.
create table pilot_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  plan_tier text not null check (plan_tier in ('free_pilot', 'starter', 'professional', 'academic')),
  target_institution_id uuid references institutions(id) on delete cascade,
  redeemed_institution_id uuid references institutions(id) on delete set null,
  redeemed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table institutions
  add column pilot_code_id uuid references pilot_codes(id) on delete set null;

-- Inbound "request a pilot" form submissions from the marketing site.
create table pilot_requests (
  id uuid primary key default gen_random_uuid(),
  institution_name text not null,
  contact_name text not null,
  contact_email text not null,
  phone text,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

alter table plan_seat_caps enable row level security;
alter table pilot_codes enable row level security;
alter table pilot_requests enable row level security;

-- No policies for anon/authenticated on any of the three tables above —
-- all reads/writes go through service-role-backed API routes (public
-- capacity/pilot-request/redeem endpoints, and platform-admin-gated /admin
-- endpoints), matching how institutions/profiles provisioning already works.
revoke all on plan_seat_caps from anon, authenticated, public;
revoke all on pilot_codes from anon, authenticated, public;
revoke all on pilot_requests from anon, authenticated, public;
