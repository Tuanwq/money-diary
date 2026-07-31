import { supabase } from "../../../lib/supabase";
import { isCloudDataSyncEnabled } from "../../../config/moneyCloudSync";
import { safeSetStorageJson } from "../../../utils/safeStorage";
import type { DayMarkTask, DayMarkTaskInput } from "../types/daymark";
import { getTaskDurationMinutes, normalizeTaskInput } from "../utils/daymarkUtils";

type DayMarkTaskInsert = Omit<
  DayMarkTask,
  "created_at" | "id" | "updated_at"
>;

const DAYMARK_LOCAL_TASKS_KEY = "daymark_local_tasks";

function readLocalTasks() {
  try {
    const saved = localStorage.getItem(DAYMARK_LOCAL_TASKS_KEY);
    const parsed = saved ? (JSON.parse(saved) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as DayMarkTask[]) : [];
  } catch {
    return [];
  }
}

function writeLocalTasks(tasks: DayMarkTask[]) {
  safeSetStorageJson(DAYMARK_LOCAL_TASKS_KEY, tasks);
}

function createLocalTask(userId: string, input: DayMarkTaskInput): DayMarkTask {
  const now = new Date().toISOString();

  return {
    ...buildTaskInsert(userId, input),
    id: crypto.randomUUID(),
    created_at: now,
    updated_at: now,
  };
}

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
  if (!isCloudDataSyncEnabled) {
    return readLocalTasks()
      .filter((task) => task.user_id === userId && task.task_date === date)
      .sort(
        (left, right) =>
          left.start_time.localeCompare(right.start_time) ||
          left.created_at.localeCompare(right.created_at)
      );
  }

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
  if (!isCloudDataSyncEnabled) {
    return readLocalTasks()
      .filter(
        (task) =>
          task.user_id === userId &&
          task.task_date >= fromDate &&
          task.task_date <= toDate
      )
      .sort(
        (left, right) =>
          left.task_date.localeCompare(right.task_date) ||
          left.start_time.localeCompare(right.start_time)
      );
  }

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
  if (!isCloudDataSyncEnabled) {
    const task = createLocalTask(userId, input);
    writeLocalTasks([...readLocalTasks(), task]);
    notifyTasksChanged();
    return task;
  }

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

  if (!isCloudDataSyncEnabled) {
    const tasks = inputs.map((input) => createLocalTask(userId, input));
    writeLocalTasks([...readLocalTasks(), ...tasks]);
    notifyTasksChanged();
    return tasks;
  }

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
  if (!isCloudDataSyncEnabled) {
    let updatedTask: DayMarkTask | null = null;
    const tasks = readLocalTasks().map((task) => {
      if (task.id !== taskId) return task;

      updatedTask = {
        ...task,
        ...buildTaskUpdate(input),
      } as DayMarkTask;
      return updatedTask;
    });

    if (!updatedTask) throw new Error("Không tìm thấy nhiệm vụ local.");
    writeLocalTasks(tasks);
    notifyTasksChanged();
    return updatedTask;
  }

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
  if (!isCloudDataSyncEnabled) {
    writeLocalTasks(readLocalTasks().filter((task) => task.id !== taskId));
    notifyTasksChanged();
    return;
  }

  const { error } = await supabase.from("daymark_tasks").delete().eq("id", taskId);

  if (error) throw error;
  notifyTasksChanged();
}

export function addLocalTaskFocusSeconds(taskId: string, seconds: number) {
  let updatedTask: DayMarkTask | null = null;
  const tasks = readLocalTasks().map((task) => {
    if (task.id !== taskId) return task;

    updatedTask = {
      ...task,
      actual_focus_seconds: Math.max(task.actual_focus_seconds + seconds, 0),
      updated_at: new Date().toISOString(),
    };
    return updatedTask;
  });

  if (updatedTask) {
    writeLocalTasks(tasks);
    notifyTasksChanged();
  }

  return updatedTask;
}
