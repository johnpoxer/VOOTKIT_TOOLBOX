# Newsletter — how it works and what must stay true

## Why this exists

Every visitor Vootkit has ever had arrived from Google and left as a stranger.
That makes the whole business a tenant of one algorithm: a ranking change
removes the audience overnight, and there is no way to reach a single person who
liked the site. The email list is the only channel Vootkit owns.

## The pieces

| Piece | File |
|---|---|
| Capture form, validation, unsubscribe | `assets/js/newsletter.js` |
| Styling (three placements, one component) | `assets/css/pages.css` → `.nl` |
| Footer slot, blog slot, unsubscribe page | `build.js` |
| Tool-success slot (created at runtime) | `assets/js/convert.js` |
| Tests | `test/newsletter.test.js` |

## Placements

| Source value | Where | When |
|---|---|---|
| `footer` | Site-wide footer | Always, unless an earned slot is on the page |
| `blog` | End of every blog post | Always |
| `tool_success` | Inside the tool workspace | Only after a run succeeds |

Two rules are enforced in code, not by convention:

1. **Never two forms on one screen.** `newsletter.js` hides the footer slot
   whenever a `blog` or `tool_success` slot is present. Two identical forms read
   as a bug and split the attention one of them needed.
2. **The account prompt wins.** On a tool page, `convert.js` only appends the
   newsletter slot when `shouldPrompt()` has already decided *not* to show the
   "create a free account" card. An account is worth more than an address
   (history, favourites, a route to Pro), so it gets first refusal; the lighter
   ask picks up everyone it passes over.

## The database

Applied to project `qfqdmzwmjxdiqzeybaoo` as migration `newsletter_subscribers`.
Reproduced here so the schema is readable without opening the dashboard.

```sql
create table if not exists public.subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  source            text not null default 'unknown',
  consented_at      timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  unsubscribed_at   timestamptz,
  unsubscribe_token uuid not null default gen_random_uuid(),
  constraint subscribers_email_shape check (
    length(email) between 6 and 254 and email like '%@%.%' and email !~ '\s'
  ),
  constraint subscribers_source_len check (length(source) <= 40)
);

create unique index if not exists subscribers_email_lower_key
  on public.subscribers (lower(email));
create unique index if not exists subscribers_token_key
  on public.subscribers (unsubscribe_token);

alter table public.subscribers enable row level security;

create policy subscribers_anon_insert on public.subscribers
  for insert to anon, authenticated
  with check (unsubscribed_at is null);

create or replace function public.unsubscribe_by_token(token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare hit int;
begin
  update public.subscribers
     set unsubscribed_at = now()
   where unsubscribe_token = token and unsubscribed_at is null;
  get diagnostics hit = row_count;
  return hit > 0;
end;
$$;

revoke all on function public.unsubscribe_by_token(uuid) from public;
grant execute on function public.unsubscribe_by_token(uuid) to anon, authenticated;
```

### The one thing that must never change

**There is an INSERT policy and nothing else.** No SELECT policy means the
subscriber list cannot be read with the publishable key — which is in the page
source of every page on the site. Add a permissive SELECT policy and you have
published the list to anyone who opens the console. No UPDATE or DELETE policy
means a row cannot be altered from the browser.

This was verified, not assumed:

```
set local role anon;
insert into public.subscribers (email, source) values ('rls.probe@example.com','test');  -- succeeded
select count(*) from public.subscribers;                                                 -- returned 0
```

The unsubscribe function is `SECURITY DEFINER` precisely because anon cannot
touch the row directly. It accepts a token and nothing else, so it cannot be
used to enumerate the list, and it returns `false` on a second call for the same
token rather than doing the work twice.

Supabase's linter flags `unsubscribe_by_token` as anon-executable. That is
intentional and is the point of the function: an unsubscribe link that demands a
password is the fastest route to a spam complaint, and spam complaints are what
destroy a sending domain.

## Consent

Every row carries `consented_at` (when they agreed, not when the row was
written) and `source` (so a complaint can be traced to a placement). The
checkbox is **unticked by default** and submission is blocked without it —
pre-ticked consent is invalid under GDPR and is the single most common reason a
list becomes unmailable. `test/newsletter.test.js` asserts both.

## Unsubscribe

`/unsubscribe/?t=<uuid>` — noindex, no signup form on it. The token is validated
against a UUID shape in the browser before it is allowed near the database; it
is the only value on the site that travels from a URL into a database call.

Put this URL in the footer of every email you send. Substitute the row's
`unsubscribe_token`:

```
https://vootkit.com/unsubscribe/?t={{unsubscribe_token}}
```

## Known limits — read before the list gets big

- **No double opt-in yet.** A single opt-in with a logged consent timestamp is
  lawful in the UK/EU, but double opt-in produces a cleaner list and better
  deliverability. Worth adding before the first real send.
- **No rate limiting on the insert.** The anon endpoint can be hit repeatedly.
  The unique index stops duplicates, and the check constraints stop junk, but
  someone determined could fill the table with distinct valid-shaped addresses.
  If that ever happens, move the insert behind an edge function with a per-IP
  limit — the client code already isolates the write in `subscribe()`.
- **No sending yet.** Nothing here sends email. Export with
  `select email from public.subscribers where unsubscribed_at is null` and load
  into whichever ESP you pick. Whatever you choose must honour
  `unsubscribed_at`, and the unsubscribe link above must be in every send.

## Exporting the list

```sql
select email, source, consented_at
  from public.subscribers
 where unsubscribed_at is null
 order by created_at;
```

Signup counts per placement — the reason `source` is stored at all, so the value
of each placement is measured rather than argued about:

```sql
select source, count(*) filter (where unsubscribed_at is null) as active,
       count(*) as total
  from public.subscribers group by source order by total desc;
```
