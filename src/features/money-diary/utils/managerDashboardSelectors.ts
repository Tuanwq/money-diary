import type { DailyEntry, ExpenseEntry } from "../../../types.ts";
import { isExpenseReversal, type AccountTransaction } from "../../account-ledger/accountLedgerModel.ts";
import { buildDailyFinancialSummaries, getDailyFinancialSummary, vietnamFinancialDate } from "../../photo-finance/services/photoFinanceModel.ts";
import type { DailyFinancialSummary } from "../../photo-finance/types/photoFinance.ts";
import type { JarActivity } from "../../spending-jars/domain/jarModel.ts";
import { isIndependentReportingTransaction } from "../../analytics/reportingTransactions.ts";
import { getExpenseTotal, getTotalEntryMoney } from "../../../utils/entries.ts";

export type ManagerMonthlyOverview = {
  expense: number;
  income: number;
  net: number;
  savingsRate: number | null;
  topExpense: { amount: number; label: string } | null;
};

const unlabeledExpense = "Khác chưa gắn nhãn";

/** Jar movements are reservations, never income or expense. Cash flow stays
 * aligned with the same daily summary used by the overview and journal. */
export function buildDashboardJarFlow(
  day: DailyFinancialSummary,
  transactions: AccountTransaction[],
  activities: JarActivity[],
) {
  const activityById = new Map(activities.map((activity) => [activity.id, activity]));
  const journalTransactions = transactions.filter((transaction) =>
    transaction.date === day.date && isIndependentReportingTransaction(transaction));
  const jarSpending = journalTransactions.reduce((sum, transaction) => {
    const activity = transaction.jarActivityId && activityById.get(transaction.jarActivityId);
    if (!activity || activity.jarId !== transaction.jarId ||
      !activity.transactionIds?.includes(transaction.id)) return sum;
    if (activity.kind === "spend" && transaction.type === "expense") return sum + transaction.amount;
    if (activity.kind === "refund" && isExpenseReversal(transaction)) return sum - transaction.amount;
    return sum;
  }, 0);
  // A normal income may be directly tagged to a jar in future data. Existing
  // allocation events cannot identify which earlier income funded them.
  const incomeLinkedToJar = journalTransactions.reduce((sum, transaction) =>
    sum + (transaction.type === "income" && !isExpenseReversal(transaction) &&
      transaction.jarId ? transaction.amount : 0), 0);
  const movements = activities.filter((activity) => {
    const createdAt = new Date(activity.createdAt);
    return !Number.isNaN(createdAt.getTime()) && vietnamFinancialDate(createdAt) === day.date;
  });
  const sumMovement = (kind: JarActivity["kind"]) => movements.reduce((sum, activity) =>
    sum + (activity.kind === kind ? activity.amount ?? 0 : 0), 0);

  return {
    incomeNotLinkedToJar: day.income - incomeLinkedToJar,
    incomeLinkedToJar,
    expenseOutsideJar: day.expense - jarSpending,
    expenseFromJar: jarSpending,
    allocatedToJar: sumMovement("allocate"),
    releasedFromJar: sumMovement("release"),
    transferredBetweenJars: sumMovement("transfer_out"),
  };
}

function otherExpenses(expense: ExpenseEntry) {
  const savedItems = (expense.otherItems ?? [])
    .filter((item) => item.amount > 0)
    .map((item) => ({
      amount: item.amount,
      label: item.label?.trim() || unlabeledExpense,
    }));

  if (savedItems.length > 0) return savedItems;
  if (expense.other <= 0) return [];
  return [{ amount: expense.other, label: expense.otherLabel?.trim() || unlabeledExpense }];
}

export function buildManagerMonthlyOverview(
  entries: DailyEntry[],
  expenses: ExpenseEntry[],
  selectedDate: string,
  transactions: AccountTransaction[] = [],
): ManagerMonthlyOverview {
  return buildManagerOverview(entries, expenses, selectedDate, transactions).month;
}

/** Cash flow includes every recorded expense, irrespective of its goal purpose.
 * Share the journal's legacy/photo source rules to avoid omissions or duplicates. */
export function buildManagerOverview(
  entries: DailyEntry[],
  expenses: ExpenseEntry[],
  selectedDate: string,
  transactions: AccountTransaction[] = [],
) {
  const days = buildDailyFinancialSummaries(entries, expenses, transactions);
  const month = selectedDate.slice(0, 7);
  const monthExpenses = expenses.filter((expense) => expense.date.startsWith(month));
  const monthDays = [...days.values()].filter((day) => day.date.startsWith(month));
  const income = monthDays.reduce((total, day) => total + day.income, 0);
  const expense = monthDays.reduce((total, day) => total + day.expense, 0);
  const categories = new Map<string, number>();

  function addCategory(label: string, amount: number) {
    if (amount <= 0) return;
    categories.set(label, (categories.get(label) ?? 0) + amount);
  }

  monthExpenses.forEach((item) => {
    addCategory("Ăn sáng", item.breakfast);
    addCategory("Ăn trưa", item.lunch);
    addCategory("Ăn tối", item.dinner);
    otherExpenses(item).forEach((other) => addCategory(other.label, other.amount));
  });
  transactions.filter((item) => (item.source === "photo_finance" || item.source === "spending_jar") &&
    item.type === "expense" && item.date.startsWith(month))
    .forEach((item) => addCategory(item.category.trim() || unlabeledExpense, item.amount));

  const topExpenseEntry = [...categories.entries()].sort((left, right) => right[1] - left[1])[0];
  const net = income - expense;

  const monthly: ManagerMonthlyOverview = {
    expense,
    income,
    net,
    savingsRate: income > 0 ? Math.round((net / income) * 100) : null,
    topExpense: topExpenseEntry
      ? { label: topExpenseEntry[0], amount: topExpenseEntry[1] }
      : null,
  };
  return { day: getDailyFinancialSummary(days, selectedDate), month: monthly };
}

export type ManagerRecentTransaction = {
  amount: number;
  date: string;
  description: string;
  id: string;
  kind: "expense" | "income" | "refund";
  source: string;
};

export function buildManagerRecentTransactions(
  entries: DailyEntry[], expenses: ExpenseEntry[], transactions: AccountTransaction[] = [],
): ManagerRecentTransaction[] {
  return [
    ...entries.map((entry) => ({
      amount: getTotalEntryMoney(entry), date: entry.date,
      description: entry.diary.trim() || entry.note.trim() || "Thu nhập trong ngày",
      id: `income-${entry.id}`, kind: "income" as const, source: "Nhật ký / Hub",
    })),
    ...expenses.map((expense) => ({
      amount: getExpenseTotal(expense), date: expense.date,
      description: expense.note.trim() || "Chi tiêu trong ngày",
      id: `expense-${expense.id}`, kind: "expense" as const, source: "Chi tiêu",
    })),
    ...transactions.filter((item) => (item.source === "photo_finance" || item.source === "spending_jar") && item.type !== "transfer")
      .map((item) => ({
        amount: item.amount, date: item.date, description: item.note.trim() || item.category,
        id: `ledger-${item.id}`, kind: isExpenseReversal(item) ? "refund" as const :
          item.type as "income" | "expense", source: "Nhật ký tài chính",
      })),
  ].filter((item) => item.amount > 0)
    .sort((a, b) => b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind))
    .slice(0, 6);
}
