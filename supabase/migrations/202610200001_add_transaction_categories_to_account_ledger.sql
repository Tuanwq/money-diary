-- Labels share the existing per-user ledger revision so renames and transaction
-- references are committed atomically. Existing ledgers keep every transaction.
alter table public.money_diary_account_ledgers
  add column if not exists categories jsonb not null default '[]'::jsonb;

-- The table already has user_id = auth.uid() SELECT/INSERT/UPDATE RLS policies.
