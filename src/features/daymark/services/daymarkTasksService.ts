import { supabase } from "../../../lib/supabase";
import type { DayMarkTask, DayMarkTaskInput } from "../types/daymark";
import { getTaskDurationMinutes, normalizeTaskInput } from "../utils/daymarkUtils";

type DayMarkTaskInsert = Omit<
  DayMarkTask,
  "created_at" | "id" | "updated_at"
>;

function notifyTasksChanged() {
  window.dispatchEvent(new Event("daymark:tasks-changed"));
}

function buildTaskInsert(
  userId: string,
  input: DayMarkTaskInput
): DayMarkTaskInsert {
  const normalized = normalizeTaskInput(input);

  return {
    user_id: userId,
    task_date: normalized.task_date,
    title: normalized.title,
    description: normalized.description || null,
    category: normalized.category,
    start_time: normalized.start_time,
    end_time: normalized.end_time,
    duration_minutes: getTaskDurationMinutes(
      normalized.start_time,
      normalized.end_time
    ),
    actual_focus_seconds: 0,
    priority: normalized.priority,
    status: normalized.status,
    note: normalized.note || null,
  };
}

function buildTaskUpdate(input: Partial<DayMarkTaskInput>) {
  const nextInput = {
    ...input,
    description: input.description?.trim(),
    note: input.note?.trim(),
    title: input.title?.trim(),
  };
  const duration =
    nextInput.start_time && nextInput.end_time
      ? getTaskDurationMinutes(nextInput.start_time, nextInput.end_time)
      : undefined;

  return {
    ...nextInput,
    ...(nextInput.description !== undefined && {
      description: nextInput.description || null,
    }),
    ...(nextInput.note !== undefined && { note: nextInput.note || null }),
    ...(duration !== undefined && { duration_minutes: duration }),
    updated_at: new Date().toISOString(),
  };
}

export async function listDayMarkTasksByDate(userId: string, date: string) {
  const { data, error } = await supabase
    .from("daymark_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("task_date", date)
    .order("start_time", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []) as DayMarkTask[];
}

export async function listDayMarkTasksInRange(
  userId: string,
  fromDate: string,
  toDate: string
) {
  const { data, error } = await supabase
    .from("daymark_tasks")
    .select("*")
    .eq("user_id", userId)
    .gte("task_date", fromDate)
    .lte("task_date", toDate)
    .order("task_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;

  return (data ?? []) as DayMarkTask[];
}

export async function createDayMarkTask(
  userId: string,
  input: DayMarkTaskInput
) {
  const { data, error } = await supabase
    .from("daymark_tasks")
    .insert(buildTaskInsert(userId, input))
    .select("*")
    .single();

  if (error) throw error;

  notifyTasksChanged();
  return data as DayMarkTask;
}

export async function createDayMarkTasks(
  userId: string,
  inputs: DayMarkTaskInput[]
) {
  if (inputs.length === 0) return [];

  const { data, error } = await supabase
    .from("daymark_tasks")
    .insert(inputs.map((input) => buildTaskInsert(userId, input)))
    .select("*");

  if (error) throw error;

  notifyTasksChanged();
  return (data ?? []) as DayMarkTask[];
}

export async function updateDayMarkTask(
  taskId: string,
  input: Partial<DayMarkTaskInput>
) {
  const { data, error } = await supabase
    .from("daymark_tasks")
    .update(buildTaskUpdate(input))
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) throw error;

  notifyTasksChanged();
  return data as DayMarkTask;
}

export async function deleteDayMarkTask(taskId: string) {
  const { error } = await supabase.from("daymark_tasks").delete().eq("id", taskId);

  if (error) throw error;
  notifyTasksChanged();
}
