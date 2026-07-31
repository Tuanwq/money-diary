import {
  calculateAccountBalance,
  type AccountTransaction,
  type FinancialAccount,
} from "../account-ledger/accountLedgerModel";
import type {
  BalanceCheckEntry,
  CompletedGoal,
  DailyEntry,
  ExpenseEntry,
  Goals,
} from "../../types";
import type { HubEntry, HubSettings } from "../../types/hub";
import {
  addDaysToDateString,
  formatDateShort,
  getDateString,
  toDate,
} from "../../utils/date";
import {
  getBonusMoney,
  getExpenseTotal,
  getMainIncome,
  getOtherExpenseItems,
  getReceivedMoney,
  getTotalEntryMoney,
} from "../../utils/entries";
import { getProgress, getSubGoalSaved } from "../../utils/goals";
import {
  buildHubAnalyticsRows,
  filterHubRowsByDate,
  groupHubPerformance,
  summarizeHubRows,
  type HubAnalyticsSummary,
  type HubPerformanceItem,
} from "../../utils/hubAnalytics";

export type AnalyticsPeriod =
  | "7d"
  | "30d"
  | "thisMonth"
  | "90d"
  | "all"
  | "custom";

export type AnalyticsDateRange = {
  fromDate: string;
  label: string;
  toDate: string;
};

export type AnalyticsMetricKey =
  | "income"
  | "net"
  | "expense"
  | "hours"
  | "orders"
  | "hubProfit";

export type AnalyticsMetric = {
  changePercent: number | null;
  key: AnalyticsMetricKey;
  previousValue: number;
  value: number;
};

export type AnalyticsDailyPoint = {
  bonus: number;
  date: string;
  expense: number;
  hours: number;
  hubProfit: number;
  income: number;
  label: string;
  net: number;
  orders: number;
  received: number;
  workIncome: number;
};

export type AnalyticsExpenseCategory = {
  color: string;
  name: string;
  percentage: number;
  value: number;
};

export type AnalyticsWeekdayPoint = {
  activeDays: number;
  expense: number;
  income: number;
  name: string;
  net: number;
};

export type AnalyticsGoalItem = {
  current: number;
  deadline: string;
  id: string;
  name: string;
  progress: number;
  target: number;
  type: "main" | "sub";
};

export type AnalyticsAccountItem = {
  balance: number;
  id: string;
  name: string;
  type: FinancialAccount["type"];
};

export type FinancialAnalyticsModel = {
  accounts: AnalyticsAccountItem[];
  accountTotal: number;
  activeDays: number;
  completedGoals: number;
  dailyPoints: AnalyticsDailyPoint[];
  expenseCategories: AnalyticsExpenseCategory[];
  goals: AnalyticsGoalItem[];
  hubPerformance: HubPerformanceItem[];
  hubSummary: HubAnalyticsSummary;
  latestBalanceCheck: BalanceCheckEntry | null;
  metrics: Record<AnalyticsMetricKey, AnalyticsMetric>;
  previousRange: AnalyticsDateRange;
  range: AnalyticsDateRange;
  topDays: AnalyticsDailyPoint[];
  totals: {
    bonus: number;
    expense: number;
    hours: number;
    income: number;
    net: number;
    orders: number;
    received: number;
    workIncome: number;
  };
  weekdayPerformance: AnalyticsWeekdayPoint[];
};

type FinancialAnalyticsInput = {
  accounts: FinancialAccount[];
  actualMoney: number;
  balanceChecks: BalanceCheckEntry[];
  completedGoals: CompletedGoal[];
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  goals: Goals;
  hubEntries: HubEntry[];
  hubSettings: HubSettings;
  range: AnalyticsDateRange;
  transactions: AccountTransaction[];
};

const EXPENSE_COLORS = [
  "#557A5B",
  "#3E6F8E",
  "#A66B17",
  "#A85C64",
  "#728078",
  "#8B7355",
];

const WEEKDAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function getRangeDays(range: Pick<AnalyticsDateRange, "fromDate" | "toDate">) {
  const milliseconds =
    toDate(range.toDate).getTime() - toDate(range.fromDate).getTime();

  return Math.max(Math.floor(milliseconds / 86_400_000) + 1, 1);
}

function getChangePercent(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;

  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

function getPreviousRange(range: AnalyticsDateRange): AnalyticsDateRange {
  const days = getRangeDays(range);
  const toDate = addDaysToDateString(range.fromDate, -1);
  const fromDate = addDaysToDateString(toDate, -(days - 1));

  return {
    fromDate,
    label: "Kỳ trước",
    toDate,
  };
}

function enumerateDates(fromDate: string, toDate: string) {
  const dates: string[] = [];
  let cursor = fromDate;

  while (cursor <= toDate) {
    dates.push(cursor);
    cursor = addDaysToDateString(cursor, 1);
  }

  return dates;
}

function filterByRange<T extends { date: string }>(
  items: T[],
  range: AnalyticsDateRange
) {
  return items.filter(
    (item) => item.date >= range.fromDate && item.date <= range.toDate
  );
}

function buildDailyPoints(
  entries: DailyEntry[],
  expenses: ExpenseEntry[],
  hubEntries: HubEntry[],
  hubSettings: HubSettings,
  range: AnalyticsDateRange
) {
  const result = new Map<string, AnalyticsDailyPoint>();

  for (const date of enumerateDates(range.fromDate, range.toDate)) {
    result.set(date, {
      bonus: 0,
      date,
      expense: 0,
      hours: 0,
      hubProfit: 0,
      income: 0,
      label: formatDateShort(date),
      net: 0,
      orders: 0,
      received: 0,
      workIncome: 0,
    });
  }

  for (const entry of filterByRange(entries, range)) {
    const point = result.get(entry.date);
    if (!point) continue;

    point.workIncome += getMainIncome(entry);
    point.bonus += getBonusMoney(entry);
    point.received += getReceivedMoney(entry);
    point.income += getTotalEntryMoney(entry);
    point.hours += entry.workHours ?? 0;
    point.orders += entry.orderCount ?? 0;
  }

  for (const expense of filterByRange(expenses, range)) {
    const point = result.get(expense.date);
    if (point) point.expense += getExpenseTotal(expense);
  }

  const hubRows = filterHubRowsByDate(
    buildHubAnalyticsRows(hubEntries, hubSettings),
    range.fromDate,
    range.toDate
  );

  for (const row of hubRows) {
    const point = result.get(row.entry.date);
    if (point) point.hubProfit += row.actualProfit;
  }

  return [...result.values()].map((point) => ({
    ...point,
    hours: Math.round(point.hours * 10) / 10,
    net: point.income - point.expense,
  }));
}

function summarizeDailyPoints(points: AnalyticsDailyPoint[]) {
  return points.reduce(
    (total, point) => ({
      bonus: total.bonus + point.bonus,
      expense: total.expense + point.expense,
      hours: total.hours + point.hours,
      income: total.income + point.income,
      net: total.net + point.net,
      orders: total.orders + point.orders,
      received: total.received + point.received,
      workIncome: total.workIncome + point.workIncome,
    }),
    {
      bonus: 0,
      expense: 0,
      hours: 0,
      income: 0,
      net: 0,
      orders: 0,
      received: 0,
      workIncome: 0,
    }
  );
}

function buildExpenseCategories(
  expenses: ExpenseEntry[],
  range: AnalyticsDateRange
) {
  const totals = new Map<string, number>();
  const addValue = (name: string, value: number) => {
    if (value <= 0) return;
    totals.set(name, (totals.get(name) ?? 0) + value);
  };

  for (const expense of filterByRange(expenses, range)) {
    addValue("Ăn sáng", expense.breakfast);
    addValue("Ăn trưa", expense.lunch);
    addValue("Ăn tối", expense.dinner);

    for (const item of getOtherExpenseItems(expense)) {
      addValue(item.label, item.amount);
    }
  }

  const sorted = [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const visible = sorted.slice(0, 5);
  const remaining = sorted
    .slice(5)
    .reduce((total, item) => total + item.value, 0);

  if (remaining > 0) visible.push({ name: "Nhãn khác", value: remaining });

  const total = visible.reduce((sum, item) => sum + item.value, 0);

  return visible.map((item, index) => ({
    ...item,
    color: EXPENSE_COLORS[index % EXPENSE_COLORS.length],
    percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
  }));
}

function buildWeekdayPerformance(points: AnalyticsDailyPoint[]) {
  const weekdays = WEEKDAY_NAMES.map((name) => ({
    activeDays: 0,
    expense: 0,
    income: 0,
    name,
    net: 0,
  }));

  for (const point of points) {
    const nativeDay = toDate(point.date).getDay();
    const index = nativeDay === 0 ? 6 : nativeDay - 1;
    const weekday = weekdays[index];

    weekday.income += point.income;
    weekday.expense += point.expense;
    weekday.net += point.net;
    if (point.income > 0 || point.expense > 0) weekday.activeDays += 1;
  }

  return weekdays.map((weekday) => ({
    ...weekday,
    net:
      weekday.activeDays > 0
        ? Math.round(weekday.net / weekday.activeDays)
        : 0,
    income:
      weekday.activeDays > 0
        ? Math.round(weekday.income / weekday.activeDays)
        : 0,
    expense:
      weekday.activeDays > 0
        ? Math.round(weekday.expense / weekday.activeDays)
        : 0,
  }));
}

function buildGoals(goals: Goals, actualMoney: number): AnalyticsGoalItem[] {
  const mainCurrent = Math.max(actualMoney, 0);
  const mainGoal: AnalyticsGoalItem = {
    current: mainCurrent,
    deadline: goals.bigGoalDeadline,
    id: "main-goal",
    name: goals.bigGoalName || "Mục tiêu chính",
    progress: getProgress(mainCurrent, goals.bigGoalTarget),
    target: goals.bigGoalTarget,
    type: "main",
  };
  const subGoals = (goals.subGoals ?? []).map((goal) => {
    const current = getSubGoalSaved(goal);

    return {
      current,
      deadline: goal.deadline,
      id: goal.id,
      name: goal.name,
      progress: getProgress(current, goal.target),
      target: goal.target,
      type: "sub" as const,
    };
  });

  return [mainGoal, ...subGoals]
    .filter((goal) => goal.target > 0)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "main" ? -1 : 1;
      return b.progress - a.progress;
    });
}

function buildAccounts(
  accounts: FinancialAccount[],
  transactions: AccountTransaction[]
) {
  return accounts
    .filter((account) => !account.archivedAt)
    .map((account) => ({
      balance: calculateAccountBalance(account, transactions),
      id: account.id,
      name: account.name,
      type: account.type,
    }))
    .sort((a, b) => b.balance - a.balance);
}

function createMetric(
  key: AnalyticsMetricKey,
  value: number,
  previousValue: number
): AnalyticsMetric {
  return {
    changePercent: getChangePercent(value, previousValue),
    key,
    previousValue,
    value,
  };
}

export function buildAnalyticsDateRange({
  allDates,
  customFromDate,
  customToDate,
  period,
  today,
}: {
  allDates: string[];
  customFromDate: string;
  customToDate: string;
  period: AnalyticsPeriod;
  today: string;
}): AnalyticsDateRange {
  if (period === "custom") {
    const fromDate = customFromDate || today;
    const toDate = customToDate || today;

    return {
      fromDate: fromDate <= toDate ? fromDate : toDate,
      label: "Tùy chỉnh",
      toDate: fromDate <= toDate ? toDate : fromDate,
    };
  }

  if (period === "all") {
    const earliestDate =
      allDates.filter(Boolean).sort((a, b) => a.localeCompare(b))[0] ?? today;

    return {
      fromDate: earliestDate,
      label: "Toàn bộ dữ liệu",
      toDate: today,
    };
  }

  if (period === "thisMonth") {
    return {
      fromDate: `${today.slice(0, 7)}-01`,
      label: "Tháng này",
      toDate: today,
    };
  }

  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;

  return {
    fromDate: addDaysToDateString(today, -(days - 1)),
    label: `${days} ngày gần nhất`,
    toDate: today,
  };
}

export function buildFinancialAnalyticsModel(
  input: FinancialAnalyticsInput
): FinancialAnalyticsModel {
  const previousRange = getPreviousRange(input.range);
  const dailyPoints = buildDailyPoints(
    input.entries,
    input.expenses,
    input.hubEntries,
    input.hubSettings,
    input.range
  );
  const previousDailyPoints = buildDailyPoints(
    input.entries,
    input.expenses,
    input.hubEntries,
    input.hubSettings,
    previousRange
  );
  const totals = summarizeDailyPoints(dailyPoints);
  const previousTotals = summarizeDailyPoints(previousDailyPoints);
  const allHubRows = buildHubAnalyticsRows(input.hubEntries, input.hubSettings);
  const hubRows = filterHubRowsByDate(
    allHubRows,
    input.range.fromDate,
    input.range.toDate
  );
  const previousHubRows = filterHubRowsByDate(
    allHubRows,
    previousRange.fromDate,
    previousRange.toDate
  );
  const hubSummary = summarizeHubRows(hubRows);
  const previousHubSummary = summarizeHubRows(previousHubRows);
  const accounts = buildAccounts(input.accounts, input.transactions);

  return {
    accounts,
    accountTotal:
      accounts.length > 0
        ? accounts.reduce((sum, account) => sum + account.balance, 0)
        : input.actualMoney,
    activeDays: dailyPoints.filter(
      (point) => point.income > 0 || point.expense > 0
    ).length,
    completedGoals: input.completedGoals.length,
    dailyPoints,
    expenseCategories: buildExpenseCategories(input.expenses, input.range),
    goals: buildGoals(input.goals, input.actualMoney),
    hubPerformance: groupHubPerformance(hubRows, "hub", "actualProfit"),
    hubSummary,
    latestBalanceCheck:
      [...input.balanceChecks]
        .filter((check) => check.date <= input.range.toDate)
        .sort((a, b) => {
          const dateComparison = b.date.localeCompare(a.date);
          if (dateComparison !== 0) return dateComparison;
          return b.createdAt.localeCompare(a.createdAt);
        })[0] ?? null,
    metrics: {
      income: createMetric("income", totals.income, previousTotals.income),
      net: createMetric("net", totals.net, previousTotals.net),
      expense: createMetric(
        "expense",
        totals.expense,
        previousTotals.expense
      ),
      hours: createMetric("hours", totals.hours, previousTotals.hours),
      orders: createMetric("orders", totals.orders, previousTotals.orders),
      hubProfit: createMetric(
        "hubProfit",
        hubSummary.actualProfit,
        previousHubSummary.actualProfit
      ),
    },
    previousRange,
    range: input.range,
    topDays: dailyPoints
      .filter((point) => point.income > 0 || point.expense > 0)
      .sort((a, b) => b.net - a.net)
      .slice(0, 5),
    totals,
    weekdayPerformance: buildWeekdayPerformance(dailyPoints),
  };
}

export function getAnalyticsAllDates(input: {
  accountTransactions: AccountTransaction[];
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  hubEntries: HubEntry[];
}) {
  return [
    ...input.entries.map((item) => item.date),
    ...input.expenses.map((item) => item.date),
    ...input.hubEntries.map((item) => item.date),
    ...input.accountTransactions.map((item) => item.date),
  ].filter((date) => date <= getDateString());
}
