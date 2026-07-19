-- Same anon-grant issue as 0002/0004: explicit revoke needed after create.

revoke execute on function public.get_leaderboard() from anon, authenticated, public;
grant execute on function public.get_leaderboard() to authenticated;

-- sync_case_favorite_count is a trigger function only — nobody should call
-- it directly via RPC.
revoke execute on function public.sync_case_favorite_count() from anon, authenticated, public;
