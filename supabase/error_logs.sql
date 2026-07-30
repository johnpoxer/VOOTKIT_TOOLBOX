-- Vootkit — client-side error reporting.
-- Run this in the Supabase SQL editor (project qfqdmzwmjxdiqzeybaoo).
--
-- WHY THIS EXISTS
-- Two tools were broken in production for an unknown length of time and nothing
-- reported it. They were found because a user said so. Every acquisition effort
-- multiplies traffic into the product, so a silent failure multiplies with it.
-- This table is the signal that was missing.
--
-- PRIVACY — READ BEFORE EXTENDING
-- Vootkit's core promise is that files never leave the device. An error logger
-- is the most likely place to break that promise by accident. This table must
-- NEVER receive: file contents, file names, file paths, clipboard or form input,
-- email addresses, or anything else a user typed. The client (assets/js/errors.js)
-- scrubs those before sending; the length caps below are a second line of defence.
-- If you add a column, ask what a user could have typed into it.
--
-- ACCESS MODEL
-- The browser reports with the PUBLIC ANON key, so anon must be able to INSERT.
-- Nothing else. Anon cannot read, update or delete — an open read policy would
-- expose one user's errors to another. The admin console reads with the SERVICE
-- ROLE key from a Netlify function, which bypasses RLS (same pattern as links.sql).

create table if not exists public.error_logs (
  id          bigint generated always as identity primary key,
  tool_name   text        not null,
  error_type  text        not null default 'runtime',
  message     text        not null,
  page        text,                       -- pathname only, never the query string
  severity    text        not null default 'error',
  resolved    boolean     not null default false,
  user_agent  text,
  created_at  timestamptz not null default now(),

  -- Caps are deliberate: they bound abuse, and they stop a runaway stack trace
  -- or an accidentally-included file blob from landing in the database.
  constraint error_logs_tool_len     check (char_length(tool_name)  between 1 and 64),
  constraint error_logs_type_len     check (char_length(error_type) between 1 and 40),
  constraint error_logs_message_len  check (char_length(message)    between 1 and 500),
  constraint error_logs_page_len     check (page is null or char_length(page) <= 200),
  constraint error_logs_ua_len       check (user_agent is null or char_length(user_agent) <= 200),
  constraint error_logs_severity     check (severity in ('info', 'warn', 'error', 'critical'))
);

-- "Which tools are failing, most recent first" — the query the dashboard runs.
create index if not exists error_logs_tool_time_idx on public.error_logs (tool_name, created_at desc);
-- "What is unresolved and serious right now".
create index if not exists error_logs_open_idx on public.error_logs (severity, created_at desc) where resolved = false;

alter table public.error_logs enable row level security;

-- Anonymous browsers may report, and nothing more.
drop policy if exists "anon can report errors" on public.error_logs;
create policy "anon can report errors"
  on public.error_logs for insert
  to anon, authenticated
  with check (true);

-- No select/update/delete policies: reads go through the service role only.

-- ---------------------------------------------------------------------------
-- Health rollup for /admin/tool-health. Runs as the definer so a single
-- service-role call gets the whole dashboard without pulling raw rows.
-- ---------------------------------------------------------------------------
create or replace function public.tool_health(window_hours int default 24)
returns table (
  tool_name    text,
  errors       bigint,
  last_error   timestamptz,
  top_message  text
)
language sql
security definer
set search_path = public
as $$
  select
    e.tool_name,
    count(*) as errors,
    max(e.created_at) as last_error,
    (array_agg(e.message order by e.created_at desc))[1] as top_message
  from public.error_logs e
  where e.created_at > now() - make_interval(hours => window_hours)
    and e.resolved = false
  group by e.tool_name
  order by count(*) desc;
$$;

-- CRITICAL: Postgres grants EXECUTE on a new function to PUBLIC by default, and
-- "revoke ... from anon" does NOT remove that grant — anon inherits it through
-- PUBLIC. Both functions here are SECURITY DEFINER, so getting this wrong means
-- anyone holding the public anon key can read aggregated error messages, and
-- (below) delete the entire log. Revoke from PUBLIC, then grant back explicitly.
-- Verified against the live project: anon now gets 42501 insufficient_privilege.
revoke all on function public.tool_health(int) from public, anon, authenticated;
grant execute on function public.tool_health(int) to service_role;

-- ---------------------------------------------------------------------------
-- Retention. Error logs are an operational signal, not an archive; keeping them
-- forever grows the table without adding information. Run monthly, or schedule
-- with pg_cron if it is enabled on the project.
-- ---------------------------------------------------------------------------
create or replace function public.prune_error_logs(keep_days int default 90)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare removed bigint;
begin
  delete from public.error_logs where created_at < now() - make_interval(days => keep_days);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- Same PUBLIC-grant trap as above, and worse here: this function DELETES. Left
-- at the default grant, anyone with the anon key could wipe the whole error log.
revoke all on function public.prune_error_logs(int) from public, anon, authenticated;
grant execute on function public.prune_error_logs(int) to service_role;
