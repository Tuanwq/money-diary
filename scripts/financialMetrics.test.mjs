import assert from "node:assert/strict";
import { calculateAccountBalance } from "../src/features/account-ledger/accountLedgerModel.ts";
import { groupFinancialExpensesByCategory, groupFinancialTransactionsByDay,
  summarizeFinancialTransactions } from "../src/features/finance-core/services/financialMetrics.ts";

const date = "2026-09-25";
const accounts = [
  { id: "cash", name: "Tiền mặt", openingBalance: 1000 },
  { id: "bank", name: "BIDV", openingBalance: 0 },
];
const base = { date, accountId: "cash", category: "Khác", note: "",
  createdAt: `${date}T16:30:00Z`, updatedAt: `${date}T16:30:00Z` };
const income = { ...base, id: "income", type: "income", amount: 300 };
const expense = { ...base, id: "expense", type: "expense", amount: 50, category: "Ăn uống" };
const transfer = { ...base, id: "transfer", type: "transfer", amount: 125, toAccountId: "bank" };
const rows = [income, expense, transfer];
const totals = { income: 300, expense: 50, transfer: 125, net: 250 };
assert.deepEqual(summarizeFinancialTransactions(rows), totals);
assert.deepEqual(groupFinancialTransactionsByDay(rows).get(date), totals);
assert.deepEqual(groupFinancialExpensesByCategory(rows), [{ name: "Ăn uống", value: 50 }]);
assert.equal(calculateAccountBalance(accounts[0], rows), 1125);
assert.equal(calculateAccountBalance(accounts[1], rows), 125);

const edited = rows.map((item) => item.id === "income" ? { ...item, amount: 350 } : item);
assert.equal(summarizeFinancialTransactions(edited).net, 300);
assert.equal(calculateAccountBalance(accounts[0], edited), 1175);
const deleted = edited.filter((item) => item.id !== "income");
assert.equal(summarizeFinancialTransactions(deleted).income, 0);
assert.equal(calculateAccountBalance(accounts[0], deleted), 825);
assert.deepEqual(summarizeFinancialTransactions(rows, { fromDate: "2026-09-24", toDate: date }), totals);
assert.equal(summarizeFinancialTransactions(rows, { fromDate: "2026-09-26", toDate: "2026-09-26" }).income, 0);

console.log("Financial metrics tests passed.");
