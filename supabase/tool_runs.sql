-- Vootkit — the tool run log.
-- Run this in the Supabase SQL editor (project qfqdmzwmjxdiqzeybaoo).
--
-- WHY THIS FILE EXISTS AT ALL
-- assets/js/deliver.js has been writing to public.tool_runs since the download
-- chokepoint was built, and this table was never captured as a migration.
-- Either it was created by hand in the dashboard, or every one of those writes
-- has been failing silently — deliver.js swallows the error deliberately, on
-- the grounds that a missed analytics row is not the user's problem. That is
-- the right call for the user and it is exactly why the failure could hide.
--
-- Run this either way. `if not exists` makes it safe against a table that is
-- already there, and the policies below are the ones the client needs.
--
-- WHAT THIS TABLE IS FOR
-- One question: does a signed-in person come back? That needs a user, a tool
-- and a timestamp, and is answered by nothing else. It is not an event stream
-- and it must not become one.
--
-- PRIVACY — READ BEFORE ADDING A COLUMN
-- Vootkit's promise is that files never leave the device. This table records
-- THAT a tool produced a result, never anything about what went through it.
-- It must NEVER receive: file names, file sizes, file contents, tool options,
-- page URLs, or anything a user typed. If you are about to add a column, ask
-- what a user could have put in it. The same rule governs error_logs.sql.

create table if not exists public.tool_runs (
  id         bigint      generated always as identity primary key,
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  tool_id    text        not null,
  created_at timestamptz not null default now(),

  -- A cap rather than a foreign key to the catalogue: tool ids live in
  -- data/catalog.js, not in the database, and a run should still record
  -- against a tool that is later renamed or retired.
  constraint tool_runs_tool_len check (char_length(tool_id) between 1 and 64)
);

-- The only query this table serves: "what has this person run, most recent
-- first". Composite, because filtering by user and ordering by time is one
-- access pattern rather than two.
create index if not exists tool_runs_user_created_idx
  on public.tool_runs (user_id, created_at desc);

alter table public.tool_runs enable row level security;

-- ACCESS MODEL
-- user_id defaults to auth.uid() and the insert policy pins it there, so a
-- client cannot log a run against somebody else's account even by sending an
-- explicit user_id. Reads are self-only. There is no update or delete policy
-- at all: a run log that can be edited is not a log.
drop policy if exists "own runs are insertable" on public.tool_runs;
create policy "own runs are insertable"
  on public.tool_runs for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "own runs are readable" on public.tool_runs;
create policy "own runs are readable"
  on public.tool_runs for select
  to authenticated
  using (user_id = auth.uid());

-- Anon has no policy of any kind, which under RLS means no access. Signed-out
-- runs are simply not logged — deliver.js checks for a user before writing.

-- VERIFY, rather than assume:
--   set local role authenticated;
--   insert into public.tool_runs (tool_id) values ('merge-pdf');   -- should work
--   set local role anon;
--   insert into public.tool_runs (tool_id) values ('merge-pdf');   -- must be denied
--   select * from public.tool_runs;                                -- must return nothing
