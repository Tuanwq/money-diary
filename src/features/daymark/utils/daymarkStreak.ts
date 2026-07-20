import {
  addDaysToDateString,
  getToday,
} from "../../../utils/date";
import type { DayMarkTask } from "../types/daymark";

export const DEFAULT_STREAK_COMPLETION_RATE = 50;
export const DAYMARK_STREAK_RATE_STORAGE_KEY =
  "daymark-streak-completion-rate";

export type DailyTaskStatsStatus =
  | "completed"
  | "failed"
  | "in-progress"
  | "empty";

export type DailyTaskStats = {
  completedTasks: number;
  completionRate: number;
  date: string;
  status: DailyTaskStatsStatus;
  totalTasks: number;
};

export function clampStreakCompletionRate(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_STREAK_COMPLETION_RATE;

  return Math.min(Math.max(Math.round(value), 1), 100);
}

export function readStreakCompletionRate() {
  const saved = localStorage.getItem(DAYMARK_STREAK_RATE_STORAGE_KEY);

  return clampStreakCompletionRate(
    saved ? Number(saved) : DEFAULT_STREAK_COMPLETION_RATE
  );
}

export function writeStreakCompletionRate(value: number) {
  const nextValue = clampStreakCompletionRate(value);

  localStorage.setItem(DAYMARK_STREAK_RATE_STORAGE_KEY, String(nextValue));
  window.dispatchEvent(
    new CustomEvent("daymark-streak-rate-change", { detail: nextValue })
  );

  return nextValue;
}

export function getDailyTaskStats(
  date: string,
  tasks: DayMarkTask[],
  requiredCompletionRate = DEFAULT_STREAK_COMPLETION_RATE,
  today = getToday()
): DailyTaskStats {
  const activeTasks = tasks.filter(
    (task) => task.task_date === date && task.status !== "skipped"
  );
  const totalTasks = activeTasks.length;
  const completedTasks = activeTasks.filter(
    (task) => task.status === "completed"
  ).length;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isCompleted =
    totalTasks > 0 && completionRate >= requiredCompletionRate;
  const isPastDate = date < today;

  return {
    completedTasks,
    completionRate,
    date,
    status: isCompleted
      ? "completed"
      : totalTasks === 0
        ? "empty"
        : isPastDate
          ? "failed"
          : "in-progress",
    totalTasks,
  };
}

export function buildDailyTaskStatsMap(
  tasks: DayMarkTask[],
  requiredCompletionRate = DEFAULT_STREAK_COMPLETION_RATE,
  today = getToday()
) {
  const dates = new Set(tasks.map((task) => task.task_date));
  dates.add(today);

  return Array.from(dates).reduce<Record<string, DailyTaskStats>>(
    (result, date) => ({
      ...result,
      [date]: getDailyTaskStats(date, tasks, requiredCompletionRate, today),
    }),
    {}
  );
}

export function isDateCompleted(
  date: string,
  tasks: DayMarkTask[],
  requiredCompletionRate = DEFAULT_STREAK_COMPLETION_RATE,
  today = getToday()
) {
  return (
    getDailyTaskStats(date, tasks, requiredCompletionRate, today).status ===
    "completed"
  );
}

export function calculateCurrentStreak(
  dailyStats: Record<string, DailyTaskStats>,
  today = getToday()
) {
  let cursor =
    dailyStats[today]?.status === "completed"
      ? today
      : addDaysToDateString(today, -1);
  let streak = 0;

  while (dailyStats[cursor]?.status === "completed") {
    streak += 1;
    cursor = addDaysToDateString(cursor, -1);
  }

  return streak;
}

export function calculateLongestStreak(
  dailyStats: Record<string, DailyTaskStats>,
  today = getToday()
) {
  const completedDates = Object.values(dailyStats)
    .filter((stats) => stats.date <= today && stats.status === "completed")
    .map((stats) => stats.date)
    .sort();
  let longestStreak = 0;
  let currentStreak = 0;
  let previousDate = "";

  completedDates.forEach((date) => {
    currentStreak =
      previousDate && addDaysToDateString(previousDate, 1) === date
        ? currentStreak + 1
        : 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    previousDate = date;
  });

  return longestStreak;
}
