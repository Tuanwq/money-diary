-- Savings rules, outcomes and their linked transfers share one owner-scoped ledger revision.
-- The existing RLS policy on money_diary_account_ledgers also covers these columns.
alter table public.money_diary_account_ledgers
  add column if not exists savings_rules jsonb not null default '[]'::jsonb,
  add column if not exists savings_allocations jsonb not null default '[]'::jsonb;

alter table public.money_diary_account_ledgers
  drop constraint if exists money_diary_account_ledgers_savings_rules_array;
alter table public.money_diary_account_ledgers
  add constraint money_diary_account_ledgers_savings_rules_array
  check (jsonb_typeof(savings_rules) = 'array');

alter table public.money_diary_account_ledgers
  drop constraint if exists money_diary_account_ledgers_savings_allocations_array;
alter table public.money_diary_account_ledgers
  add constraint money_diary_account_ledgers_savings_allocations_array
  check (jsonb_typeof(savings_allocations) = 'array');
