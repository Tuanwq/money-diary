import assert from "node:assert/strict";
import {
  buildReconciliationLine,
  createReconciliationAdjustmentTransaction,
  getAccountReconciliationBasis,
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

const accountWithOutsideMoney = {
  ...account,
  externalEntries: [{
    id: "loan-1",
    accountId: account.id,
    amount: 60_000,
    type: "loaned",
    note: "",
    date: "2026-07-20",
    recoveries: [{ id: "return-1", amount: 20_000, date: "2026-07-23",
      createdAt: "2026-07-23T00:00:00.000Z" }],
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-23T00:00:00.000Z",
  }, {
    id: "future-outside",
    accountId: account.id,
    amount: 10_000,
    type: "unavailable",
    note: "",
    date: "2026-07-24",
    recoveries: [],
    createdAt: "2026-07-24T00:00:00.000Z",
    updatedAt: "2026-07-24T00:00:00.000Z",
  }],
};
assert.deepEqual(getAccountReconciliationBasis(accountWithOutsideMoney, transactions, "2026-07-22"), {
  bookBalance: 250_000,
  externalAmount: 60_000,
  expectedBalance: 190_000,
});
assert.deepEqual(getAccountReconciliationBasis(accountWithOutsideMoney, transactions, "2026-07-23"), {
  bookBalance: 750_000,
  externalAmount: 40_000,
  expectedBalance: 710_000,
});
assert.equal(getAccountReconciliationBasis(accountWithOutsideMoney, transactions, "2026-07-19").externalAmount, 0);
const physicalLine = buildReconciliationLine({
  account: accountWithOutsideMoney,
  actualBalance: 190_000,
  ...getAccountReconciliationBasis(accountWithOutsideMoney, transactions, "2026-07-22"),
});
assert.equal(physicalLine.difference, 0, "outside money is not a reconciliation shortfall");
assert.equal(physicalLine.externalAmount, 60_000, "save the basis for historical checks");

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
