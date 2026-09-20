import type { DailyEntry, ExpenseEntry } from "../../../types.ts";

export type ManagerMonthlyOverview = {
  expense: number;
  income: number;
  net: number;
  savingsRate: number | null;
  topExpense: { amount: number; label: string } | null;
};

const unlabeledExpense = "Khác chưa gắn nhãn";

function entryIncome(entry: DailyEntry) {
  return (entry.income ?? 0) + (entry.bonusMoney ?? 0) + (entry.receivedMoney ?? 0);
}

function expenseTotal(expense: ExpenseEntry) {
  return expense.breakfast + expense.lunch + expense.dinner + expense.other;
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
  selectedDate: string
): ManagerMonthlyOverview {
  const month = selectedDate.slice(0, 7);
  const monthEntries = entries.filter((entry) => entry.date.startsWith(month));
  const monthExpenses = expenses.filter((expense) => expense.date.startsWith(month));
  const income = monthEntries.reduce((total, entry) => total + entryIncome(entry), 0);
  const expense = monthExpenses.reduce((total, item) => total + expenseTotal(item), 0);
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

  const topExpenseEntry = [...categories.entries()].sort((left, right) => right[1] - left[1])[0];
  const net = income - expense;

  return {
    expense,
    income,
    net,
    savingsRate: income > 0 ? Math.round((net / income) * 100) : null,
    topExpense: topExpenseEntry
      ? { label: topExpenseEntry[0], amount: topExpenseEntry[1] }
      : null,
  };
}
