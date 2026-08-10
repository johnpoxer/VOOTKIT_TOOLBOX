-- Vootkit — the newsletter list.
-- Run this in the Supabase SQL editor (project qfqdmzwmjxdiqzeybaoo).
--
-- WHY THIS FILE EXISTS AT ALL
-- assets/js/newsletter.js has been inserting into public.subscribers since the
-- capture form was built, and this table was never captured as a migration.
-- Either it was created by hand in the dashboard, or every signup has been
-- failing — and unlike the run log, this one is NOT invisible: messageFor()
-- would have shown "that did not work" to anybody who tried. Run this either
-- way; `if not exists` makes it safe against a table that already exists.
--
-- THE THREE THINGS THAT MAKE A LIST LAWFULLY MAILABLE
--   consented_at      — WHEN they agreed. The form's checkbox is required and
--                       never pre-ticked; this is the record of it.
--   source            — WHERE they agreed, so a complaint can be traced to the
--                       exact placement rather than argued about.
--   unsubscribe_token — generated here, so opting out never needs a login.
-- Losing any one of them turns a list into a liability.

create extension if not exists pgcrypto;

create table if not exists public.subscribers (
  id                bigint      generated always as identity primary key,
  email             text        not null,
  source            text        not null default 'unknown',
  consented_at      timestamptz not null default now(),
  unsubscribed_at   timestamptz,
  unsubscribe_token uuid        not null default gen_random_uuid(),
  created_at        timestamptz not null default now(),

  constraint subscribers_email_len  check (char_length(email)  between 6 and 254),
  constraint subscribers_source_len check (char_length(source) between 1 and 40),
  -- Cheap shape check. The real validation is validEmail() in newsletter.js,
  -- which has 25 assertions behind it; this only stops obvious junk reaching
  -- the table if the client is ever bypassed.
  constraint subscribers_email_shape check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

-- Case-insensitive uniqueness. Somebody signing up twice is a SUCCESS, not an
-- error — newsletter.js treats postgres 23505 as "you are already on the
-- list", and test/newsletter.test.js pins that so a returning subscriber is
-- never told their signup failed.
create unique index if not exists subscribers_email_lower_key
  on public.subscribers (lower(email));

create unique index if not exists subscribers_token_key
  on public.subscribers (unsubscribe_token);

alter table public.subscribers enable row level security;

-- ACCESS MODEL
-- The browser writes with the PUBLIC ANON key, so anon must INSERT. Nothing
-- else. Anon must never SELECT: an open read policy on this table hands every
-- subscriber's email address to anybody who opens devtools. Sending happens
-- from a Netlify function with the service role key, which bypasses RLS.
drop policy if exists "anyone may subscribe" on public.subscribers;
create policy "anyone may subscribe"
  on public.subscribers for insert
  to anon, authenticated
  with check (true);

-- No select, update or delete policy is defined, which under RLS means none of
-- them are permitted. Unsubscribing goes through the function below instead.

-- UNSUBSCRIBING WITHOUT A LOGIN
-- SECURITY DEFINER so it can update a table the caller cannot touch, and it
-- accepts ONLY the token: no token, no effect, and no way to enumerate the
-- list or to unsubscribe somebody else by guessing their address. The token is
-- a v4 uuid, which is not guessable at any useful rate.
--
-- It returns true for an already-unsubscribed token as well, deliberately: a
-- second click on the same link should say "you are unsubscribed", not "that
-- link is invalid".
create or replace function public.unsubscribe_by_token(token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  hit boolean;
begin
  update public.subscribers
     set unsubscribed_at = coalesce(unsubscribed_at, now())
   where unsubscribe_token = token
  returning true into hit;
  return coalesce(hit, false);
end;
$$;

revoke all on function public.unsubscribe_by_token(uuid) from public;
grant execute on function public.unsubscribe_by_token(uuid) to anon, authenticated;

-- VERIFY, rather than assume:
--   set local role anon;
--   insert into public.subscribers (email, source) values ('a@b.co', 'footer');  -- works
--   insert into public.subscribers (email, source) values ('A@B.CO', 'footer');  -- 23505
--   select * from public.subscribers;                                            -- must be empty
--   select public.unsubscribe_by_token('<the token>');                           -- true
--   select public.unsubscribe_by_token(gen_random_uuid());                       -- false
