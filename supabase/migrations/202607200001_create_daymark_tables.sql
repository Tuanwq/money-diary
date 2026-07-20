create or replace function public.set_daymark_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.daymark_daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  title text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

create table if not exists public.daymark_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_date date not null,
  title text not null,
  description text,
  category text not null default 'other'
    check (category in ('work', 'english', 'project', 'exercise', 'sleep', 'personal', 'other')),
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'partial', 'skipped')),
  note text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daymark_daily_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_date date not null,
  summary text not null default '',
  mood text not null default 'normal',
  score integer check (score is null or (score >= 0 and score <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, review_date)
);

create table if not exists public.daymark_user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  default_wake_time time,
  default_sleep_time time,
  weekly_english_target_minutes integer not null default 0 check (weekly_english_target_minutes >= 0),
  weekly_project_target_minutes integer not null default 0 check (weekly_project_target_minutes >= 0),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daymark_user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null,
  title text not null,
  description text not null default '',
  achieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);

create index if not exists daymark_tasks_user_date_idx
  on public.daymark_tasks (user_id, task_date);

create index if not exists daymark_tasks_user_status_idx
  on public.daymark_tasks (user_id, status);

create index if not exists daymark_daily_reviews_user_date_idx
  on public.daymark_daily_reviews (user_id, review_date);

drop trigger if exists set_daymark_daily_plans_updated_at on public.daymark_daily_plans;
create trigger set_daymark_daily_plans_updated_at
before update on public.daymark_daily_plans
for each row execute function public.set_daymark_updated_at();

drop trigger if exists set_daymark_tasks_updated_at on public.daymark_tasks;
create trigger set_daymark_tasks_updated_at
before update on public.daymark_tasks
for each row execute function public.set_daymark_updated_at();

drop trigger if exists set_daymark_daily_reviews_updated_at on public.daymark_daily_reviews;
create trigger set_daymark_daily_reviews_updated_at
before update on public.daymark_daily_reviews
for each row execute function public.set_daymark_updated_at();

drop trigger if exists set_daymark_user_settings_updated_at on public.daymark_user_settings;
create trigger set_daymark_user_settings_updated_at
before update on public.daymark_user_settings
for each row execute function public.set_daymark_updated_at();

drop trigger if exists set_daymark_user_achievements_updated_at on public.daymark_user_achievements;
create trigger set_daymark_user_achievements_updated_at
before update on public.daymark_user_achievements
for each row execute function public.set_daymark_updated_at();

alter table public.daymark_daily_plans enable row level security;
alter table public.daymark_tasks enable row level security;
alter table public.daymark_daily_reviews enable row level security;
alter table public.daymark_user_settings enable row level security;
alter table public.daymark_user_achievements enable row level security;

drop policy if exists "daymark_daily_plans_select_own" on public.daymark_daily_plans;
drop policy if exists "daymark_daily_plans_insert_own" on public.daymark_daily_plans;
drop policy if exists "daymark_daily_plans_update_own" on public.daymark_daily_plans;
drop policy if exists "daymark_daily_plans_delete_own" on public.daymark_daily_plans;

create policy "daymark_daily_plans_select_own"
  on public.daymark_daily_plans for select
  using (auth.uid() = user_id);
create policy "daymark_daily_plans_insert_own"
  on public.daymark_daily_plans for insert
  with check (auth.uid() = user_id);
create policy "daymark_daily_plans_update_own"
  on public.daymark_daily_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "daymark_daily_plans_delete_own"
  on public.daymark_daily_plans for delete
  using (auth.uid() = user_id);

drop policy if exists "daymark_tasks_select_own" on public.daymark_tasks;
drop policy if exists "daymark_tasks_insert_own" on public.daymark_tasks;
drop policy if exists "daymark_tasks_update_own" on public.daymark_tasks;
drop policy if exists "daymark_tasks_delete_own" on public.daymark_tasks;

create policy "daymark_tasks_select_own"
  on public.daymark_tasks for select
  using (auth.uid() = user_id);
create policy "daymark_tasks_insert_own"
  on public.daymark_tasks for insert
  with check (auth.uid() = user_id);
create policy "daymark_tasks_update_own"
  on public.daymark_tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "daymark_tasks_delete_own"
  on public.daymark_tasks for delete
  using (auth.uid() = user_id);

drop policy if exists "daymark_daily_reviews_select_own" on public.daymark_daily_reviews;
drop policy if exists "daymark_daily_reviews_insert_own" on public.daymark_daily_reviews;
drop policy if exists "daymark_daily_reviews_update_own" on public.daymark_daily_reviews;
drop policy if exists "daymark_daily_reviews_delete_own" on public.daymark_daily_reviews;

create policy "daymark_daily_reviews_select_own"
  on public.daymark_daily_reviews for select
  using (auth.uid() = user_id);
create policy "daymark_daily_reviews_insert_own"
  on public.daymark_daily_reviews for insert
  with check (auth.uid() = user_id);
create policy "daymark_daily_reviews_update_own"
  on public.daymark_daily_reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "daymark_daily_reviews_delete_own"
  on public.daymark_daily_reviews for delete
  using (auth.uid() = user_id);

drop policy if exists "daymark_user_settings_select_own" on public.daymark_user_settings;
drop policy if exists "daymark_user_settings_insert_own" on public.daymark_user_settings;
drop policy if exists "daymark_user_settings_update_own" on public.daymark_user_settings;
drop policy if exists "daymark_user_settings_delete_own" on public.daymark_user_settings;

create policy "daymark_user_settings_select_own"
  on public.daymark_user_settings for select
  using (auth.uid() = user_id);
create policy "daymark_user_settings_insert_own"
  on public.daymark_user_settings for insert
  with check (auth.uid() = user_id);
create policy "daymark_user_settings_update_own"
  on public.daymark_user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "daymark_user_settings_delete_own"
  on public.daymark_user_settings for delete
  using (auth.uid() = user_id);

drop policy if exists "daymark_user_achievements_select_own" on public.daymark_user_achievements;
drop policy if exists "daymark_user_achievements_insert_own" on public.daymark_user_achievements;
drop policy if exists "daymark_user_achievements_update_own" on public.daymark_user_achievements;
drop policy if exists "daymark_user_achievements_delete_own" on public.daymark_user_achievements;

create policy "daymark_user_achievements_select_own"
  on public.daymark_user_achievements for select
  using (auth.uid() = user_id);
create policy "daymark_user_achievements_insert_own"
  on public.daymark_user_achievements for insert
  with check (auth.uid() = user_id);
create policy "daymark_user_achievements_update_own"
  on public.daymark_user_achievements for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "daymark_user_achievements_delete_own"
  on public.daymark_user_achievements for delete
  using (auth.uid() = user_id);
