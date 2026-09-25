import type { DailyEntry, ExpenseEntry } from "../../../types.ts";
import type { AccountTransaction } from "../../account-ledger/accountLedgerModel.ts";
import { getDailyFinancialSummary, buildDailyFinancialSummaries } from "../../photo-finance/services/photoFinanceModel.ts";
import { groupFinancialExpensesByCategory, summarizeFinancialTransactions } from "../../finance-core/services/financialMetrics.ts";

export type ManagerMonthlyOverview = {
  expense: number;
  income: number;
  net: number;
  savingsRate: number | null;
  topExpense: { amount: number; label: string } | null;
};

export function buildManagerMonthlyOverview(
  entries: DailyEntry[], expenses: ExpenseEntry[], selectedDate: string,
  transactions: AccountTransaction[] = [],
): ManagerMonthlyOverview {
  return buildManagerOverview(entries, expenses, selectedDate, transactions).month;
}

export function buildManagerOverview(
  entries: DailyEntry[], expenses: ExpenseEntry[], selectedDate: string,
  transactions: AccountTransaction[] = [],
) {
  const days = buildDailyFinancialSummaries(entries, expenses, transactions);
  const month = selectedDate.slice(0, 7);
  const lastDate = `${month}-31`;
  const totals = summarizeFinancialTransactions(transactions, { fromDate: `${month}-01`, toDate: lastDate });
  const topExpense = groupFinancialExpensesByCategory(transactions, {
    fromDate: `${month}-01`, toDate: lastDate,
  })[0];
  const monthly: ManagerMonthlyOverview = {
    expense: totals.expense,
    income: totals.income,
    net: totals.net,
    savingsRate: totals.income > 0 ? Math.round((totals.net / totals.income) * 100) : null,
    topExpense: topExpense ? { label: topExpense.name, amount: topExpense.value } : null,
  };
  return { day: getDailyFinancialSummary(days, selectedDate), month: monthly };
}

export type ManagerRecentTransaction = {
  amount: number;
  date: string;
  description: string;
  id: string;
  kind: "expense" | "income";
  source: string;
};

export function buildManagerRecentTransactions(
  _entries: DailyEntry[], _expenses: ExpenseEntry[], transactions: AccountTransaction[] = [],
): ManagerRecentTransaction[] {
  return transactions.filter((item) => item.type !== "transfer")
    .map((item) => ({
      amount: item.amount, date: item.date,
      description: item.note.trim() || item.category,
      id: `ledger-${item.id}`, kind: item.type as "income" | "expense",
      source: item.source === "photo_finance" ? "Nhật ký tài chính" : "Sổ tài khoản",
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);
}
