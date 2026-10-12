import type { AccountTransaction } from "../account-ledger/accountLedgerModel.ts";
import type { DailyEntry, ExpenseEntry } from "../../types.ts";
import { getExpenseTotal, getOtherExpenseItems } from "../../utils/entries.ts";
import { isIndependentReportingTransaction } from "./reportingTransactions.ts";

export type AnalyticsDataQuality = {
  legacyIncome: number;
  legacyExpense: number;
  transactionIncome: number;
  transactionExpense: number;
  omittedTransactions: number;
  omittedAmount: number;
  unclassifiedPurpose: number;
  unclassifiedPurposeAmount: number;
  possibleOverlaps: number;
  possibleOverlapAmount: number;
};

type Range = { fromDate: string; toDate: string };

function inRange(date: string, range: Range) {
  return date >= range.fromDate && date <= range.toDate;
}

function normalizeCategory(label: string) {
  const value = label.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("vi-VN");
  return ["an sang", "an trua", "an toi", "an uong"].includes(value)
    ? "an uong" : value;
}

function overlapKey(date: string, type: "income" | "expense", amount: number, label: string) {
  return `${date}:${type}:${amount}:${normalizeCategory(label)}`;
}

/** Diagnostic only: no candidate is automatically removed from financial totals. */
export function buildAnalyticsDataQuality(input: {
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  transactions: AccountTransaction[];
  range: Range;
}): AnalyticsDataQuality {
  const result: AnalyticsDataQuality = {
    legacyIncome: 0, legacyExpense: 0, transactionIncome: 0,
    transactionExpense: 0, omittedTransactions: 0, omittedAmount: 0,
    unclassifiedPurpose: 0, unclassifiedPurposeAmount: 0,
    possibleOverlaps: 0, possibleOverlapAmount: 0,
  };
  const legacyKeys = new Set<string>();
  const addLegacy = (date: string, type: "income" | "expense", amount: number, label: string) => {
    if (amount <= 0) return;
    legacyKeys.add(overlapKey(date, type, amount, label));
  };

  for (const entry of input.entries) {
    if (!inRange(entry.date, input.range)) continue;
    result.legacyIncome += (entry.income ?? 0) + (entry.bonusMoney ?? 0) + (entry.receivedMoney ?? 0);
    addLegacy(entry.date, "income", entry.income ?? 0, "Thu nhập");
    addLegacy(entry.date, "income", entry.bonusMoney ?? 0, "Tiền thưởng");
    addLegacy(entry.date, "income", entry.receivedMoney ?? 0, "Tiền nhận");
  }
  for (const expense of input.expenses) {
    if (!inRange(expense.date, input.range)) continue;
    result.legacyExpense += getExpenseTotal(expense);
    addLegacy(expense.date, "expense", expense.breakfast, "Ăn sáng");
    addLegacy(expense.date, "expense", expense.lunch, "Ăn trưa");
    addLegacy(expense.date, "expense", expense.dinner, "Ăn tối");
    for (const item of getOtherExpenseItems(expense))
      addLegacy(expense.date, "expense", item.amount, item.label);
  }
  for (const transaction of input.transactions) {
    if (!inRange(transaction.date, input.range) || transaction.type === "transfer") continue;
    if (!isIndependentReportingTransaction(transaction)) {
      result.omittedTransactions += 1;
      result.omittedAmount += transaction.amount;
      continue;
    }
    if (transaction.type === "income") result.transactionIncome += transaction.amount;
    else result.transactionExpense += transaction.amount;
    if (!transaction.purpose ||
      (transaction.type === "income" && transaction.purpose !== "income") ||
      (transaction.type === "expense" && !["daily_expense", "goal_allocation"].includes(transaction.purpose))) {
      result.unclassifiedPurpose += 1;
      result.unclassifiedPurposeAmount += transaction.amount;
    }
    if (legacyKeys.has(overlapKey(transaction.date, transaction.type,
      transaction.amount, transaction.category))) {
      result.possibleOverlaps += 1;
      result.possibleOverlapAmount += transaction.amount;
    }
  }
  return result;
}
