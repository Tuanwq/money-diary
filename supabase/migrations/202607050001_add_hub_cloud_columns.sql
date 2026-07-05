alter table public.money_diary_state
  add column if not exists hub_entries jsonb not null default '[]'::jsonb,
  add column if not exists hub_settings jsonb not null default '{}'::jsonb,
  add column if not exists hub_change_logs jsonb not null default '[]'::jsonb;
