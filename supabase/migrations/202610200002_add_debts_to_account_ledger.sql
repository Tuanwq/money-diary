-- Debt and its linked cash transactions share the existing per-user ledger revision.
-- Existing availability annotations in accounts JSONB are intentionally untouched.
alter table public.money_diary_account_ledgers
  add column if not exists debts jsonb not null default '[]'::jsonb;

alter table public.money_diary_account_ledgers
  drop constraint if exists money_diary_account_ledgers_debts_array;
alter table public.money_diary_account_ledgers
  add constraint money_diary_account_ledgers_debts_array
  check (jsonb_typeof(debts) = 'array');
