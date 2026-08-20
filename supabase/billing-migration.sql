-- Run once in the Supabase SQL editor before enabling Stripe webhooks.
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists subscription_status text not null default 'inactive';
alter table public.profiles add column if not exists subscription_updated_at timestamptz;

create unique index if not exists profiles_stripe_customer_id_key on public.profiles (stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists profiles_stripe_subscription_id_key on public.profiles (stripe_subscription_id) where stripe_subscription_id is not null;

drop policy if exists "own profile update" on public.profiles;
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert with check (
  auth.uid() = id and plan = 'free' and stripe_customer_id is null and stripe_subscription_id is null
);
