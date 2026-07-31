alter table public.money_diary_state
  add column if not exists sync_revision bigint not null default 0;

create table if not exists public.money_diary_sync_receipts (
  operation_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  applied_at timestamptz not null default now()
);

alter table public.money_diary_sync_receipts enable row level security;

drop policy if exists "Users can read their own sync receipts"
  on public.money_diary_sync_receipts;
create policy "Users can read their own sync receipts"
  on public.money_diary_sync_receipts
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own sync receipts"
  on public.money_diary_sync_receipts;
create policy "Users can create their own sync receipts"
  on public.money_diary_sync_receipts
  for insert
  with check (auth.uid() = user_id);

create or replace function public.sync_money_diary_state(
  p_operation_id text,
  p_expected_revision bigint,
  p_entries jsonb,
  p_goals jsonb,
  p_completed_goals jsonb,
  p_expenses jsonb,
  p_balance_checks jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_state public.money_diary_state%rowtype;
  current_user_id uuid := auth.uid();
  inserted_count integer := 0;
  state_found boolean := false;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into current_state
  from public.money_diary_state
  where user_id = current_user_id
  for update;
  state_found := found;

  if exists (
    select 1
    from public.money_diary_sync_receipts
    where operation_id = p_operation_id
      and user_id = current_user_id
  ) then
    return jsonb_build_object(
      'status', 'duplicate',
      'revision', coalesce(current_state.sync_revision, 0),
      'entries', coalesce(current_state.entries, '[]'::jsonb),
      'goals', coalesce(current_state.goals, '{}'::jsonb),
      'completed_goals', coalesce(current_state.completed_goals, '[]'::jsonb),
      'expenses', coalesce(current_state.expenses, '[]'::jsonb),
      'balance_checks', coalesce(current_state.balance_checks, '[]'::jsonb)
    );
  end if;

  if not state_found then
    insert into public.money_diary_state (
      user_id,
      entries,
      goals,
      completed_goals,
      expenses,
      balance_checks,
      sync_revision,
      updated_at
    ) values (
      current_user_id,
      p_entries,
      p_goals,
      p_completed_goals,
      p_expenses,
      p_balance_checks,
      1,
      now()
    )
    on conflict (user_id) do nothing;

    get diagnostics inserted_count = row_count;

    if inserted_count = 1 then
      insert into public.money_diary_sync_receipts (operation_id, user_id)
      values (p_operation_id, current_user_id);

      return jsonb_build_object(
        'status', 'applied',
        'revision', 1,
        'entries', p_entries,
        'goals', p_goals,
        'completed_goals', p_completed_goals,
        'expenses', p_expenses,
        'balance_checks', p_balance_checks
      );
    end if;

    select * into current_state
    from public.money_diary_state
    where user_id = current_user_id
    for update;
  end if;

  if current_state.sync_revision <> p_expected_revision then
    return jsonb_build_object(
      'status', 'conflict',
      'revision', current_state.sync_revision,
      'entries', coalesce(current_state.entries, '[]'::jsonb),
      'goals', coalesce(current_state.goals, '{}'::jsonb),
      'completed_goals', coalesce(current_state.completed_goals, '[]'::jsonb),
      'expenses', coalesce(current_state.expenses, '[]'::jsonb),
      'balance_checks', coalesce(current_state.balance_checks, '[]'::jsonb)
    );
  end if;

  update public.money_diary_state
  set entries = p_entries,
      goals = p_goals,
      completed_goals = p_completed_goals,
      expenses = p_expenses,
      balance_checks = p_balance_checks,
      sync_revision = current_state.sync_revision + 1,
      updated_at = now()
  where user_id = current_user_id;

  insert into public.money_diary_sync_receipts (operation_id, user_id)
  values (p_operation_id, current_user_id);

  return jsonb_build_object(
    'status', 'applied',
    'revision', current_state.sync_revision + 1,
    'entries', p_entries,
    'goals', p_goals,
    'completed_goals', p_completed_goals,
    'expenses', p_expenses,
    'balance_checks', p_balance_checks
  );
end;
$$;

grant execute on function public.sync_money_diary_state(
  text,
  bigint,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb
) to authenticated;
