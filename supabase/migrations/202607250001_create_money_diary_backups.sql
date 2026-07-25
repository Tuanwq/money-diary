create table if not exists public.money_diary_backups (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  backup_kind text not null check (
    backup_kind in ('daily', 'weekly', 'monthly', 'manual', 'imported', 'safety')
  ),
  period_key text,
  label text not null,
  summary jsonb not null default '{}'::jsonb,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists money_diary_backups_user_updated_idx
  on public.money_diary_backups (user_id, updated_at desc);

create unique index if not exists money_diary_backups_period_idx
  on public.money_diary_backups (user_id, backup_kind, period_key)
  where period_key is not null;

alter table public.money_diary_backups enable row level security;

drop policy if exists "Users can read their own backups"
  on public.money_diary_backups;
create policy "Users can read their own backups"
  on public.money_diary_backups
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own backups"
  on public.money_diary_backups;
create policy "Users can create their own backups"
  on public.money_diary_backups
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own backups"
  on public.money_diary_backups;
create policy "Users can update their own backups"
  on public.money_diary_backups
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own backups"
  on public.money_diary_backups;
create policy "Users can delete their own backups"
  on public.money_diary_backups
  for delete
  using (auth.uid() = user_id);
