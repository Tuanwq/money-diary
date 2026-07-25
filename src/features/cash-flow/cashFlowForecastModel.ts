import type { DailyEntry, ExpenseEntry } from "../../types";

export const CASH_FLOW_STORAGE_KEY = "money_diary_cash_flow_state";

export type CashFlowPlanType = "income" | "expense";
export type CashFlowRecurrence = "once" | "weekly" | "monthly";
export type CashFlowScenarioId =
  | "conservative"
  | "realistic"
  | "optimistic";

export type CashFlowPlan = {
  amount: number;
  createdAt: string;
  enabled: boolean;
  id: string;
  label: string;
  recurrence: CashFlowRecurrence;
  startDate: string;
  type: CashFlowPlanType;
  updatedAt: string;
};

export type CashFlowState = {
  plans: CashFlowPlan[];
  updatedAt: string;
};

export type CashFlowProjectionPoint = {
  balance: number;
  date: string;
  expense: number;
  historicalExpense: number;
  historicalIncome: number;
  income: number;
  net: number;
  plannedExpense: number;
  plannedIncome: number;
};

export type CashFlowScenario = {
  id: CashFlowScenarioId;
  label: string;
  projectedBalance: number;
  totalIncome: number;
  totalExpense: number;
  netChange: number;
  lowestBalance: number;
  lowestBalanceDate: string;
  negativeBalanceDate: string | null;
  points: CashFlowProjectionPoint[];
};

export type CashFlowForecast = {
  average7: {
    expense: number;
    income: number;
    net: number;
  };
  average30: {
    expense: number;
    income: number;
    net: number;
  };
  currentBalance: number;
  fromDate: string;
  horizonDays: number;
  plannedExpense: number;
  plannedIncome: number;
  scenarios: CashFlowScenario[];
  toDate: string;
  trend: "improving" | "slowing" | "stable" | "unknown";
};

export const CASH_FLOW_PLAN_TYPE_LABELS: Record<CashFlowPlanType, string> = {
  income: "Khoản thu",
  expense: "Khoản chi",
};

export const CASH_FLOW_RECURRENCE_LABELS: Record<
  CashFlowRecurrence,
  string
> = {
  once: "Một lần",
  weekly: "Hàng tuần",
  monthly: "Hàng tháng",
};

export const CASH_FLOW_SCENARIO_LABELS: Record<
  CashFlowScenarioId,
  string
> = {
  conservative: "Thận trọng",
  realistic: "Thực tế",
  optimistic: "Tích cực",
};

export function createDefaultCashFlowState(): CashFlowState {
  return {
    plans: [],
    updatedAt: new Date().toISOString(),
  };
}

export function isCashFlowState(value: unknown): value is CashFlowState {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<CashFlowState>;

  return (
    Array.isArray(candidate.plans) &&
    typeof candidate.updatedAt === "string"
  );
}

function toDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addCashFlowDays(dateString: string, amount: number) {
  const date = toDate(dateString);
  date.setDate(date.getDate() + amount);
  return toDateString(date);
}

function getDailyIncome(entries: DailyEntry[], date: string) {
  return entries
    .filter((entry) => entry.date === date)
    .reduce(
      (total, entry) =>
        total +
        (entry.income ?? 0) +
        (entry.bonusMoney ?? 0) +
        (entry.receivedMoney ?? 0),
      0
    );
}

function getDailyExpense(expenses: ExpenseEntry[], date: string) {
  return expenses
    .filter((expense) => expense.date === date)
    .reduce(
      (total, expense) =>
        total +
        (expense.breakfast ?? 0) +
        (expense.lunch ?? 0) +
        (expense.dinner ?? 0) +
        (expense.other ?? 0),
      0
    );
}

function buildAverage({
  entries,
  expenses,
  today,
  days,
}: {
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  today: string;
  days: number;
}) {
  let income = 0;
  let expense = 0;

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = addCashFlowDays(today, -offset);
    income += getDailyIncome(entries, date);
    expense += getDailyExpense(expenses, date);
  }

  const averageIncome = Math.round(income / days);
  const averageExpense = Math.round(expense / days);

  return {
    expense: averageExpense,
    income: averageIncome,
    net: averageIncome - averageExpense,
  };
}

function getMonthlyOccurrence(startDate: string, monthOffset: number) {
  const start = toDate(startDate);
  const targetYear = start.getFullYear();
  const targetMonth = start.getMonth() + monthOffset;
  const lastDay = new Date(targetYear, targetMonth + 1, 0, 12).getDate();
  const target = new Date(
    targetYear,
    targetMonth,
    Math.min(start.getDate(), lastDay),
    12
  );

  return toDateString(target);
}

export function getCashFlowPlanOccurrences(
  plan: CashFlowPlan,
  fromDate: string,
  toDateValue: string
) {
  if (!plan.enabled || plan.amount <= 0 || !plan.startDate) return [];
  if (plan.recurrence === "once") {
    return plan.startDate >= fromDate && plan.startDate <= toDateValue
      ? [plan.startDate]
      : [];
  }

  const occurrences: string[] = [];

  if (plan.recurrence === "weekly") {
    let date = plan.startDate;

    while (date < fromDate) date = addCashFlowDays(date, 7);
    while (date <= toDateValue) {
      occurrences.push(date);
      date = addCashFlowDays(date, 7);
    }

    return occurrences;
  }

  let monthOffset = 0;
  let date = getMonthlyOccurrence(plan.startDate, monthOffset);

  while (date < fromDate) {
    monthOffset += 1;
    date = getMonthlyOccurrence(plan.startDate, monthOffset);
  }
  while (date <= toDateValue) {
    occurrences.push(date);
    monthOffset += 1;
    date = getMonthlyOccurrence(plan.startDate, monthOffset);
  }

  return occurrences;
}

function getWeightedAverage(shortValue: number, longValue: number) {
  if (shortValue === 0) return longValue;
  if (longValue === 0) return shortValue;
  return Math.round(shortValue * 0.65 + longValue * 0.35);
}

function buildScenario({
  averageExpense,
  averageIncome,
  currentBalance,
  fromDate,
  horizonDays,
  id,
  plans,
}: {
  averageExpense: number;
  averageIncome: number;
  currentBalance: number;
  fromDate: string;
  horizonDays: number;
  id: CashFlowScenarioId;
  plans: CashFlowPlan[];
}): CashFlowScenario {
  const multiplier =
    id === "conservative"
      ? { expense: 1.15, income: 0.8 }
      : id === "optimistic"
        ? { expense: 0.9, income: 1.15 }
        : { expense: 1, income: 1 };
  const historicalIncome = Math.round(averageIncome * multiplier.income);
  const historicalExpense = Math.round(averageExpense * multiplier.expense);
  const toDateValue = addCashFlowDays(fromDate, horizonDays - 1);
  const plannedByDate = new Map<
    string,
    { expense: number; income: number }
  >();

  plans.forEach((plan) => {
    getCashFlowPlanOccurrences(plan, fromDate, toDateValue).forEach((date) => {
      const current = plannedByDate.get(date) ?? { expense: 0, income: 0 };
      current[plan.type] += plan.amount;
      plannedByDate.set(date, current);
    });
  });

  let balance = currentBalance;
  let totalIncome = 0;
  let totalExpense = 0;
  let lowestBalance = currentBalance;
  let lowestBalanceDate = fromDate;
  let negativeBalanceDate: string | null = null;
  const points: CashFlowProjectionPoint[] = [];

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const date = addCashFlowDays(fromDate, offset);
    const planned = plannedByDate.get(date) ?? { expense: 0, income: 0 };
    const income = historicalIncome + planned.income;
    const expense = historicalExpense + planned.expense;
    const net = income - expense;
    balance += net;
    totalIncome += income;
    totalExpense += expense;

    if (balance < lowestBalance) {
      lowestBalance = balance;
      lowestBalanceDate = date;
    }
    if (balance < 0 && !negativeBalanceDate) negativeBalanceDate = date;

    points.push({
      balance,
      date,
      expense,
      historicalExpense,
      historicalIncome,
      income,
      net,
      plannedExpense: planned.expense,
      plannedIncome: planned.income,
    });
  }

  return {
    id,
    label: CASH_FLOW_SCENARIO_LABELS[id],
    projectedBalance: balance,
    totalIncome,
    totalExpense,
    netChange: balance - currentBalance,
    lowestBalance,
    lowestBalanceDate,
    negativeBalanceDate,
    points,
  };
}

export function buildCashFlowForecast({
  currentBalance,
  entries,
  expenses,
  horizonDays,
  plans,
  today,
}: {
  currentBalance: number;
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  horizonDays: number;
  plans: CashFlowPlan[];
  today: string;
}): CashFlowForecast {
  const safeHorizon = Math.min(Math.max(Math.round(horizonDays), 1), 180);
  const average7 = buildAverage({
    days: 7,
    entries,
    expenses,
    today,
  });
  const average30 = buildAverage({
    days: 30,
    entries,
    expenses,
    today,
  });
  const averageIncome = getWeightedAverage(
    average7.income,
    average30.income
  );
  const averageExpense = getWeightedAverage(
    average7.expense,
    average30.expense
  );
  const fromDate = addCashFlowDays(today, 1);
  const toDateValue = addCashFlowDays(fromDate, safeHorizon - 1);
  const scenarios = (
    ["conservative", "realistic", "optimistic"] as CashFlowScenarioId[]
  ).map((id) =>
    buildScenario({
      averageExpense,
      averageIncome,
      currentBalance,
      fromDate,
      horizonDays: safeHorizon,
      id,
      plans,
    })
  );
  const realistic = scenarios.find((scenario) => scenario.id === "realistic")!;
  const plannedIncome = realistic.points.reduce(
    (total, point) => total + point.plannedIncome,
    0
  );
  const plannedExpense = realistic.points.reduce(
    (total, point) => total + point.plannedExpense,
    0
  );
  const trendGap = average7.net - average30.net;
  const trendThreshold = Math.max(Math.abs(average30.net) * 0.08, 10_000);

  return {
    average7,
    average30,
    currentBalance,
    fromDate,
    horizonDays: safeHorizon,
    plannedExpense,
    plannedIncome,
    scenarios,
    toDate: toDateValue,
    trend:
      average7.income === 0 && average7.expense === 0
        ? "unknown"
        : Math.abs(trendGap) <= trendThreshold
          ? "stable"
          : trendGap > 0
            ? "improving"
            : "slowing",
  };
}
