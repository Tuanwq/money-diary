export type TaskCategory =
  | "work"
  | "english"
  | "project"
  | "exercise"
  | "sleep"
  | "personal"
  | "other";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "partial"
  | "skipped";

export type TaskPriority = "low" | "medium" | "high";

export type PomodoroMode = "focus" | "short_break" | "long_break";

export type PomodoroStatus = "idle" | "running" | "paused" | "completed";

export type DayMarkTask = {
  id: string;
  user_id: string;
  task_date: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  actual_focus_seconds: number;
  priority: TaskPriority;
  status: TaskStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type DayMarkTaskInput = {
  task_date: string;
  title: string;
  description: string;
  category: TaskCategory;
  start_time: string;
  end_time: string;
  priority: TaskPriority;
  status: TaskStatus;
  note: string;
};

export type DayMarkTaskForm = DayMarkTaskInput;

export type DayMarkTaskDraft = DayMarkTaskInput & {
  id: string;
  lineNumber: number;
  removed: boolean;
  sourceLine: string;
};

export type ParsedScheduleLine =
  | {
      draft: DayMarkTaskDraft;
      error?: never;
      lineNumber: number;
      sourceLine: string;
    }
  | {
      draft?: never;
      error: string;
      lineNumber: number;
      sourceLine: string;
    };

export type DayMarkMetrics = {
  categoryMinutes: Record<TaskCategory, number>;
  completedCount: number;
  completionRate: number;
  totalMinutes: number;
  totalTasks: number;
};

export type PomodoroSettings = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  autoStartBreak: boolean;
  autoStartFocus: boolean;
};

export type PomodoroTimerState = {
  completedFocusSessions: number;
  durationSeconds: number;
  lastStartedAt: string | null;
  mode: PomodoroMode;
  remainingSeconds: number;
  sessionStartedAt: string | null;
  settings: PomodoroSettings;
  status: PomodoroStatus;
  taskDate: string;
  taskId: string | null;
  updatedAt: string;
};

export type PomodoroSessionRecord = {
  id: string;
  user_id: string;
  task_id: string | null;
  task_date: string;
  mode: PomodoroMode;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  completed: boolean;
  created_at: string;
  updated_at: string;
};
