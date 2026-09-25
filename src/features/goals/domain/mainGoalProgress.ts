import type { AccountTransaction } from "../../account-ledger/accountLedgerModel.ts";
import type { BalanceSnapshot, DailyEntry, ExpenseEntry, Goals } from "../../../types.ts";

export type MainGoalProgressSummary = {
  initialAmount: number;
  achievedAmount: number;
  endDate: string;
  goalExpenses: number;
  goalIncome: number;
  goalNetAmount: number;
  progress: number;
  remainingAmount: number;
  remainingDays: number;
  requiredPerDay: number;
  startDate: string;
  targetAmount: number;
  unclassifiedTransactions: number;
};

type MainGoalProgressInput = {
  asOfDate: string;
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  goals: Goals;
  transactions: AccountTransaction[];
};

function isInsideGoal(date: string, startDate: string, endDate: string) {
  return date >= startDate && date <= endDate;
}

export function getGoalAffectingExpense(expense: ExpenseEntry) {
  const mealExpense = expense.breakfast + expense.lunch + expense.dinner;
  const savedItems = expense.otherItems?.filter((item) => item.amount > 0) ?? [];
  const otherExpense = savedItems.length > 0
    ? savedItems
        .filter((item) => item.purpose !== "goal_allocation")
        .reduce((sum, item) => sum + item.amount, 0)
    : expense.other;

  return mealExpense + otherExpense;
}

function getRemainingDays(deadline: string, asOfDate: string) {
  const end = new Date(`${deadline}T00:00:00`);
  const current = new Date(`${asOfDate}T00:00:00`);
  if (Number.isNaN(end.getTime()) || Number.isNaN(current.getTime())) return 0;
  return Math.max(Math.ceil((end.getTime() - current.getTime()) / 86_400_000), 0);
}

export function buildMainGoalProgress({
  asOfDate,
  goals,
  transactions,
}: MainGoalProgressInput): MainGoalProgressSummary {
  const startDate = goals.bigGoalStartDate || asOfDate;
  const deadline = goals.bigGoalDeadline || asOfDate;
  const endDate = asOfDate < deadline ? asOfDate : deadline;
  const targetAmount = Math.max(goals.bigGoalTarget ?? 0, 0);
  const goalTransactions = transactions.filter((item) =>
    isInsideGoal(item.date, startDate, endDate)
  );
  const transactionIncome = goalTransactions
    .filter((item) => item.type === "income" && item.purpose === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const transactionExpenses = goalTransactions
    .filter((item) => item.type === "expense" && item.purpose === "daily_expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const unclassifiedTransactions = goalTransactions.filter(
    (item) => item.type !== "transfer" && !item.purpose
  ).length;
  const goalIncome = transactionIncome;
  const goalExpenses = transactionExpenses;
  const goalNetAmount = goalIncome - goalExpenses;
  // Money earned before this recorded journey is an opening goal amount,
  // independent of the live balances in Account Ledger.
  const initialAmount = Math.max(goals.bigGoalSaved ?? 0, 0);
  const achievedAmount = initialAmount + goalNetAmount;
  const progress = targetAmount > 0
    ? Math.min(Math.max(Math.round((achievedAmount / targetAmount) * 100), 0), 100)
    : 0;
  const remainingAmount = Math.max(targetAmount - achievedAmount, 0);
  const remainingDays = getRemainingDays(deadline, asOfDate);
  const requiredPerDay = remainingAmount > 0
    ? Math.ceil(remainingAmount / Math.max(remainingDays, 1))
    : 0;

  return {
    initialAmount,
    achievedAmount,
    endDate: deadline,
    goalExpenses,
    goalIncome,
    goalNetAmount,
    progress,
    remainingAmount,
    remainingDays,
    requiredPerDay,
    startDate,
    targetAmount,
    unclassifiedTransactions,
  };
}

export function buildMainGoalProgressTimeline(input: MainGoalProgressInput): BalanceSnapshot[] {
  const startDate = input.goals.bigGoalStartDate || input.asOfDate;
  const deadline = input.goals.bigGoalDeadline || input.asOfDate;
  const endDate = input.asOfDate < deadline ? input.asOfDate : deadline;
  if (startDate > endDate) return [];

  const snapshots: BalanceSnapshot[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const lastDate = new Date(`${endDate}T00:00:00`);
  let previousIncome = 0;
  let previousExpense = 0;

  while (cursor <= lastDate) {
    const date = [
      cursor.getFullYear(),
      String(cursor.getMonth() + 1).padStart(2, "0"),
      String(cursor.getDate()).padStart(2, "0"),
    ].join("-");
    const summary = buildMainGoalProgress({ ...input, asOfDate: date });
    snapshots.push({
      actualMoney: summary.achievedAmount,
      date,
      expense: summary.goalExpenses - previousExpense,
      income: summary.goalIncome - previousIncome,
      totalMoney: summary.initialAmount + summary.goalIncome,
    });
    previousIncome = summary.goalIncome;
    previousExpense = summary.goalExpenses;
    cursor.setDate(cursor.getDate() + 1);
  }

  return snapshots;
}
