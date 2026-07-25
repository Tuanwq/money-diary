create table if not exists public.money_diary_automation_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rules jsonb not null default '[]'::jsonb,
  logs jsonb not null default '[]'::jsonb,
  processed_keys jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.money_diary_automation_states enable row level security;

drop policy if exists "Users can read their own automation state"
  on public.money_diary_automation_states;
create policy "Users can read their own automation state"
  on public.money_diary_automation_states
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own automation state"
  on public.money_diary_automation_states;
create policy "Users can create their own automation state"
  on public.money_diary_automation_states
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own automation state"
  on public.money_diary_automation_states;
create policy "Users can update their own automation state"
  on public.money_diary_automation_states
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
