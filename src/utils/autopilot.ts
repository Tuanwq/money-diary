import type { DailyEntry, ExpenseEntry, Goals, SubGoal } from "../types";
import type { HubEntry, HubSettings } from "../types/hub";
import { addDaysToDateString, toDate } from "./date";
import { getExpenseTotal, getTotalEntryMoney } from "./entries";
import { getProgress, getSubGoalSaved } from "./goals";
import {
  buildHubAnalyticsRows,
  filterHubRowsByDate,
  groupHubPerformance,
  summarizeHubRows,
  type HubPerformanceItem,
} from "./hubAnalytics";

export type AutopilotGoalStatus =
  | "reached"
  | "onTrack"
  | "behind"
  | "critical"
  | "noTarget";

export type AutopilotGoal = {
  id: string;
  name: string;
  kind: "main" | "sub";
  status: AutopilotGoalStatus;
  statusLabel: string;
  target: number;
  current: number;
  remaining: number;
  deadline: string;
  daysLeft: number;
  progress: number;
  timeProgress: number;
  requiredPerDay: number;
  weeklyTarget: number;
  currentPace: number;
  paceGap: number;
  targetDate: string | null;
  deadlineDelayDays: number | null;
  nextMilestone: number | null;
  nextMilestoneAmount: number;
  missingToNextMilestone: number;
  todayMessage: string;
};

export type TomorrowOperatorPlan = {
  targetNet: number;
  incomeTarget: number;
  expenseCap: number;
  recentAverageNet: number;
  gapVsRecentPace: number;
  estimatedOrders: number | null;
  estimatedHours: number | null;
  extraOrdersForGap: number | null;
  extraHoursForGap: number | null;
  recommendedHub: HubPerformanceItem | null;
  recommendedShift: HubPerformanceItem | null;
  priorityGoal: AutopilotGoal | null;
  actions: string[];
};

export type AutopilotDashboard = {
  tomorrow: TomorrowOperatorPlan;
  goals: AutopilotGoal[];
};

type BuildAutopilotDashboardOptions = {
  actualMoney: number;
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  goals: Goals;
  hubEntries: HubEntry[];
  hubSettings: HubSettings;
  today: string;
};

function getDaysBetween(fromDate: string, toDate: string) {
  const diffTime = toDateStringMs(toDate) - toDateStringMs(fromDate);

  return Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 0);
}

function toDateStringMs(date: string) {
  return toDate(date).getTime();
}

function getDaysLeftFrom(today: string, deadline: string) {
  if (!deadline) return 0;

  return getDaysBetween(today, deadline);
}

function getTimeProgress(startDate: string, deadline: string, today: string) {
  if (!startDate || !deadline) return 0;

  const totalDays = Math.max(getDaysBetween(startDate, deadline), 1);
  const elapsedDays = Math.min(Math.max(getDaysBetween(startDate, today), 0), totalDays);

  return Math.round((elapsedDays / totalDays) * 100);
}

function getTargetDate(today: string, remaining: number, pacePerDay: number) {
  if (remaining <= 0) return today;
  if (pacePerDay <= 0) return null;

  return addDaysToDateString(today, Math.ceil(remaining / pacePerDay));
}

function getDeadlineDelayDays(targetDate: string | null, deadline: string) {
  if (!targetDate || !deadline || targetDate <= deadline) return null;

  return getDaysBetween(deadline, targetDate);
}

function getStatus({
  daysLeft,
  paceGap,
  progress,
  remaining,
  requiredPerDay,
  target,
  timeProgress,
}: {
  daysLeft: number;
  paceGap: number;
  progress: number;
  remaining: number;
  requiredPerDay: number;
  target: number;
  timeProgress: number;
}): AutopilotGoalStatus {
  if (target <= 0) return "noTarget";
  if (remaining <= 0) return "reached";
  if (daysLeft <= 0) return "critical";
  if (requiredPerDay > 0 && paceGap < -requiredPerDay * 0.5) return "critical";
  if (progress + 12 < timeProgress) return "critical";
  if (paceGap < 0 || progress + 5 < timeProgress) return "behind";

  return "onTrack";
}

function getStatusLabel(status: AutopilotGoalStatus) {
  if (status === "reached") return "Đã đạt";
  if (status === "onTrack") return "Đúng tiến độ";
  if (status === "behind") return "Chậm";
  if (status === "critical") return "Rất nguy hiểm";
  return "Chưa có mục tiêu";
}

function buildMilestone(target: number, current: number) {
  const progress = getProgress(current, target);
  const nextMilestone = [25, 50, 75, 100].find((item) => progress < item) ?? null;
  const nextMilestoneAmount = nextMilestone
    ? Math.ceil(target * (nextMilestone / 100))
    : target;

  return {
    nextMilestone,
    nextMilestoneAmount,
    missingToNextMilestone: Math.max(nextMilestoneAmount - current, 0),
  };
}

function getDailyNeed(remaining: number, daysLeft: number) {
  if (remaining <= 0) return 0;
  if (daysLeft <= 0) return remaining;

  return Math.ceil(remaining / daysLeft);
}

function buildNetWindow({
  entries,
  expenses,
  fromDate,
  toDate,
}: {
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  fromDate: string;
  toDate: string;
}) {
  let cursor = fromDate;
  let days = 0;
  let net = 0;
  let expense = 0;

  while (cursor <= toDate) {
    const dayIncome = entries
      .filter((entry) => entry.date === cursor)
      .reduce((sum, entry) => sum + getTotalEntryMoney(entry), 0);
    const dayExpense = expenses
      .filter((item) => item.date === cursor)
      .reduce((sum, item) => sum + getExpenseTotal(item), 0);

    net += dayIncome - dayExpense;
    expense += dayExpense;
    days += 1;
    cursor = addDaysToDateString(cursor, 1);
  }

  return {
    averageExpense: days > 0 ? Math.round(expense / days) : 0,
    averageNet: days > 0 ? Math.round(net / days) : 0,
    days,
    expense,
    net,
  };
}

function getMainGoalPace({
  entries,
  expenses,
  today,
}: Pick<BuildAutopilotDashboardOptions, "entries" | "expenses" | "today">) {
  return buildNetWindow({
    entries,
    expenses,
    fromDate: addDaysToDateString(today, -6),
    toDate: today,
  }).averageNet;
}

function getSubGoalPace(goal: SubGoal, today: string) {
  const fromDate = addDaysToDateString(today, -29);
  const safeFromDate = goal.startDate && goal.startDate > fromDate ? goal.startDate : fromDate;
  const days = Math.max(getDaysBetween(safeFromDate, today) + 1, 1);
  const contributed = goal.contributions
    .filter((item) => item.date >= safeFromDate && item.date <= today)
    .reduce((sum, item) => sum + item.amount, 0);

  return Math.round(contributed / days);
}

function buildAutopilotGoal({
  current,
  currentPace,
  deadline,
  id,
  kind,
  name,
  startDate,
  target,
  today,
}: {
  current: number;
  currentPace: number;
  deadline: string;
  id: string;
  kind: AutopilotGoal["kind"];
  name: string;
  startDate: string;
  target: number;
  today: string;
}): AutopilotGoal {
  const remaining = Math.max(target - current, 0);
  const daysLeft = getDaysLeftFrom(today, deadline);
  const progress = getProgress(current, target);
  const timeProgress = getTimeProgress(startDate, deadline, today);
  const requiredPerDay = getDailyNeed(remaining, daysLeft);
  const weeklyTarget = Math.min(remaining, requiredPerDay * 7);
  const paceGap = currentPace - requiredPerDay;
  const targetDate = getTargetDate(today, remaining, currentPace);
  const status = getStatus({
    daysLeft,
    paceGap,
    progress,
    remaining,
    requiredPerDay,
    target,
    timeProgress,
  });
  const milestone = buildMilestone(target, current);

  return {
    id,
    name,
    kind,
    status,
    statusLabel: getStatusLabel(status),
    target,
    current,
    remaining,
    deadline,
    daysLeft,
    progress,
    timeProgress,
    requiredPerDay,
    weeklyTarget,
    currentPace,
    paceGap,
    targetDate,
    deadlineDelayDays: getDeadlineDelayDays(targetDate, deadline),
    ...milestone,
    todayMessage:
      remaining <= 0
        ? "Mục tiêu này đã xong."
        : `Hôm nay chỉ cần đạt ${requiredPerDay.toLocaleString("vi-VN")} đ là vẫn kịp.`,
  };
}

function getPriorityScore(goal: AutopilotGoal) {
  const statusScore: Record<AutopilotGoalStatus, number> = {
    critical: 500,
    behind: 300,
    onTrack: 100,
    noTarget: 0,
    reached: 0,
  };

  return (
    statusScore[goal.status] +
    Math.max(60 - goal.daysLeft, 0) +
    Math.round(goal.requiredPerDay / 10000)
  );
}

function getFallbackIncomePerHour(entries: DailyEntry[]) {
  const recentEntries = entries
    .filter((entry) => entry.workHours > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);
  const income = recentEntries.reduce((sum, entry) => sum + getTotalEntryMoney(entry), 0);
  const hours = recentEntries.reduce((sum, entry) => sum + entry.workHours, 0);

  return hours > 0 ? Math.round(income / hours) : 0;
}

function buildTomorrowPlan({
  entries,
  expenses,
  goals,
  goalPlans,
  hubEntries,
  hubSettings,
  today,
}: BuildAutopilotDashboardOptions & { goalPlans: AutopilotGoal[] }): TomorrowOperatorPlan {
  const recentWindow = buildNetWindow({
    entries,
    expenses,
    fromDate: addDaysToDateString(today, -6),
    toDate: today,
  });
  const activeGoals = goalPlans
    .filter((goal) => goal.status !== "reached" && goal.status !== "noTarget")
    .sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
  const priorityGoal = activeGoals[0] ?? null;
  const targetNet = Math.max(
    goals.dailyIncome,
    priorityGoal?.requiredPerDay ?? 0,
    ...activeGoals.slice(0, 3).map((goal) => goal.requiredPerDay)
  );
  const expenseCap =
    recentWindow.averageExpense > 0
      ? Math.max(0, Math.min(recentWindow.averageExpense, Math.round(targetNet * 0.25)))
      : Math.max(0, Math.round(targetNet * 0.2));
  const incomeTarget = targetNet + expenseCap;
  const hubRows = filterHubRowsByDate(
    buildHubAnalyticsRows(hubEntries, hubSettings),
    addDaysToDateString(today, -29),
    today
  );
  const hubSummary = summarizeHubRows(hubRows);
  const recommendedShift =
    groupHubPerformance(hubRows, "shift", "incomePerHour").find(
      (item) => item.shifts >= 2
    ) ?? groupHubPerformance(hubRows, "shift", "incomePerHour")[0] ?? null;
  const recommendedHub =
    groupHubPerformance(hubRows, "hub", "workIncome")[0] ?? null;
  const incomePerHour =
    recommendedShift?.incomePerHour ||
    hubSummary.incomePerHour ||
    getFallbackIncomePerHour(entries);
  const incomePerOrder =
    recommendedShift && recommendedShift.orders > 0
      ? Math.round(recommendedShift.workIncome / recommendedShift.orders)
      : hubSummary.orders > 0
        ? Math.round(hubSummary.workIncome / hubSummary.orders)
        : 13500;
  const gapVsRecentPace = Math.max(targetNet - recentWindow.averageNet, 0);
  const estimatedOrders =
    incomePerOrder > 0 ? Math.ceil(incomeTarget / incomePerOrder) : null;
  const estimatedHours =
    incomePerHour > 0 ? Math.ceil((incomeTarget / incomePerHour) * 10) / 10 : null;
  const extraOrdersForGap =
    incomePerOrder > 0 && gapVsRecentPace > 0
      ? Math.ceil(gapVsRecentPace / incomePerOrder)
      : null;
  const extraHoursForGap =
    incomePerHour > 0 && gapVsRecentPace > 0
      ? Math.ceil((gapVsRecentPace / incomePerHour) * 10) / 10
      : null;
  const actions = [
    priorityGoal
      ? `Ưu tiên mục tiêu "${priorityGoal.name}" vì đang ${priorityGoal.statusLabel.toLowerCase()}.`
      : "Chưa có mục tiêu nào cần ưu tiên đặc biệt.",
    recommendedShift
      ? `Ưu tiên ${recommendedShift.label} vì đang đạt khoảng ${recommendedShift.incomePerHour.toLocaleString(
          "vi-VN"
        )} đ/giờ.`
      : "Chưa đủ dữ liệu Hub để chọn ca tốt nhất.",
    `Giữ chi tiêu dưới ${expenseCap.toLocaleString("vi-VN")} đ để không làm chậm nhịp mục tiêu.`,
  ];

  return {
    targetNet,
    incomeTarget,
    expenseCap,
    recentAverageNet: recentWindow.averageNet,
    gapVsRecentPace,
    estimatedOrders,
    estimatedHours,
    extraOrdersForGap,
    extraHoursForGap,
    recommendedHub,
    recommendedShift,
    priorityGoal,
    actions,
  };
}

export function buildAutopilotDashboard({
  actualMoney,
  entries,
  expenses,
  goals,
  hubEntries,
  hubSettings,
  today,
}: BuildAutopilotDashboardOptions): AutopilotDashboard {
  const mainGoal = buildAutopilotGoal({
    id: "main",
    name: goals.bigGoalName || "Mục tiêu chính",
    kind: "main",
    target: goals.bigGoalTarget,
    current: actualMoney,
    startDate: goals.bigGoalStartDate,
    deadline: goals.bigGoalDeadline,
    currentPace: getMainGoalPace({ entries, expenses, today }),
    today,
  });
  const subGoals = (goals.subGoals ?? []).map((goal) =>
    buildAutopilotGoal({
      id: goal.id,
      name: goal.name,
      kind: "sub",
      target: goal.target,
      current: getSubGoalSaved(goal),
      startDate: goal.startDate,
      deadline: goal.deadline,
      currentPace: getSubGoalPace(goal, today),
      today,
    })
  );
  const goalPlans = [mainGoal, ...subGoals];

  return {
    tomorrow: buildTomorrowPlan({
      actualMoney,
      entries,
      expenses,
      goals,
      goalPlans,
      hubEntries,
      hubSettings,
      today,
    }),
    goals: goalPlans,
  };
}
