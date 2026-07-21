import type { ExpenseBudget, ExpenseEntry } from "../../types";
import { getMonthStart, getToday } from "../../utils/date";
import { getExpenseTotal, getOtherExpenseItems } from "../../utils/entries";
import { formatMoney } from "../../utils/money";

export type ExpenseCategoryBreakdown = {
  label: string;
  percent: number;
  total: number;
};

export type ExpenseBudgetRow = ExpenseBudget & {
  percent: number;
  remaining: number;
  spent: number;
};

export function getDistinctExpenseDateCount(items: ExpenseEntry[]) {
  return new Set(items.map((item) => item.date)).size;
}

export function getTopExpense(items: ExpenseEntry[]) {
  return items.reduce<ExpenseEntry | null>((top, item) => (
    !top || getExpenseTotal(item) > getExpenseTotal(top) ? item : top
  ), null);
}

export function getPercent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export function formatSignedDifference(value: number) {
  if (value === 0) return formatMoney(0);
  return `${value > 0 ? "+" : "−"}${formatMoney(Math.abs(value))}`;
}

export function buildExpenseCategoryBreakdown(items: ExpenseEntry[], total: number): ExpenseCategoryBreakdown[] {
  const values = [
    { label: "Ăn sáng", total: items.reduce((sum, item) => sum + item.breakfast, 0) },
    { label: "Ăn trưa", total: items.reduce((sum, item) => sum + item.lunch, 0) },
    { label: "Ăn tối", total: items.reduce((sum, item) => sum + item.dinner, 0) },
    { label: "Khoản khác", total: items.reduce((sum, item) => sum + item.other, 0) },
  ];

  return values.map((item) => ({ ...item, percent: getPercent(item.total, total) }));
}

export function buildExpenseBudgetRows(budgets: ExpenseBudget[], expenses: ExpenseEntry[]): ExpenseBudgetRow[] {
  return budgets.map((budget) => {
    const spent = getMonthlySpentByBudgetLabel(budget.label, expenses);
    return {
      ...budget,
      spent,
      remaining: budget.monthlyLimit - spent,
      percent: getPercent(spent, budget.monthlyLimit),
    };
  });
}

function getMonthlySpentByBudgetLabel(label: string, expenses: ExpenseEntry[]) {
  const monthStart = getMonthStart();
  const today = getToday();

  return expenses
    .filter((expense) => expense.date >= monthStart && expense.date <= today)
    .reduce((sum, expense) => {
      if (label.trim() === "Ăn uống") {
        return sum + expense.breakfast + expense.lunch + expense.dinner;
      }

      return sum + getOtherExpenseItems(expense)
        .filter((item) => item.label === label.trim())
        .reduce((itemSum, item) => itemSum + item.amount, 0);
    }, 0);
}
