-- Chatbot plan phase ③: assistant subscription entitlements (12 $/month).
-- user_key = Supabase auth user id (JWT sub) or lowercased email fallback.
-- Service-role only (RLS enabled, no public policies) — the FE learns its
-- status through the compliance-api, never by reading this table directly.
create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_key text not null unique,
  email text,
  plan text not null default 'assistant_pro',
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',  -- active | trialing | past_due | canceled | inactive
  current_period_end timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_subscriptions enable row level security;

create index if not exists idx_user_subscriptions_user_key
  on public.user_subscriptions (user_key);
