-- Phase 6: Leaderboards — institution-scoped only. The function reads the
-- caller's institution from current_institution_id() (their own JWT via
-- profiles), never a client-supplied id, so a resident can't request
-- another institution's leaderboard by passing a different id.

create or replace function public.get_leaderboard()
returns table (
  category text,
  user_id uuid,
  full_name text,
  value numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with my_institution as (
    select public.current_institution_id() as id
  ),
  per_user as (
    select
      h.user_id,
      count(*) as cases_completed,
      avg(h.agreement) as avg_agreement,
      stddev_pop(h.agreement) as agreement_stddev
    from public.history_entries h, my_institution mi
    where h.institution_id = mi.id
    group by h.user_id
  ),
  ordered as (
    select
      h.user_id,
      h.agreement,
      row_number() over (partition by h.user_id order by h.occurred_at asc) as rn,
      count(*) over (partition by h.user_id) as total
    from public.history_entries h, my_institution mi
    where h.institution_id = mi.id
  ),
  improvement as (
    select
      user_id,
      avg(agreement) filter (where rn > total / 2.0) - avg(agreement) filter (where rn <= total / 2.0) as delta
    from ordered
    group by user_id
    having count(*) >= 4
  ),
  trial_engagement as (
    select
      p.user_id,
      count(*) as trial_matched_cases
    from public.pipeline_runs p, my_institution mi
    where p.institution_id = mi.id and jsonb_array_length(coalesce(p.trials, '[]'::jsonb)) > 0
    group by p.user_id
  )
  select 'most_active', pu.user_id, pr.full_name, pu.cases_completed::numeric
  from per_user pu join public.profiles pr on pr.id = pu.user_id
  union all
  select 'evidence_master', pu.user_id, pr.full_name, round(pu.avg_agreement, 1)
  from per_user pu join public.profiles pr on pr.id = pu.user_id
  where pu.cases_completed >= 2
  union all
  select 'most_improved', im.user_id, pr.full_name, round(im.delta, 1)
  from improvement im join public.profiles pr on pr.id = im.user_id
  where im.delta > 0
  union all
  select 'consistency', pu.user_id, pr.full_name, round(pu.agreement_stddev, 1)
  from per_user pu join public.profiles pr on pr.id = pu.user_id
  where pu.cases_completed >= 3
  union all
  select 'trial_expert', te.user_id, pr.full_name, te.trial_matched_cases::numeric
  from trial_engagement te join public.profiles pr on pr.id = te.user_id;
$$;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to authenticated;
