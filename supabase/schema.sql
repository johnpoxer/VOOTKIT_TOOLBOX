-- Vootkit — Supabase schema (run once in the SQL editor of project qfqdmzwmjxdiqzeybaoo)
-- Creates profiles, favorites and history, all protected by Row-Level Security so
-- every user can only ever read/write their own rows. The browser uses the public
-- anon key; these policies are what actually keep data private.

-- ---------- profiles ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  plan         text not null default 'free' check (plan in ('free', 'creator_pro')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text not null default 'inactive',
  subscription_updated_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (
  auth.uid() = id and plan = 'free' and stripe_customer_id is null and stripe_subscription_id is null
);
-- Billing fields are server-controlled. Profile updates happen through Auth
-- metadata so browser clients cannot grant themselves a paid plan.

-- auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- favorites ----------
create table if not exists public.favorites (
  user_id    uuid not null references auth.users(id) on delete cascade,
  tool_id    text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tool_id)
);

alter table public.favorites enable row level security;
create policy "own favorites" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- history (cloud, one row per tool, freshest used_at) ----------
create table if not exists public.history (
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_id text not null,
  used_at timestamptz not null default now(),
  primary key (user_id, tool_id)
);

alter table public.history enable row level security;
create policy "own history" on public.history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- After running this: Auth → URL Configuration → add redirect URLs:
--   https://www.vootkit.com/auth/callback/
--   https://www.vootkit.com/auth/update-password/
-- and set Site URL to https://www.vootkit.com
