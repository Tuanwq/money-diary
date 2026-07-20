import { getToday } from "../../../utils/date";
import type {
  PomodoroMode,
  PomodoroSettings,
  PomodoroStatus,
  PomodoroTimerState,
} from "../types/daymark";

export const POMODORO_STORAGE_KEY = "daymark-pomodoro-state";

export const defaultPomodoroSettings: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreak: false,
  autoStartFocus: false,
};

export function clampPomodoroMinutes(value: number) {
  if (!Number.isFinite(value)) return 25;

  return Math.min(Math.max(Math.round(value), 1), 180);
}

export function getModeDurationSeconds(
  mode: PomodoroMode,
  settings: PomodoroSettings
) {
  if (mode === "short_break") return settings.shortBreakMinutes * 60;
  if (mode === "long_break") return settings.longBreakMinutes * 60;

  return settings.focusMinutes * 60;
}

export function createIdlePomodoroState(
  input: Partial<Pick<PomodoroTimerState, "taskDate" | "taskId">> = {}
): PomodoroTimerState {
  const durationSeconds = defaultPomodoroSettings.focusMinutes * 60;
  const now = new Date().toISOString();

  return {
    completedFocusSessions: 0,
    durationSeconds,
    lastStartedAt: null,
    mode: "focus",
    remainingSeconds: durationSeconds,
    sessionStartedAt: null,
    settings: defaultPomodoroSettings,
    status: "idle",
    taskDate: input.taskDate ?? getToday(),
    taskId: input.taskId ?? null,
    updatedAt: now,
  };
}

export function readStoredPomodoroState(): PomodoroTimerState {
  const saved = localStorage.getItem(POMODORO_STORAGE_KEY);

  if (!saved) return createIdlePomodoroState();

  try {
    const parsed = JSON.parse(saved) as Partial<PomodoroTimerState>;
    const settings = {
      ...defaultPomodoroSettings,
      ...(parsed.settings ?? {}),
    };
    const mode = parsed.mode ?? "focus";
    const durationSeconds =
      parsed.durationSeconds ?? getModeDurationSeconds(mode, settings);

    return {
      completedFocusSessions: parsed.completedFocusSessions ?? 0,
      durationSeconds,
      lastStartedAt: parsed.lastStartedAt ?? null,
      mode,
      remainingSeconds: parsed.remainingSeconds ?? durationSeconds,
      sessionStartedAt: parsed.sessionStartedAt ?? null,
      settings,
      status: parsed.status ?? "idle",
      taskDate: parsed.taskDate ?? getToday(),
      taskId: parsed.taskId ?? null,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return createIdlePomodoroState();
  }
}

export function writeStoredPomodoroState(state: PomodoroTimerState) {
  localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(state));
}

export function getDisplayRemainingSeconds(
  state: PomodoroTimerState,
  nowMs = Date.now()
) {
  if (state.status !== "running" || !state.lastStartedAt) {
    return Math.max(state.remainingSeconds, 0);
  }

  const elapsedSeconds = Math.floor(
    (nowMs - new Date(state.lastStartedAt).getTime()) / 1000
  );

  return Math.max(state.remainingSeconds - elapsedSeconds, 0);
}

export function getCurrentModeElapsedSeconds(
  state: PomodoroTimerState,
  nowMs = Date.now()
) {
  return Math.max(
    state.durationSeconds - getDisplayRemainingSeconds(state, nowMs),
    0
  );
}

export function isPomodoroActive(status: PomodoroStatus) {
  return status === "running" || status === "paused";
}

export function formatPomodoroClock(seconds: number) {
  const safeSeconds = Math.max(Math.ceil(seconds), 0);
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function getPomodoroModeLabel(mode: PomodoroMode) {
  if (mode === "short_break") return "Nghỉ ngắn";
  if (mode === "long_break") return "Nghỉ dài";

  return "Tập trung";
}
