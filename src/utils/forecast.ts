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
  deadlineStatus: GoalForecastDeadlineStatus;
};

export type GoalForecastDeadlineStatus =
  | "reached"
  | "onTrack"
  | "late"
  | "notGrowing"
  | "noDeadline";

export type GoalForecastPace = NetWindow & {
  id: "last7" | "last30";
  label: string;
  days: number;
  daysToTarget: number | null;
  targetDate: string | null;
  deadlineDelayDays: number | null;
  deadlineStatus: GoalForecastDeadlineStatus;
  averageGapToDeadline: number | null;
};

export type GoalForecast = {
  status: GoalForecastStatus;
  fromDate: string;
  toDate: string;
  daysUsed: number;
  netAmount: number;
  averagePerDay: number;
  realisticAveragePerDay: number;
  daysToTarget: number | null;
  targetDate: string | null;
  deadlineDelayDays: number | null;
  deadlineDaysLeft: number | null;
  requiredAveragePerDay: number | null;
  dailyGapToDeadline: number | null;
  shortAveragePerDay: number;
  longAveragePerDay: number;
  trendStatus: "speedingUp" | "slowingDown" | "stable" | "unknown";
  trendDifference: number;
  trendPercent: number | null;
  paceForecasts: GoalForecastPace[];
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

function getDeadlineDaysLeft(today: string, deadline: string) {
  if (!deadline) return null;

  const diffTime = toDate(deadline).getTime() - toDate(today).getTime();

  return Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 0);
}

function getRequiredAveragePerDay({
  remaining,
  deadlineDaysLeft,
}: {
  remaining: number;
  deadlineDaysLeft: number | null;
}) {
  if (remaining <= 0) return 0;
  if (deadlineDaysLeft === null) return null;
  if (deadlineDaysLeft <= 0) return remaining;

  return Math.ceil(remaining / deadlineDaysLeft);
}

function getDeadlineStatus({
  remaining,
  averagePerDay,
  targetDate,
  deadline,
}: {
  remaining: number;
  averagePerDay: number;
  targetDate: string | null;
  deadline: string;
}): GoalForecastDeadlineStatus {
  if (remaining <= 0) return "reached";
  if (!deadline) return "noDeadline";
  if (averagePerDay <= 0 || !targetDate) return "notGrowing";

  return targetDate <= deadline ? "onTrack" : "late";
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
      deadlineStatus: "reached",
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
      deadlineStatus: deadline ? "notGrowing" : "noDeadline",
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
    deadlineStatus: getDeadlineStatus({
      remaining,
      averagePerDay,
      targetDate,
      deadline,
    }),
  };
}

function buildPaceForecast({
  id,
  label,
  days,
  window,
  today,
  remaining,
  deadline,
  requiredAveragePerDay,
}: {
  id: GoalForecastPace["id"];
  label: string;
  days: number;
  window: NetWindow;
  today: string;
  remaining: number;
  deadline: string;
  requiredAveragePerDay: number | null;
}): GoalForecastPace {
  const scenario = buildScenario({
    id: "realistic",
    label,
    averagePerDay: window.averagePerDay,
    today,
    remaining,
    deadline,
  });

  return {
    ...window,
    id,
    label,
    days,
    daysToTarget: scenario.daysToTarget,
    targetDate: scenario.targetDate,
    deadlineDelayDays: scenario.deadlineDelayDays,
    deadlineStatus: scenario.deadlineStatus,
    averageGapToDeadline:
      requiredAveragePerDay === null
        ? null
        : window.averagePerDay - requiredAveragePerDay,
  };
}

function getWeightedAverage(
  selectedWindow: NetWindow,
  shortWindow: NetWindow,
  longWindow: NetWindow
) {
  const weightedWindows = [
    { average: shortWindow.averagePerDay, weight: shortWindow.daysUsed ? 0.5 : 0 },
    { average: longWindow.averagePerDay, weight: longWindow.daysUsed ? 0.3 : 0 },
    {
      average: selectedWindow.averagePerDay,
      weight: selectedWindow.daysUsed ? 0.2 : 0,
    },
  ];
  const totalWeight = weightedWindows.reduce((sum, item) => {
    return sum + item.weight;
  }, 0);

  if (totalWeight <= 0) return 0;

  const weightedTotal = weightedWindows.reduce((sum, item) => {
    return sum + item.average * item.weight;
  }, 0);

  return Math.round(weightedTotal / totalWeight);
}

function getScenarioAverage({
  type,
  selectedWindow,
  shortWindow,
  longWindow,
}: {
  type: GoalForecastScenario["id"];
  selectedWindow: NetWindow;
  shortWindow: NetWindow;
  longWindow: NetWindow;
}) {
  const averages = [
    selectedWindow.averagePerDay,
    shortWindow.averagePerDay,
    longWindow.averagePerDay,
  ];
  const positiveAverages = averages.filter((average) => average > 0);

  if (type === "realistic") {
    return getWeightedAverage(selectedWindow, shortWindow, longWindow);
  }

  if (type === "conservative") {
    if (positiveAverages.length === 0) return Math.min(...averages);
    return Math.floor(Math.min(...positiveAverages) * 0.85);
  }

  if (positiveAverages.length === 0) return Math.max(...averages);

  return Math.ceil(Math.max(...positiveAverages) * 1.15);
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
  const deadlineDaysLeft = getDeadlineDaysLeft(today, deadline);
  const requiredAveragePerDay = getRequiredAveragePerDay({
    remaining,
    deadlineDaysLeft,
  });
  const conservativeAverage = getScenarioAverage({
    type: "conservative",
    selectedWindow,
    shortWindow,
    longWindow,
  });
  const realisticAverage = getScenarioAverage({
    type: "realistic",
    selectedWindow,
    shortWindow,
    longWindow,
  });
  const optimisticAverage = getScenarioAverage({
    type: "optimistic",
    selectedWindow,
    shortWindow,
    longWindow,
  });
  const paceForecasts = [
    buildPaceForecast({
      id: "last7",
      label: "Theo tốc độ 7 ngày gần nhất",
      days: 7,
      window: shortWindow,
      today,
      remaining,
      deadline,
      requiredAveragePerDay,
    }),
    buildPaceForecast({
      id: "last30",
      label: "Theo tốc độ 30 ngày gần nhất",
      days: 30,
      window: longWindow,
      today,
      remaining,
      deadline,
      requiredAveragePerDay,
    }),
  ];
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
      averagePerDay: realisticAverage,
      today,
      remaining,
      deadline,
    }),
    buildScenario({
      id: "optimistic",
      label: "Tốt",
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
          : realisticAverage <= 0
            ? "notGrowing"
            : "forecast";

  return {
    status,
    fromDate: selectedWindow.fromDate,
    toDate: selectedWindow.toDate,
    daysUsed: selectedWindow.daysUsed,
    netAmount: selectedWindow.netAmount,
    averagePerDay: selectedWindow.averagePerDay,
    realisticAveragePerDay: realisticAverage,
    daysToTarget: realisticScenario?.daysToTarget ?? null,
    targetDate: realisticScenario?.targetDate ?? null,
    deadlineDelayDays: realisticScenario?.deadlineDelayDays ?? null,
    deadlineDaysLeft,
    requiredAveragePerDay,
    dailyGapToDeadline:
      requiredAveragePerDay === null
        ? null
        : shortWindow.averagePerDay - requiredAveragePerDay,
    shortAveragePerDay: shortWindow.averagePerDay,
    longAveragePerDay: longWindow.averagePerDay,
    trendStatus,
    trendDifference,
    trendPercent,
    paceForecasts,
    scenarios,
  };
}
