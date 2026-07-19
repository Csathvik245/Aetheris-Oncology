-- 0002's revoke didn't stick for the `anon` role (Supabase likely re-asserts
-- default privileges on public-schema functions after migrations run). Be
-- explicit this time: revoke from anon/authenticated/public directly, then
-- grant back only to authenticated.

revoke execute on function public.current_institution_id() from anon, authenticated, public;
revoke execute on function public.current_role() from anon, authenticated, public;

grant execute on function public.current_institution_id() to authenticated;
grant execute on function public.current_role() to authenticated;
