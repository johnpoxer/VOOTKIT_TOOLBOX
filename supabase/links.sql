-- Vootkit URL shortener storage.
-- Run this in the Supabase SQL editor (project qfqdmzwmjxdiqzeybaoo).
-- The Netlify functions talk to this table with the SERVICE ROLE key, which
-- bypasses RLS — so we lock the table down to anon/public entirely.

create table if not exists public.links (
  id          bigint generated always as identity primary key,
  code        text unique not null,
  url         text not null,
  created_at  timestamptz not null default now(),
  clicks      integer not null default 0,
  owner       uuid references auth.users(id) on delete set null
);

create index if not exists links_code_idx on public.links (code);

alter table public.links enable row level security;
-- No policies for anon/authenticated: all access goes through the service-role
-- Netlify functions. (Service role bypasses RLS.)

-- Atomic click increment (avoids a read-then-write race on redirects).
create or replace function public.increment_link_clicks(link_code text)
returns void
language sql
as $$
  update public.links set clicks = clicks + 1 where code = link_code;
$$;
