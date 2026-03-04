-- Init Migration for CompliHub360
-- Includes API Contracts Entities, pgvector RAG tables, and Row Level Security setup

create extension if not exists vector;
create extension if not exists "uuid-ossp";

-- 1. Users Table
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'guest' check (role in ('guest', 'registered', 'admin')),
  country_context text,
  consent_flags jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Users
alter table public.users enable row level security;
create policy "Users can read own data" on public.users for select using (auth.uid() = id);
create policy "Users can update own data" on public.users for update using (auth.uid() = id);

-- 2. Providers Table
create table public.providers (
  provider_key text primary key,
  name text not null,
  website_url text,
  partner_status text not null default 'inactive' check (partner_status in ('active', 'inactive', 'downgraded')),
  countries_supported text[],
  languages text[],
  categories text[],
  sla_target_confirm_hours integer default 24,
  sla_target_reply_hours integer default 48,
  breach_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Providers
alter table public.providers enable row level security;
create policy "Providers are globally readable" on public.providers for select using (true);
create policy "Only Admins can update providers" on public.providers for update using (auth.jwt()->>'role' = 'admin');

-- 3. Engagement Requests Table
create table public.engagement_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id),
  provider_key text references public.providers(provider_key),
  country text not null,
  category text not null,
  structured_answers jsonb not null,
  message text,
  status text not null default 'created' check (status in ('created', 'delivered', 'confirmed', 'replied', 'declined', 'expired')),
  sla_confirm_deadline timestamp with time zone,
  sla_reply_deadline timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_engagement_requests_provider on public.engagement_requests(provider_key, status);

-- Enable RLS for Engagement Requests
alter table public.engagement_requests enable row level security;
create policy "Users can read own requests" on public.engagement_requests for select using (auth.uid() = user_id);
create policy "Users can embed own requests" on public.engagement_requests for insert with check (auth.uid() = user_id);

-- 4. Event Log Table
create table public.event_log (
  id uuid primary key default uuid_generate_v4(),
  type text not null,
  actor_id uuid,
  payload jsonb,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_event_log_type on public.event_log(type);

alter table public.event_log enable row level security;
create policy "Event log is append only for users" on public.event_log for insert with check (auth.uid() = actor_id);

-- 5. Knowledge Chunks Table (RAG Vector Database)
create table public.knowledge_chunks (
  id uuid primary key default uuid_generate_v4(),
  content text not null,
  metadata jsonb not null,
  embedding vector(768),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index on public.knowledge_chunks using hnsw (embedding vector_cosine_ops);

alter table public.knowledge_chunks enable row level security;
create policy "Knowledge Chunks are globally readable" on public.knowledge_chunks for select using (true);
