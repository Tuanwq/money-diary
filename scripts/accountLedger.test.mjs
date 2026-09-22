import assert from "node:assert/strict";
import {
  calculateAccountBalance,
  createDefaultLedger,
  getLedgerSummary,
} from "../src/features/account-ledger/accountLedgerModel.ts";
import { isPristineLedger, reconcileJarLedger } from "../src/features/account-ledger/reconcileJarLedger.ts";

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
const localJarLedger = {
  accounts: [{ ...accountA, updatedAt: "2026-09-21T00:00:00Z" }],
  transactions: [{ ...baseTransaction, id: "jar-spend:one:0", type: "expense",
    amount: 100, jarId: "food", jarActivityId: "one" }],
  jars: [{ id: "food", name: "Ăn uống" }],
  jarActivities: [{ id: "one", jarId: "food", kind: "spend",
    transactionIds: ["jar-spend:one:0"] }],
  updatedAt: "2026-09-21T00:00:00Z",
};
const newerCloudLedger = {
  accounts: [{ ...accountA, name: "Tiền mặt mới", updatedAt: "2026-09-22T00:00:00Z" }, accountB],
  transactions: [{ ...baseTransaction, id: "cloud-income", amount: 200 }],
  jars: [], jarActivities: [], updatedAt: "2026-09-22T00:00:00Z",
};
const recovered = reconcileJarLedger(localJarLedger, newerCloudLedger, "2026-09-23T00:00:00Z");
assert.equal(recovered.accounts.find((item) => item.id === accountA.id).name, "Tiền mặt mới");
assert.equal(recovered.accounts.length, 2);
assert.deepEqual(recovered.transactions.map((item) => item.id), ["cloud-income", "jar-spend:one:0"]);
assert.deepEqual(recovered.jars, localJarLedger.jars);
assert.deepEqual(recovered.jarActivities, localJarLedger.jarActivities);
assert.equal(recovered.updatedAt, "2026-09-23T00:00:00Z");
assert.equal(reconcileJarLedger({ ...localJarLedger, jars: [], jarActivities: [] }, newerCloudLedger), newerCloudLedger);
const pristineLedger = createDefaultLedger();
assert.equal(isPristineLedger(pristineLedger), true);
assert.equal(isPristineLedger({ ...pristineLedger, accounts: [
  { ...pristineLedger.accounts[0], openingBalance: 100 }, ...pristineLedger.accounts.slice(1),
] }), false);
assert.equal(isPristineLedger({ ...pristineLedger, transactions: [baseTransaction] }), false);
console.log("Account ledger tests passed.");
