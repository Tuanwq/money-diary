import type { DailyEntry, ExpenseBudget, ExpenseEntry } from "../../types";

export const CASH_FLOW_STORAGE_KEY = "money_diary_cash_flow_state";

export type CashFlowPlanType = "income" | "expense";
export type CashFlowRecurrence = "once" | "weekly" | "monthly";
export type CashFlowScenarioId =
  | "conservative"
  | "realistic"
  | "optimistic";

export type CashFlowPlan = {
  accountId?: string;
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
  budgetEnvelope: number;
  date: string;
  expense: number;
  goalReserve: number;
  historicalExpense: number;
  historicalIncome: number;
  income: number;
  lostIncome: number;
  net: number;
  plannedExpense: number;
  plannedIncome: number;
  simulationExpense: number;
  simulationIncome: number;
};

export type CashFlowGoalCommitment = {
  deadline: string;
  id: string;
  label: string;
  remaining: number;
  type: "main" | "sub";
};

export type CashFlowBudgetEnvelope = {
  id: string;
  label: string;
  monthlyLimit: number;
  remaining: number;
  spent: number;
};

export type CashFlowAccountBalance = {
  balance: number;
  id: string;
  name: string;
};

export type CashFlowAccountProjection = CashFlowAccountBalance & {
  plannedChange: number;
  projectedBalance: number;
};

type CashFlowSimulationAdjustmentBase = {
  id: string;
  label: string;
};

export type CashFlowSimulationRestAdjustment =
  CashFlowSimulationAdjustmentBase & {
    days: number;
    startDate: string;
    type: "rest";
  };

export type CashFlowSimulationOneTimeAdjustment =
  CashFlowSimulationAdjustmentBase & {
    accountId?: string;
    amount: number;
    date: string;
  } & (
      | { type: "expense" }
      | { type: "income" }
    );

export type CashFlowSimulationDailyAdjustment =
  CashFlowSimulationAdjustmentBase & {
    accountId?: string;
    amount: number;
    endDate: string;
    startDate: string;
  } & (
      | { type: "daily_expense" }
      | { type: "daily_income" }
    );

export type CashFlowSimulationAdjustment =
  | CashFlowSimulationRestAdjustment
  | CashFlowSimulationOneTimeAdjustment
  | CashFlowSimulationDailyAdjustment;

export type CashFlowSimulationInput = {
  adjustments: CashFlowSimulationAdjustment[];
};

export type CashFlowSimulationResult = CashFlowScenario & {
  appliedAdjustmentCount: number;
  baselineDifference: number;
  extraExpense: number;
  extraIncome: number;
  lostIncome: number;
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
  budgetEnvelopes: CashFlowBudgetEnvelope[];
  fromDate: string;
  goalCommitments: CashFlowGoalCommitment[];
  horizonDays: number;
  plannedExpense: number;
  plannedIncome: number;
  scenarios: CashFlowScenario[];
  totalBudgetEnvelope: number;
  totalGoalReserve: number;
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

function getDaysBetween(fromDate: string, toDateValue: string) {
  return Math.round(
    (toDate(toDateValue).getTime() - toDate(fromDate).getTime()) / 86_400_000
  );
}

function getDaysInMonth(dateString: string) {
  const date = toDate(dateString);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 12).getDate();
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

function getExpenseItems(expense: ExpenseEntry) {
  const savedItems =
    expense.otherItems?.filter((item) => item.amount > 0) ?? [];

  if (savedItems.length > 0) return savedItems;
  if (expense.other <= 0) return [];

  return [
    {
      amount: expense.other,
      label: expense.otherLabel?.trim() || "Chưa gắn nhãn",
    },
  ];
}

function getBudgetSpent(
  budget: ExpenseBudget,
  expenses: ExpenseEntry[],
  today: string
) {
  const monthKey = today.slice(0, 7);
  const normalizedLabel = budget.label.trim().toLocaleLowerCase("vi-VN");

  return expenses
    .filter(
      (expense) =>
        expense.date.startsWith(monthKey) && expense.date <= today
    )
    .reduce((total, expense) => {
      if (normalizedLabel === "ăn uống") {
        return (
          total + expense.breakfast + expense.lunch + expense.dinner
        );
      }

      return (
        total +
        getExpenseItems(expense)
          .filter(
            (item) =>
              item.label.trim().toLocaleLowerCase("vi-VN") ===
              normalizedLabel
          )
          .reduce((sum, item) => sum + item.amount, 0)
      );
    }, 0);
}

export function buildCashFlowBudgetEnvelopes({
  budgets,
  expenses,
  today,
}: {
  budgets: ExpenseBudget[];
  expenses: ExpenseEntry[];
  today: string;
}): CashFlowBudgetEnvelope[] {
  return budgets
    .filter((budget) => budget.monthlyLimit > 0)
    .map((budget) => {
      const spent = getBudgetSpent(budget, expenses, today);

      return {
        id: budget.id,
        label: budget.label,
        monthlyLimit: budget.monthlyLimit,
        remaining: Math.max(budget.monthlyLimit - spent, 0),
        spent,
      };
    });
}

function buildBudgetEnvelopeByDate({
  budgetEnvelopes,
  fromDate,
  horizonDays,
  today,
}: {
  budgetEnvelopes: CashFlowBudgetEnvelope[];
  fromDate: string;
  horizonDays: number;
  today: string;
}) {
  const currentMonth = today.slice(0, 7);
  const currentMonthRemainingDays = Math.max(
    getDaysInMonth(today) - Number(today.slice(8, 10)),
    1
  );
  const values = new Map<string, number>();

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const date = addCashFlowDays(fromDate, offset);
    const amount = budgetEnvelopes.reduce((total, budget) => {
      const monthlyAmount =
        date.slice(0, 7) === currentMonth
          ? budget.remaining
          : budget.monthlyLimit;
      const divisor =
        date.slice(0, 7) === currentMonth
          ? currentMonthRemainingDays
          : getDaysInMonth(date);

      return total + Math.round(monthlyAmount / Math.max(divisor, 1));
    }, 0);

    values.set(date, amount);
  }

  return values;
}

function buildGoalReserveByDate({
  commitments,
  fromDate,
  horizonDays,
}: {
  commitments: CashFlowGoalCommitment[];
  fromDate: string;
  horizonDays: number;
}) {
  const values = new Map<string, number>();

  commitments
    .filter((commitment) => commitment.remaining > 0)
    .forEach((commitment) => {
      const daysUntilDeadline = getDaysBetween(
        fromDate,
        commitment.deadline
      );
      const availableDays = Math.max(daysUntilDeadline + 1, 1);
      const coveredDays = Math.min(availableDays, horizonDays);
      const baseAmount = Math.floor(commitment.remaining / availableDays);
      const remainder = commitment.remaining % availableDays;

      for (let offset = 0; offset < coveredDays; offset += 1) {
        const date = addCashFlowDays(fromDate, offset);
        const amount =
          daysUntilDeadline < 0
            ? commitment.remaining
            : baseAmount + (offset < remainder ? 1 : 0);

        values.set(date, (values.get(date) ?? 0) + amount);
      }
    });

  return values;
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
  budgetEnvelopeByDate,
  currentBalance,
  fromDate,
  goalReserveByDate,
  horizonDays,
  id,
  plans,
}: {
  averageExpense: number;
  averageIncome: number;
  budgetEnvelopeByDate: Map<string, number>;
  currentBalance: number;
  fromDate: string;
  goalReserveByDate: Map<string, number>;
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
    const budgetEnvelope = budgetEnvelopeByDate.get(date) ?? 0;
    const goalReserve = goalReserveByDate.get(date) ?? 0;
    const operatingExpense = Math.max(
      historicalExpense,
      budgetEnvelope
    );
    const income = historicalIncome + planned.income;
    const expense = operatingExpense + planned.expense + goalReserve;
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
      budgetEnvelope,
      date,
      expense,
      goalReserve,
      historicalExpense,
      historicalIncome,
      income,
      lostIncome: 0,
      net,
      plannedExpense: planned.expense,
      plannedIncome: planned.income,
      simulationExpense: 0,
      simulationIncome: 0,
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
  budgets = [],
  currentBalance,
  entries,
  expenses,
  goalCommitments = [],
  horizonDays,
  plans,
  today,
}: {
  budgets?: ExpenseBudget[];
  currentBalance: number;
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  goalCommitments?: CashFlowGoalCommitment[];
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
  const budgetEnvelopes = buildCashFlowBudgetEnvelopes({
    budgets,
    expenses,
    today,
  });
  const budgetEnvelopeByDate = buildBudgetEnvelopeByDate({
    budgetEnvelopes,
    fromDate,
    horizonDays: safeHorizon,
    today,
  });
  const goalReserveByDate = buildGoalReserveByDate({
    commitments: goalCommitments,
    fromDate,
    horizonDays: safeHorizon,
  });
  const scenarios = (
    ["conservative", "realistic", "optimistic"] as CashFlowScenarioId[]
  ).map((id) =>
    buildScenario({
      averageExpense,
      averageIncome,
      budgetEnvelopeByDate,
      currentBalance,
      fromDate,
      goalReserveByDate,
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
  const totalBudgetEnvelope = realistic.points.reduce(
    (total, point) => total + point.budgetEnvelope,
    0
  );
  const totalGoalReserve = realistic.points.reduce(
    (total, point) => total + point.goalReserve,
    0
  );

  return {
    average7,
    average30,
    budgetEnvelopes,
    currentBalance,
    fromDate,
    goalCommitments,
    horizonDays: safeHorizon,
    plannedExpense,
    plannedIncome,
    scenarios,
    totalBudgetEnvelope,
    totalGoalReserve,
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

export function buildCashFlowSimulation(
  baseline: CashFlowScenario,
  currentBalance: number,
  input: CashFlowSimulationInput
): CashFlowSimulationResult {
  const forecastDates = new Set(baseline.points.map((point) => point.date));
  const restDates = new Set<string>();
  let appliedAdjustmentCount = 0;

  input.adjustments.forEach((adjustment) => {
    if (adjustment.type === "rest") {
      const safeDays = Math.max(Math.round(adjustment.days), 0);
      let hasDateInForecast = false;

      for (let offset = 0; offset < safeDays; offset += 1) {
        const date = addCashFlowDays(adjustment.startDate, offset);

        if (forecastDates.has(date)) {
          restDates.add(date);
          hasDateInForecast = true;
        }
      }

      if (hasDateInForecast) appliedAdjustmentCount += 1;
      return;
    }

    if (adjustment.amount <= 0) return;

    if (adjustment.type === "income" || adjustment.type === "expense") {
      if (forecastDates.has(adjustment.date)) appliedAdjustmentCount += 1;
      return;
    }

    if (
      baseline.points.some(
        (point) =>
          point.date >= adjustment.startDate &&
          point.date <= adjustment.endDate
      )
    ) {
      appliedAdjustmentCount += 1;
    }
  });

  let balance = currentBalance;
  let totalIncome = 0;
  let totalExpense = 0;
  let lostIncome = 0;
  let extraExpense = 0;
  let extraIncome = 0;
  let lowestBalance = currentBalance;
  let lowestBalanceDate = baseline.points[0]?.date ?? "";
  let negativeBalanceDate: string | null = null;
  const points = baseline.points.map((point) => {
    const dailyLostIncome = restDates.has(point.date)
      ? point.historicalIncome
      : 0;
    const simulationIncome = input.adjustments.reduce(
      (total, adjustment) => {
        if (adjustment.type === "rest" || adjustment.amount <= 0) {
          return total;
        }
        if (adjustment.type === "income" && adjustment.date === point.date) {
          return total + adjustment.amount;
        }
        if (
          adjustment.type === "daily_income" &&
          point.date >= adjustment.startDate &&
          point.date <= adjustment.endDate
        ) {
          return total + adjustment.amount;
        }

        return total;
      },
      0
    );
    const simulationExpense = input.adjustments.reduce(
      (total, adjustment) => {
        if (adjustment.type === "rest" || adjustment.amount <= 0) {
          return total;
        }
        if (adjustment.type === "expense" && adjustment.date === point.date) {
          return total + adjustment.amount;
        }
        if (
          adjustment.type === "daily_expense" &&
          point.date >= adjustment.startDate &&
          point.date <= adjustment.endDate
        ) {
          return total + adjustment.amount;
        }

        return total;
      },
      0
    );

    lostIncome += dailyLostIncome;
    extraIncome += simulationIncome;
    extraExpense += simulationExpense;

    const income = point.income - dailyLostIncome + simulationIncome;
    const expense = point.expense + simulationExpense;
    const net = income - expense;
    balance += net;
    totalIncome += income;
    totalExpense += expense;

    if (balance < lowestBalance) {
      lowestBalance = balance;
      lowestBalanceDate = point.date;
    }
    if (balance < 0 && !negativeBalanceDate) negativeBalanceDate = point.date;

    return {
      ...point,
      balance,
      expense,
      income,
      lostIncome: dailyLostIncome,
      net,
      simulationExpense,
      simulationIncome,
    };
  });

  return {
    appliedAdjustmentCount,
    baselineDifference: balance - baseline.projectedBalance,
    extraExpense,
    extraIncome,
    id: baseline.id,
    label: `${baseline.label} có thử nghiệm`,
    lostIncome,
    lowestBalance,
    lowestBalanceDate,
    negativeBalanceDate,
    netChange: balance - currentBalance,
    points,
    projectedBalance: balance,
    totalExpense,
    totalIncome,
  };
}

export function buildCashFlowAccountProjections({
  accounts,
  fromDate,
  plans,
  simulationAdjustments = [],
  toDate: toDateValue,
}: {
  accounts: CashFlowAccountBalance[];
  fromDate: string;
  plans: CashFlowPlan[];
  simulationAdjustments?: CashFlowSimulationAdjustment[];
  toDate: string;
}): CashFlowAccountProjection[] {
  return accounts.map((account) => {
    const planChange = plans
      .filter((plan) => plan.accountId === account.id)
      .reduce((total, plan) => {
        const occurrences = getCashFlowPlanOccurrences(
          plan,
          fromDate,
          toDateValue
        ).length;
        const amount = plan.amount * occurrences;

        return total + (plan.type === "income" ? amount : -amount);
      }, 0);
    const simulationChange = simulationAdjustments.reduce(
      (total, adjustment) => {
        if (
          adjustment.type === "rest" ||
          adjustment.accountId !== account.id ||
          adjustment.amount <= 0
        ) {
          return total;
        }

        if (adjustment.type === "income" || adjustment.type === "expense") {
          if (
            adjustment.date < fromDate ||
            adjustment.date > toDateValue
          ) {
            return total;
          }

          return (
            total +
            (adjustment.type === "income"
              ? adjustment.amount
              : -adjustment.amount)
          );
        }

        const firstDate =
          adjustment.startDate > fromDate
            ? adjustment.startDate
            : fromDate;
        const lastDate =
          adjustment.endDate < toDateValue
            ? adjustment.endDate
            : toDateValue;
        const occurrences =
          lastDate < firstDate ? 0 : getDaysBetween(firstDate, lastDate) + 1;
        const amount = adjustment.amount * occurrences;

        return (
          total +
          (adjustment.type === "daily_income" ? amount : -amount)
        );
      },
      0
    );
    const plannedChange = planChange + simulationChange;

    return {
      ...account,
      plannedChange,
      projectedBalance: account.balance + plannedChange,
    };
  });
}
