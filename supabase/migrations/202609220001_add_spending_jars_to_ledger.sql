-- Jars and their allocations live in the same per-user ledger row as real
-- account transactions. One upsert commits a complete aggregate; older rows
-- receive empty defaults and legacy budget data remains in Goals for recovery.
alter table public.money_diary_account_ledgers
  add column if not exists jars jsonb not null default '[]'::jsonb;

alter table public.money_diary_account_ledgers
  add column if not exists jar_activities jsonb not null default '[]'::jsonb;
