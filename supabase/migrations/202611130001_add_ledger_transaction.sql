create or replace function public.add_ledger_transaction(
  p_user_id uuid,
  p_expected_updated_at timestamptz,
  p_transaction jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ledger_revision timestamptz;
  ledger_transactions jsonb;
  transaction_id text := p_transaction->>'id';
  receipt_id text := 'account-ledger:add:' || p_user_id::text || ':' || transaction_id;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'Account ledger owner required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_transaction) is distinct from 'object'
    or nullif(btrim(transaction_id), '') is null
    or coalesce(p_transaction->>'type', '') not in ('income', 'expense', 'transfer')
    or jsonb_typeof(p_transaction->'amount') is distinct from 'number'
    or (p_transaction->>'amount')::numeric <= 0
    or nullif(p_transaction->>'accountId', '') is null then
    raise exception 'Invalid account transaction' using errcode = '22023';
  end if;

  select updated_at, transactions into ledger_revision, ledger_transactions
  from public.money_diary_account_ledgers
  where user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'missing');
  end if;

  if exists (
    select 1 from public.money_diary_sync_receipts
    where operation_id = receipt_id and user_id = p_user_id
  ) then
    return jsonb_build_object('status', 'duplicate', 'updated_at', ledger_revision);
  end if;

  if exists (
    select 1 from jsonb_array_elements(ledger_transactions) as entry(value)
    where entry.value->>'id' = transaction_id
  ) then
    if not exists (
      select 1 from jsonb_array_elements(ledger_transactions) as entry(value)
      where entry.value = p_transaction
    ) then
      return jsonb_build_object('status', 'id_conflict');
    end if;
    insert into public.money_diary_sync_receipts (operation_id, user_id)
    values (receipt_id, p_user_id);
    return jsonb_build_object('status', 'duplicate', 'updated_at', ledger_revision);
  end if;

  if ledger_revision is distinct from p_expected_updated_at then
    return jsonb_build_object('status', 'conflict');
  end if;

  update public.money_diary_account_ledgers
  set transactions = jsonb_build_array(p_transaction) || ledger_transactions,
      updated_at = greatest(clock_timestamp(), ledger_revision + interval '1 millisecond')
  where user_id = p_user_id
  returning updated_at into ledger_revision;

  insert into public.money_diary_sync_receipts (operation_id, user_id)
  values (receipt_id, p_user_id);

  return jsonb_build_object('status', 'applied', 'updated_at', ledger_revision);
end;
$$;

grant select, insert on public.money_diary_sync_receipts to authenticated;
revoke execute on function public.add_ledger_transaction(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.add_ledger_transaction(uuid, timestamptz, jsonb) to authenticated;
