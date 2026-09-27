import type { AccountTransaction } from "../account-ledger/accountLedgerModel";
import type { ExpenseEntry } from "../../types";
import { getExpenseTotal, getOtherExpenseItems, type OtherExpenseBreakdownItem } from "../../utils/entries.ts";
import { getReportingTransactions } from "../analytics/reportingTransactions.ts";
import { getPercent, type ExpenseCategoryBreakdown } from "./historySelectors.ts";

export function filterHistoryLedgerTransactions(
  transactions: AccountTransaction[],
  options: { fromDate: string; toDate: string; search: string; category?: string; type?: AccountTransaction["type"] }
) {
  const search = options.search.trim().toLocaleLowerCase("vi-VN");
  return getReportingTransactions(transactions)
    .filter((transaction) => {
      if (options.type && transaction.type !== options.type) return false;
      if (options.fromDate && transaction.date < options.fromDate) return false;
      if (options.toDate && transaction.date > options.toDate) return false;
      if (options.category && transaction.category !== options.category) return false;
      return !search || [transaction.date, transaction.category, transaction.note]
        .some((value) => value.toLocaleLowerCase("vi-VN").includes(search));
    })
    .sort((a, b) => b.date.localeCompare(a.date) ||
      (b.occurredAt ?? b.createdAt).localeCompare(a.occurredAt ?? a.createdAt));
}

export function buildCombinedExpenseReport(
  expenses: ExpenseEntry[],
  transactions: AccountTransaction[]
) {
  const categoryTotals = new Map<string, number>();
  const labelTotals = new Map<string, OtherExpenseBreakdownItem>();
  const dayTotals = new Map<string, number>();
  const addCategory = (label: string, amount: number) => {
    if (amount <= 0) return;
    categoryTotals.set(label, (categoryTotals.get(label) ?? 0) + amount);
  };
  const addLabel = (label: string, amount: number) => {
    if (amount <= 0) return;
    const previous = labelTotals.get(label) ?? { label, total: 0, count: 0 };
    labelTotals.set(label, { label, total: previous.total + amount, count: previous.count + 1 });
  };
  const addDay = (date: string, amount: number) =>
    dayTotals.set(date, (dayTotals.get(date) ?? 0) + amount);

  for (const expense of expenses) {
    addDay(expense.date, getExpenseTotal(expense));
    addCategory("Ăn sáng", expense.breakfast);
    addCategory("Ăn trưa", expense.lunch);
    addCategory("Ăn tối", expense.dinner);
    addCategory("Khoản khác", expense.other);
    for (const item of getOtherExpenseItems(expense)) addLabel(item.label, item.amount);
  }
  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;
    addDay(transaction.date, transaction.amount);
    const label = transaction.category.trim() || "Chưa phân loại";
    addCategory(label, transaction.amount);
    addLabel(label, transaction.amount);
  }
  const total = [...dayTotals.values()].reduce((sum, value) => sum + value, 0);
  const topDay = [...dayTotals].sort((a, b) => b[1] - a[1])[0] ?? null;
  const categories: ExpenseCategoryBreakdown[] = [...categoryTotals]
    .map(([label, amount]) => ({ label, total: amount, percent: getPercent(amount, total) }))
    .sort((a, b) => b.total - a.total);
  const labels = [...labelTotals.values()].sort((a, b) => b.total - a.total);
  return { categories, dayCount: dayTotals.size, labels, labelsTotal: labels.reduce((sum, item) => sum + item.total, 0), topDay, total };
}
