-- Tighten SECURITY DEFINER helper function grants flagged by db advisors.
-- These functions only ever return the caller's own institution_id/role (scoped by auth.uid()),
-- so they're safe to call, but should not be exposed to the anon role or PUBLIC by default.

revoke all on function public.current_institution_id() from public;
revoke all on function public.current_role() from public;

grant execute on function public.current_institution_id() to authenticated;
grant execute on function public.current_role() to authenticated;
