alter table public.daymark_tasks
  add column if not exists actual_focus_seconds integer not null default 0
  check (actual_focus_seconds >= 0);

create table if not exists public.daymark_pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.daymark_tasks(id) on delete set null,
  task_date date not null,
  mode text not null default 'focus'
    check (mode in ('focus', 'short_break', 'long_break')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daymark_pomodoro_sessions_user_date_idx
  on public.daymark_pomodoro_sessions (user_id, task_date);

create index if not exists daymark_pomodoro_sessions_task_idx
  on public.daymark_pomodoro_sessions (task_id);

drop trigger if exists set_daymark_pomodoro_sessions_updated_at
  on public.daymark_pomodoro_sessions;
create trigger set_daymark_pomodoro_sessions_updated_at
before update on public.daymark_pomodoro_sessions
for each row execute function public.set_daymark_updated_at();

alter table public.daymark_pomodoro_sessions enable row level security;

drop policy if exists "daymark_pomodoro_sessions_select_own"
  on public.daymark_pomodoro_sessions;
drop policy if exists "daymark_pomodoro_sessions_insert_own"
  on public.daymark_pomodoro_sessions;
drop policy if exists "daymark_pomodoro_sessions_update_own"
  on public.daymark_pomodoro_sessions;
drop policy if exists "daymark_pomodoro_sessions_delete_own"
  on public.daymark_pomodoro_sessions;

create policy "daymark_pomodoro_sessions_select_own"
  on public.daymark_pomodoro_sessions for select
  using (auth.uid() = user_id);
create policy "daymark_pomodoro_sessions_insert_own"
  on public.daymark_pomodoro_sessions for insert
  with check (auth.uid() = user_id);
create policy "daymark_pomodoro_sessions_update_own"
  on public.daymark_pomodoro_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "daymark_pomodoro_sessions_delete_own"
  on public.daymark_pomodoro_sessions for delete
  using (auth.uid() = user_id);
