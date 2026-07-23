create or replace function public.set_notification_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_identifier text not null
    check (app_identifier in ('daymark', 'money_diary')),
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_label text,
  is_active boolean not null default true,
  failure_count integer not null default 0 check (failure_count >= 0),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint, app_identifier)
);

create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_identifier text not null
    check (app_identifier in ('daymark', 'money_diary')),
  notification_type text not null,
  dedupe_key text not null,
  scheduled_for timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, app_identifier, dedupe_key)
);

create table if not exists public.money_diary_notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,

  daily_entry_enabled boolean not null default true,
  daily_entry_time time not null default '21:00',

  expense_reminder_enabled boolean not null default true,
  expense_reminder_time time not null default '20:30',

  daily_income_target_enabled boolean not null default true,
  daily_income_check_time time not null default '19:00',

  goal_progress_warning_enabled boolean not null default true,
  goal_deadline_warning_enabled boolean not null default true,
  goal_deadline_days integer[] not null default array[30,14,7,3,1],

  daily_summary_enabled boolean not null default true,
  daily_summary_time time not null default '22:00',

  weekly_summary_enabled boolean not null default true,
  weekly_summary_day integer not null default 0
    check (weekly_summary_day between 0 and 6),
  weekly_summary_time time not null default '20:00',

  monthly_summary_enabled boolean not null default true,
  monthly_summary_time time not null default '20:30',

  balance_warning_enabled boolean not null default true,
  balance_warning_threshold numeric not null default 100000
    check (balance_warning_threshold >= 0),

  sync_warning_enabled boolean not null default true,
  backup_reminder_enabled boolean not null default true,

  sound_enabled boolean not null default true,
  vibration_enabled boolean not null default true,

  timezone text not null default 'Asia/Ho_Chi_Minh',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daymark_notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_plan_enabled boolean not null default true,
  daily_plan_time time not null default '07:00',
  task_reminder_enabled boolean not null default true,
  task_reminder_minutes integer not null default 10
    check (task_reminder_minutes between 0 and 1440),
  pomodoro_completed_enabled boolean not null default true,
  sound_enabled boolean not null default true,
  vibration_enabled boolean not null default true,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_app_active_idx
  on public.push_subscriptions (user_id, app_identifier, is_active);

create index if not exists notification_jobs_due_idx
  on public.notification_jobs (status, scheduled_for);

create index if not exists notification_jobs_user_app_idx
  on public.notification_jobs (user_id, app_identifier);

drop trigger if exists set_push_subscriptions_updated_at
  on public.push_subscriptions;
create trigger set_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute function public.set_notification_updated_at();

drop trigger if exists set_notification_jobs_updated_at
  on public.notification_jobs;
create trigger set_notification_jobs_updated_at
before update on public.notification_jobs
for each row execute function public.set_notification_updated_at();

drop trigger if exists set_money_diary_notification_settings_updated_at
  on public.money_diary_notification_settings;
create trigger set_money_diary_notification_settings_updated_at
before update on public.money_diary_notification_settings
for each row execute function public.set_notification_updated_at();

drop trigger if exists set_daymark_notification_settings_updated_at
  on public.daymark_notification_settings;
create trigger set_daymark_notification_settings_updated_at
before update on public.daymark_notification_settings
for each row execute function public.set_notification_updated_at();

alter table public.push_subscriptions enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.money_diary_notification_settings enable row level security;
alter table public.daymark_notification_settings enable row level security;

drop policy if exists "push_subscriptions_select_own"
  on public.push_subscriptions;
drop policy if exists "push_subscriptions_insert_own"
  on public.push_subscriptions;
drop policy if exists "push_subscriptions_update_own"
  on public.push_subscriptions;
drop policy if exists "push_subscriptions_delete_own"
  on public.push_subscriptions;

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

drop policy if exists "notification_jobs_select_own"
  on public.notification_jobs;
drop policy if exists "notification_jobs_insert_own"
  on public.notification_jobs;
drop policy if exists "notification_jobs_update_own"
  on public.notification_jobs;
drop policy if exists "notification_jobs_delete_own"
  on public.notification_jobs;

create policy "notification_jobs_select_own"
  on public.notification_jobs for select
  using (auth.uid() = user_id);
create policy "notification_jobs_insert_own"
  on public.notification_jobs for insert
  with check (auth.uid() = user_id);
create policy "notification_jobs_update_own"
  on public.notification_jobs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "notification_jobs_delete_own"
  on public.notification_jobs for delete
  using (auth.uid() = user_id);

drop policy if exists "money_notification_settings_select_own"
  on public.money_diary_notification_settings;
drop policy if exists "money_notification_settings_insert_own"
  on public.money_diary_notification_settings;
drop policy if exists "money_notification_settings_update_own"
  on public.money_diary_notification_settings;
drop policy if exists "money_notification_settings_delete_own"
  on public.money_diary_notification_settings;

create policy "money_notification_settings_select_own"
  on public.money_diary_notification_settings for select
  using (auth.uid() = user_id);
create policy "money_notification_settings_insert_own"
  on public.money_diary_notification_settings for insert
  with check (auth.uid() = user_id);
create policy "money_notification_settings_update_own"
  on public.money_diary_notification_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "money_notification_settings_delete_own"
  on public.money_diary_notification_settings for delete
  using (auth.uid() = user_id);

drop policy if exists "daymark_notification_settings_select_own"
  on public.daymark_notification_settings;
drop policy if exists "daymark_notification_settings_insert_own"
  on public.daymark_notification_settings;
drop policy if exists "daymark_notification_settings_update_own"
  on public.daymark_notification_settings;
drop policy if exists "daymark_notification_settings_delete_own"
  on public.daymark_notification_settings;

create policy "daymark_notification_settings_select_own"
  on public.daymark_notification_settings for select
  using (auth.uid() = user_id);
create policy "daymark_notification_settings_insert_own"
  on public.daymark_notification_settings for insert
  with check (auth.uid() = user_id);
create policy "daymark_notification_settings_update_own"
  on public.daymark_notification_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "daymark_notification_settings_delete_own"
  on public.daymark_notification_settings for delete
  using (auth.uid() = user_id);

