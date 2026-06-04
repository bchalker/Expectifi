-- Per-user portfolio accounts (manual, CSV, Plaid) with optional allocation profile on manual rows.

create table if not exists public.accounts (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  account_type text not null,
  balance bigint not null default 0,
  source text not null default 'manual'
    check (source in ('manual', 'csv', 'plaid')),
  allocation_profile text
    check (
      allocation_profile is null
      or allocation_profile in ('aggressive', 'moderate', 'conservative')
    ),
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts (user_id);

alter table public.accounts enable row level security;

create policy "Users can read own accounts"
  on public.accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert own accounts"
  on public.accounts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own accounts"
  on public.accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own accounts"
  on public.accounts for delete
  using (auth.uid() = user_id);
