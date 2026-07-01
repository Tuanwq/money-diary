import type { DailyEntry, ExpenseEntry } from "../types";
import { addDaysToDateString, getDateString, toDate } from "./date";
import { getExpenseTotal, getTotalEntryMoney } from "./entries";

export type GoalForecastStatus =
  | "noTarget"
  | "reached"
  | "noData"
  | "notGrowing"
  | "forecast";

export type GoalForecastScenario = {
  id: "conservative" | "realistic" | "optimistic";
  label: string;
  averagePerDay: number;
  daysToTarget: number | null;
  targetDate: string | null;
  deadlineDelayDays: number | null;
};

export type GoalForecast = {
  status: GoalForecastStatus;
  fromDate: string;
  toDate: string;
  daysUsed: number;
  netAmount: number;
  averagePerDay: number;
  daysToTarget: number | null;
  targetDate: string | null;
  deadlineDelayDays: number | null;
  shortAveragePerDay: number;
  longAveragePerDay: number;
  trendStatus: "speedingUp" | "slowingDown" | "stable" | "unknown";
  trendDifference: number;
  trendPercent: number | null;
  scenarios: GoalForecastScenario[];
};

type BuildGoalForecastOptions = {
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  today: string;
  currentGoalStartDate: string;
  target: number;
  remaining: number;
  deadline: string;
  days: number;
};

type NetWindow = {
  fromDate: string;
  toDate: string;
  daysUsed: number;
  netAmount: number;
  averagePerDay: number;
};

function getDeadlineDelayDays(targetDate: string | null, deadline: string) {
  if (!targetDate || !deadline || targetDate <= deadline) return null;

  const diffTime = toDate(targetDate).getTime() - toDate(deadline).getTime();

  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function buildNetWindow({
  entries,
  expenses,
  today,
  currentGoalStartDate,
  days,
}: Pick<
  BuildGoalForecastOptions,
  "entries" | "expenses" | "today" | "currentGoalStartDate" | "days"
>): NetWindow {
  const safeDays = Math.min(Math.max(days, 1), 365);
  const forecastStart = toDate(today);
  forecastStart.setDate(forecastStart.getDate() - safeDays + 1);

  const rawFromDate = getDateString(forecastStart);
  const fromDate =
    rawFromDate < currentGoalStartDate ? currentGoalStartDate : rawFromDate;
  const rows: number[] = [];
  const cursor = toDate(fromDate);
  const endDate = toDate(today);

  while (cursor <= endDate) {
    const dateString = getDateString(cursor);
    const income = entries
      .filter((entry) => entry.date === dateString)
      .reduce((sum, entry) => sum + getTotalEntryMoney(entry), 0);
    const expense = expenses
      .filter((item) => item.date === dateString)
      .reduce((sum, item) => sum + getExpenseTotal(item), 0);

    rows.push(income - expense);
    cursor.setDate(cursor.getDate() + 1);
  }

  const netAmount = rows.reduce((sum, item) => sum + item, 0);
  const daysUsed = rows.length;
  const averagePerDay = daysUsed > 0 ? Math.round(netAmount / daysUsed) : 0;

  return {
    fromDate,
    toDate: today,
    daysUsed,
    netAmount,
    averagePerDay,
  };
}

function buildScenario({
  id,
  label,
  averagePerDay,
  today,
  remaining,
  deadline,
}: {
  id: GoalForecastScenario["id"];
  label: string;
  averagePerDay: number;
  today: string;
  remaining: number;
  deadline: string;
}): GoalForecastScenario {
  if (remaining <= 0) {
    return {
      id,
      label,
      averagePerDay,
      daysToTarget: 0,
      targetDate: today,
      deadlineDelayDays: null,
    };
  }

  if (averagePerDay <= 0) {
    return {
      id,
      label,
      averagePerDay,
      daysToTarget: null,
      targetDate: null,
      deadlineDelayDays: null,
    };
  }

  const daysToTarget = Math.ceil(remaining / averagePerDay);
  const targetDate = addDaysToDateString(today, daysToTarget);

  return {
    id,
    label,
    averagePerDay,
    daysToTarget,
    targetDate,
    deadlineDelayDays: getDeadlineDelayDays(targetDate, deadline),
  };
}

export function buildGoalForecast({
  entries,
  expenses,
  today,
  currentGoalStartDate,
  target,
  remaining,
  deadline,
  days,
}: BuildGoalForecastOptions): GoalForecast {
  const selectedWindow = buildNetWindow({
    entries,
    expenses,
    today,
    currentGoalStartDate,
    days,
  });
  const shortWindow = buildNetWindow({
    entries,
    expenses,
    today,
    currentGoalStartDate,
    days: 7,
  });
  const longWindow = buildNetWindow({
    entries,
    expenses,
    today,
    currentGoalStartDate,
    days: 30,
  });
  const trendDifference =
    shortWindow.averagePerDay - longWindow.averagePerDay;
  const trendPercent =
    longWindow.averagePerDay !== 0
      ? Math.round((trendDifference / Math.abs(longWindow.averagePerDay)) * 100)
      : null;
  const trendStatus =
    trendPercent === null
      ? "unknown"
      : trendPercent > 5
        ? "speedingUp"
        : trendPercent < -5
          ? "slowingDown"
          : "stable";
  const conservativeAverage = Math.floor(selectedWindow.averagePerDay * 0.75);
  const optimisticAverage = Math.ceil(
    Math.max(selectedWindow.averagePerDay, shortWindow.averagePerDay) * 1.15
  );
  const scenarios = [
    buildScenario({
      id: "conservative",
      label: "Thận trọng",
      averagePerDay: conservativeAverage,
      today,
      remaining,
      deadline,
    }),
    buildScenario({
      id: "realistic",
      label: "Thực tế",
      averagePerDay: selectedWindow.averagePerDay,
      today,
      remaining,
      deadline,
    }),
    buildScenario({
      id: "optimistic",
      label: "Lạc quan",
      averagePerDay: optimisticAverage,
      today,
      remaining,
      deadline,
    }),
  ];
  const realisticScenario = scenarios.find((item) => item.id === "realistic");
  const status: GoalForecastStatus =
    target <= 0
      ? "noTarget"
      : remaining <= 0
        ? "reached"
        : selectedWindow.daysUsed === 0
          ? "noData"
          : selectedWindow.averagePerDay <= 0
            ? "notGrowing"
            : "forecast";

  return {
    status,
    fromDate: selectedWindow.fromDate,
    toDate: selectedWindow.toDate,
    daysUsed: selectedWindow.daysUsed,
    netAmount: selectedWindow.netAmount,
    averagePerDay: selectedWindow.averagePerDay,
    daysToTarget: realisticScenario?.daysToTarget ?? null,
    targetDate: realisticScenario?.targetDate ?? null,
    deadlineDelayDays: realisticScenario?.deadlineDelayDays ?? null,
    shortAveragePerDay: shortWindow.averagePerDay,
    longAveragePerDay: longWindow.averagePerDay,
    trendStatus,
    trendDifference,
    trendPercent,
    scenarios,
  };
}
