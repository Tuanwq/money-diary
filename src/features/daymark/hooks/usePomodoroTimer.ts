import { useEffect, useMemo, useState } from "react";
import type { PomodoroMode, PomodoroTimerState } from "../types/daymark";
import {
  clampPomodoroMinutes,
  getCurrentModeElapsedSeconds,
  getDisplayRemainingSeconds,
  getModeDurationSeconds,
  readStoredPomodoroState,
  writeStoredPomodoroState,
} from "../utils/pomodoroUtils";

function stamp(nextState: PomodoroTimerState): PomodoroTimerState {
  return {
    ...nextState,
    updatedAt: new Date().toISOString(),
  };
}

export function usePomodoroTimer() {
  const [state, setState] = useState<PomodoroTimerState>(
    readStoredPomodoroState
  );
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    writeStoredPomodoroState(state);
  }, [state]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const remainingSeconds = useMemo(
    () => getDisplayRemainingSeconds(state, nowMs),
    [nowMs, state]
  );
  const elapsedSeconds = useMemo(
    () => getCurrentModeElapsedSeconds(state, nowMs),
    [nowMs, state]
  );

  function replaceState(nextState: PomodoroTimerState) {
    setState(stamp(nextState));
  }

  function selectTask(taskId: string, taskDate: string) {
    const durationSeconds = getModeDurationSeconds("focus", state.settings);

    replaceState({
      ...state,
      completedFocusSessions: 0,
      durationSeconds,
      lastStartedAt: null,
      mode: "focus",
      remainingSeconds: durationSeconds,
      sessionStartedAt: null,
      status: "idle",
      taskDate,
      taskId,
    });
  }

  function alignCurrentFocusDuration(minutes: number) {
    if (state.mode !== "focus" || state.status !== "idle") return;

    const durationSeconds = clampPomodoroMinutes(minutes) * 60;

    if (durationSeconds === state.durationSeconds) return;

    replaceState({
      ...state,
      durationSeconds,
      remainingSeconds: durationSeconds,
    });
  }

  function selectFreeSession(taskDate: string) {
    const durationSeconds = getModeDurationSeconds("focus", state.settings);

    replaceState({
      ...state,
      completedFocusSessions: 0,
      durationSeconds,
      lastStartedAt: null,
      mode: "focus",
      remainingSeconds: durationSeconds,
      sessionStartedAt: null,
      status: "idle",
      taskDate,
      taskId: null,
    });
  }

  function updateFocusMinutes(minutes: number) {
    const focusMinutes = clampPomodoroMinutes(minutes);
    const nextSettings = {
      ...state.settings,
      focusMinutes,
    };
    const durationSeconds =
      state.mode === "focus"
        ? focusMinutes * 60
        : getModeDurationSeconds(state.mode, nextSettings);

    replaceState({
      ...state,
      durationSeconds,
      remainingSeconds:
        state.status === "idle" && state.mode === "focus"
          ? durationSeconds
          : state.remainingSeconds,
      settings: nextSettings,
    });
  }

  function updateSetting(
    key: keyof PomodoroTimerState["settings"],
    value: boolean | number
  ) {
    replaceState({
      ...state,
      settings: {
        ...state.settings,
        [key]: typeof value === "number" ? clampPomodoroMinutes(value) : value,
      },
    });
  }

  function startTimer() {
    const now = new Date().toISOString();

    replaceState({
      ...state,
      lastStartedAt: now,
      sessionStartedAt: state.sessionStartedAt ?? now,
      status: "running",
    });
  }

  function pauseTimer() {
    replaceState({
      ...state,
      lastStartedAt: null,
      remainingSeconds,
      status: "paused",
    });
  }

  function resumeTimer() {
    replaceState({
      ...state,
      lastStartedAt: new Date().toISOString(),
      status: "running",
    });
  }

  function resetTimer() {
    const durationSeconds = getModeDurationSeconds("focus", state.settings);

    replaceState({
      ...state,
      completedFocusSessions: 0,
      durationSeconds,
      lastStartedAt: null,
      mode: "focus",
      remainingSeconds: durationSeconds,
      sessionStartedAt: null,
      status: "idle",
    });
  }

  function moveToMode(mode: PomodoroMode, autoStart: boolean) {
    const durationSeconds = getModeDurationSeconds(mode, state.settings);
    const now = new Date().toISOString();

    replaceState({
      ...state,
      durationSeconds,
      lastStartedAt: autoStart ? now : null,
      mode,
      remainingSeconds: durationSeconds,
      sessionStartedAt: autoStart ? now : null,
      status: autoStart ? "running" : "idle",
    });
  }

  function completeFocusSession() {
    const completedFocusSessions = state.completedFocusSessions + 1;
    const shouldTakeLongBreak =
      completedFocusSessions % state.settings.longBreakInterval === 0;
    const nextMode = shouldTakeLongBreak ? "long_break" : "short_break";
    const durationSeconds = getModeDurationSeconds(nextMode, state.settings);
    const now = new Date().toISOString();

    replaceState({
      ...state,
      completedFocusSessions,
      durationSeconds,
      lastStartedAt: state.settings.autoStartBreak ? now : null,
      mode: nextMode,
      remainingSeconds: durationSeconds,
      sessionStartedAt: state.settings.autoStartBreak ? now : null,
      status: state.settings.autoStartBreak ? "running" : "idle",
    });
  }

  function completeBreakSession() {
    const durationSeconds = getModeDurationSeconds("focus", state.settings);
    const now = new Date().toISOString();

    replaceState({
      ...state,
      durationSeconds,
      lastStartedAt: state.settings.autoStartFocus ? now : null,
      mode: "focus",
      remainingSeconds: durationSeconds,
      sessionStartedAt: state.settings.autoStartFocus ? now : null,
      status: state.settings.autoStartFocus ? "running" : "idle",
    });
  }

  return {
    alignCurrentFocusDuration,
    completeBreakSession,
    completeFocusSession,
    elapsedSeconds,
    moveToMode,
    pauseTimer,
    remainingSeconds,
    resetTimer,
    resumeTimer,
    selectFreeSession,
    selectTask,
    startTimer,
    state,
    updateFocusMinutes,
    updateSetting,
  };
}
