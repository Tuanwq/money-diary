create table if not exists public.money_diary_account_ledgers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  accounts jsonb not null default '[]'::jsonb,
  transactions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.money_diary_account_ledgers enable row level security;

drop policy if exists "Users can read their own account ledger"
  on public.money_diary_account_ledgers;
create policy "Users can read their own account ledger"
  on public.money_diary_account_ledgers
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own account ledger"
  on public.money_diary_account_ledgers;
create policy "Users can create their own account ledger"
  on public.money_diary_account_ledgers
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own account ledger"
  on public.money_diary_account_ledgers;
create policy "Users can update their own account ledger"
  on public.money_diary_account_ledgers
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
