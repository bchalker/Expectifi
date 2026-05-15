-- Retirement calculator app schema
-- Auth users are provided by Supabase (auth.users).

create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  inputs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists scenarios_user_id_created_at_idx
  on public.scenarios (user_id, created_at desc);

create table if not exists public.sync_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  access_token text not null,
  last_synced timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists sync_tokens_user_id_idx
  on public.sync_tokens (user_id);

alter table public.scenarios enable row level security;
alter table public.sync_tokens enable row level security;

create policy "Users can read own scenarios"
  on public.scenarios for select
  using (auth.uid() = user_id);

create policy "Users can insert own scenarios"
  on public.scenarios for insert
  with check (auth.uid() = user_id);

create policy "Users can update own scenarios"
  on public.scenarios for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own scenarios"
  on public.scenarios for delete
  using (auth.uid() = user_id);

create policy "Users can read own sync_tokens"
  on public.sync_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert own sync_tokens"
  on public.sync_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sync_tokens"
  on public.sync_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own sync_tokens"
  on public.sync_tokens for delete
  using (auth.uid() = user_id);
