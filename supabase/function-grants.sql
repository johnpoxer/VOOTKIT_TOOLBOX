-- Vootkit — function EXECUTE grants.
-- APPLIED to project qfqdmzwmjxdiqzeybaoo. Kept here so a rebuild or a restore
-- cannot silently reopen the hole.
--
-- THE TRAP
-- Postgres grants EXECUTE on every new function to PUBLIC by default, and
-- "revoke ... from anon" does NOT remove it — anon inherits through PUBLIC.
-- Supabase exposes public-schema functions at /rest/v1/rpc/<name>, so anything
-- left at the default is callable by anyone holding the public anon key. For a
-- SECURITY DEFINER function that also means RLS is bypassed.
--
-- This bit us on tool_health() (would have leaked error messages) and
-- prune_error_logs() (would have let anyone delete the entire error log).
-- Three pre-existing functions had the same exposure.
--
-- Rule: revoke from PUBLIC, then grant back explicitly to the role that needs it.

-- ---------------------------------------------------------------------------
-- Error-log functions (see error_logs.sql) — service role only.
-- ---------------------------------------------------------------------------
revoke all on function public.tool_health(int) from public, anon, authenticated;
grant execute on function public.tool_health(int) to service_role;

revoke all on function public.prune_error_logs(int) from public, anon, authenticated;
grant execute on function public.prune_error_logs(int) to service_role;

-- ---------------------------------------------------------------------------
-- Trigger / event-trigger functions. These fire in the table-owner context, not
-- the caller's, so revoking EXECUTE does not stop the triggers — it only
-- removes the ability to invoke them directly over the REST API.
-- Verified after applying: the on_auth_user_created trigger is still enabled.
-- ---------------------------------------------------------------------------
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Link click counter. SECURITY INVOKER, and only ever called by the redirect
-- Netlify function with SUPABASE_SERVICE_ROLE_KEY. Verified no client-side
-- .rpc() call exists before revoking.
-- search_path is pinned because a mutable one becomes a privilege-escalation
-- vector the moment a function is switched to SECURITY DEFINER.
-- ---------------------------------------------------------------------------
revoke all on function public.increment_link_clicks(text) from public, anon, authenticated;
grant execute on function public.increment_link_clicks(text) to service_role;
alter function public.increment_link_clicks(text) set search_path = public;

-- ---------------------------------------------------------------------------
-- Audit query — run after adding ANY function to the public schema.
-- Anything reporting other than "locked down" is reachable with the anon key.
-- ---------------------------------------------------------------------------
-- select p.proname,
--        case when array_to_string(p.proacl,',') like '%anon=X%' then 'anon STILL has EXECUTE'
--             when p.proacl is null then 'DEFAULT (PUBLIC has EXECUTE)'
--             else 'locked down' end as status
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
-- order by p.proname;
