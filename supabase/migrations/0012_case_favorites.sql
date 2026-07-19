-- Phase 6: AI Case Marketplace — favoriting. favorite_count on `cases` is
-- maintained via trigger so reads don't need to expose other users' rows.

create table if not exists public.case_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_id text not null references public.cases(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, case_id)
);

alter table public.case_favorites enable row level security;

create policy "case_favorites_own" on public.case_favorites
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.sync_case_favorite_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    update public.cases set favorite_count = favorite_count + 1 where id = new.case_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update public.cases set favorite_count = greatest(0, favorite_count - 1) where id = old.case_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists case_favorites_sync_count on public.case_favorites;
create trigger case_favorites_sync_count
  after insert or delete on public.case_favorites
  for each row execute function public.sync_case_favorite_count();
