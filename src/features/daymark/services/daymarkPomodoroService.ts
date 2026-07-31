import { supabase } from "../../../lib/supabase";
import { isCloudDataSyncEnabled } from "../../../config/moneyCloudSync";
import { safeSetStorageJson } from "../../../utils/safeStorage";
import { addLocalTaskFocusSeconds } from "./daymarkTasksService";
import type { DayMarkTask, PomodoroMode, PomodoroSessionRecord } from "../types/daymark";

type RecordPomodoroSessionInput = {
  completed: boolean;
  durationSeconds: number;
  endedAt: string;
  mode: PomodoroMode;
  startedAt: string;
  taskDate: string;
  taskId: string | null;
  userId: string;
};

const DAYMARK_LOCAL_POMODORO_SESSIONS_KEY =
  "daymark_local_pomodoro_sessions";

function readLocalSessions() {
  try {
    const saved = localStorage.getItem(DAYMARK_LOCAL_POMODORO_SESSIONS_KEY);
    const parsed = saved ? (JSON.parse(saved) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as PomodoroSessionRecord[]) : [];
  } catch {
    return [];
  }
}

export async function addTaskActualFocusSeconds(
  taskId: string,
  seconds: number
) {
  if (seconds <= 0) return null;

  if (!isCloudDataSyncEnabled) {
    return addLocalTaskFocusSeconds(taskId, seconds);
  }

  const { data: currentTask, error: selectError } = await supabase
    .from("daymark_tasks")
    .select("actual_focus_seconds")
    .eq("id", taskId)
    .single();

  if (selectError) throw selectError;

  const currentSeconds =
    typeof currentTask?.actual_focus_seconds === "number"
      ? currentTask.actual_focus_seconds
      : 0;
  const { data, error } = await supabase
    .from("daymark_tasks")
    .update({
      actual_focus_seconds: currentSeconds + seconds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) throw error;

  return data as DayMarkTask;
}

export async function recordPomodoroSession({
  completed,
  durationSeconds,
  endedAt,
  mode,
  startedAt,
  taskDate,
  taskId,
  userId,
}: RecordPomodoroSessionInput) {
  if (!isCloudDataSyncEnabled) {
    const now = new Date().toISOString();
    const session: PomodoroSessionRecord = {
      completed,
      created_at: now,
      duration_seconds: durationSeconds,
      ended_at: endedAt,
      id: crypto.randomUUID(),
      mode,
      started_at: startedAt,
      task_date: taskDate,
      task_id: taskId,
      updated_at: now,
      user_id: userId,
    };

    safeSetStorageJson(DAYMARK_LOCAL_POMODORO_SESSIONS_KEY, [
      session,
      ...readLocalSessions(),
    ]);

    if (mode === "focus" && taskId && durationSeconds > 0) {
      addLocalTaskFocusSeconds(taskId, durationSeconds);
    }

    return session;
  }

  const { data, error } = await supabase
    .from("daymark_pomodoro_sessions")
    .insert({
      user_id: userId,
      task_id: taskId,
      task_date: taskDate,
      mode,
      started_at: startedAt,
      ended_at: endedAt,
      duration_seconds: durationSeconds,
      completed,
    })
    .select("*")
    .single();

  if (error) throw error;

  if (mode === "focus" && taskId && durationSeconds > 0) {
    await addTaskActualFocusSeconds(taskId, durationSeconds);
  }

  return data as PomodoroSessionRecord;
}
