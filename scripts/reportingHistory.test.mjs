import assert from "node:assert/strict";
import test from "node:test";
import { filterHistoryLedgerTransactions, buildCombinedExpenseReport } from "../src/features/history/historyLedgerModel.ts";
import { isIndependentReportingTransaction } from "../src/features/analytics/reportingTransactions.ts";
import { buildAnalyticsDataQuality } from "../src/features/analytics/analyticsDataQuality.ts";

const date = "2026-09-20";
const base = { date, accountId: "bank", category: "Ăn uống", note: "Bữa tối", createdAt: `${date}T11:00:00Z` };
const manual = { ...base, id: "manual", source: "manual", type: "expense", amount: 50_000 };
const photo = { ...base, id: "photo", source: "photo_finance", type: "expense", amount: 25_000 };
const duplicate = { ...base, id: "legacy-ledger", type: "expense", amount: 100_000 };
const transfer = { ...base, id: "transfer", source: "manual", type: "transfer", amount: 1_000_000 };
const income = { ...base, id: "income", source: "manual", type: "income", amount: 200_000 };
const transactions = [manual, photo, duplicate, transfer, income];

test("history reports explicit ledger sources without duplicating legacy or counting transfers", () => {
  assert.equal(isIndependentReportingTransaction(duplicate), false);
  const rows = filterHistoryLedgerTransactions(transactions, { fromDate: date, toDate: date, search: "", type: "expense" });
  assert.deepEqual(rows.map((row) => row.id).sort(), ["manual", "photo"]);
  const legacyExpense = { id: "old-expense", date, breakfast: 100_000, lunch: 0, dinner: 0,
    other: 0, note: "", otherItems: [] };
  const report = buildCombinedExpenseReport([legacyExpense], rows);
  assert.equal(report.total, 175_000);
  assert.equal(report.dayCount, 1);
  assert.deepEqual(report.topDay, [date, 175_000]);
  assert.equal(report.categories.reduce((sum, item) => sum + item.total, 0), report.total);
  assert.equal(report.labels.find((item) => item.label === "Ăn uống")?.total, 75_000);
});

test("history filters current transactions by date, category and note", () => {
  assert.deepEqual(filterHistoryLedgerTransactions(transactions,
    { fromDate: date, toDate: date, search: "bữa tối", category: "Ăn uống", type: "income" })
    .map((row) => row.id), ["income"]);
  assert.equal(filterHistoryLedgerTransactions(transactions,
    { fromDate: "2026-09-21", toDate: "", search: "" }).length, 0);
});

test("analytics identifies ambiguous legacy rows and possible overlap without changing totals", () => {
  const range = { fromDate: date, toDate: date };
  const entries = [{ id: "diary", date, income: 200_000, bonusMoney: 0, receivedMoney: 0 }];
  const expenses = [{ id: "old-expense", date, breakfast: 100_000, lunch: 0,
    dinner: 0, other: 0, note: "", otherItems: [] }];
  const rows = [
    duplicate,
    { ...manual, id: "overlap", amount: 100_000, category: "Ăn uống", purpose: "daily_expense" },
    { ...income, id: "new-income", amount: 30_000, purpose: "income" },
    { ...photo, id: "unclassified", amount: 25_000 },
    transfer,
  ];
  const quality = buildAnalyticsDataQuality({ entries, expenses, transactions: rows, range });
  assert.equal(quality.legacyIncome, 200_000);
  assert.equal(quality.legacyExpense, 100_000);
  assert.equal(quality.transactionIncome, 30_000);
  assert.equal(quality.transactionExpense, 125_000);
  assert.equal(quality.omittedTransactions, 1);
  assert.equal(quality.omittedAmount, 100_000);
  assert.equal(quality.possibleOverlaps, 1);
  assert.equal(quality.unclassifiedPurpose, 1);
  assert.equal(quality.unclassifiedPurposeAmount, 25_000);
  assert.equal(buildAnalyticsDataQuality({ entries, expenses, transactions: rows,
    range: { fromDate: "2026-09-21", toDate: "2026-09-27" } }).omittedTransactions, 0);
});
