import assert from "node:assert/strict";
import {
  calculateAccountBalance,
  getLedgerSummary,
} from "../src/features/account-ledger/accountLedgerModel.ts";

const accountA = {
  createdAt: "2026-07-01T00:00:00.000Z",
  id: "account-a",
  name: "Tiền mặt",
  openingBalance: 1000,
  type: "cash",
  updatedAt: "2026-07-01T00:00:00.000Z",
};
const accountB = {
  ...accountA,
  id: "account-b",
  name: "Ngân hàng",
  openingBalance: 500,
  type: "bank",
};
const baseTransaction = {
  accountId: accountA.id,
  amount: 0,
  category: "Khác",
  createdAt: "2026-07-25T00:00:00.000Z",
  date: "2026-07-25",
  id: "",
  note: "",
  type: "income",
  updatedAt: "2026-07-25T00:00:00.000Z",
};
const transactions = [
  { ...baseTransaction, amount: 200, id: "income", type: "income" },
  { ...baseTransaction, amount: 100, id: "expense", type: "expense" },
  {
    ...baseTransaction,
    amount: 300,
    id: "transfer",
    toAccountId: accountB.id,
    type: "transfer",
  },
];

assert.equal(calculateAccountBalance(accountA, transactions), 800);
assert.equal(calculateAccountBalance(accountB, transactions), 800);

const summary = getLedgerSummary(
  [accountA, accountB],
  transactions,
  "2026-07"
);

assert.deepEqual(summary, {
  expense: 100,
  income: 200,
  totalBalance: 1600,
  transfer: 300,
});

console.log("Account ledger tests passed.");
