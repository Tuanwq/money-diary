import { supabase } from "../../../lib/supabase";
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

export async function addTaskActualFocusSeconds(
  taskId: string,
  seconds: number
) {
  if (seconds <= 0) return null;

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
