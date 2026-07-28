import assert from "node:assert/strict";
import {
  buildReconciliationLine,
  createReconciliationAdjustmentTransaction,
  getReconciliationTotals,
} from "../src/features/account-reconciliation/accountReconciliationModel.ts";
import {
  calculateAccountBalanceAtDate,
} from "../src/features/account-ledger/accountLedgerModel.ts";

const account = {
  createdAt: "2026-07-01T00:00:00.000Z",
  id: "driver-wallet",
  name: "Ví Driver",
  openingBalance: 100_000,
  type: "e_wallet",
  updatedAt: "2026-07-01T00:00:00.000Z",
};
const transactions = [
  {
    accountId: account.id,
    amount: 200_000,
    category: "Thu nhập",
    createdAt: "2026-07-20T00:00:00.000Z",
    date: "2026-07-20",
    id: "income-before",
    note: "",
    type: "income",
    updatedAt: "2026-07-20T00:00:00.000Z",
  },
  {
    accountId: account.id,
    amount: 50_000,
    category: "Xăng xe",
    createdAt: "2026-07-21T00:00:00.000Z",
    date: "2026-07-21",
    id: "expense-before",
    note: "",
    type: "expense",
    updatedAt: "2026-07-21T00:00:00.000Z",
  },
  {
    accountId: account.id,
    amount: 500_000,
    category: "Thu nhập",
    createdAt: "2026-07-23T00:00:00.000Z",
    date: "2026-07-23",
    id: "income-after",
    note: "",
    type: "income",
    updatedAt: "2026-07-23T00:00:00.000Z",
  },
];

assert.equal(
  calculateAccountBalanceAtDate(account, transactions, "2026-07-22"),
  250_000
);

const surplusLine = buildReconciliationLine({
  account,
  actualBalance: 280_000,
  expectedBalance: 250_000,
  reason: "unrecorded_income",
});
const shortageLine = {
  ...surplusLine,
  accountId: "cash",
  accountName: "Tiền mặt",
  actualBalance: 40_000,
  difference: -10_000,
  expectedBalance: 50_000,
  reason: "missing_expense",
};

assert.equal(surplusLine.expectedBalance, 250_000);
assert.equal(surplusLine.difference, 30_000);
assert.deepEqual(getReconciliationTotals([surplusLine, shortageLine]), {
  actual: 320_000,
  difference: 20_000,
  expected: 300_000,
  unresolved: 2,
});

const check = {
  createdAt: "2026-07-22T12:00:00.000Z",
  date: "2026-07-22",
  id: "check-1",
  lines: [surplusLine],
  note: "",
  updatedAt: "2026-07-22T12:00:00.000Z",
};
const adjustment = createReconciliationAdjustmentTransaction(
  check,
  surplusLine,
  "2026-07-22T12:10:00.000Z"
);

assert.equal(adjustment?.type, "income");
assert.equal(adjustment?.amount, 30_000);
assert.equal(adjustment?.id, "reconciliation:check-1:driver-wallet");
assert.equal(
  createReconciliationAdjustmentTransaction(check, {
    ...surplusLine,
    reason: "internal_transfer",
  }),
  null
);

console.log("Account reconciliation tests passed.");
