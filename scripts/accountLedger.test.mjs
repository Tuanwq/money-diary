import assert from "node:assert/strict";
import {
  calculateAccountBalance,
  createDefaultLedger,
  getLedgerSummary,
} from "../src/features/account-ledger/accountLedgerModel.ts";
import { areLedgerContentsEqual, decideLedgerLoad, hasLocalOnlyRecords, isPristineLedger, nextLedgerTimestamp } from
  "../src/features/account-ledger/ledgerSync.ts";
import { describeLedgerCloudError } from "../src/features/account-ledger/ledgerCloudError.ts";
import { ledgerKey, pendingKey, selectLocalLedgerValue, selectTrustedLegacyBudgets } from
  "../src/features/account-ledger/ledgerStorageScope.ts";

assert.match(describeLedgerCloudError({ message: "TypeError: Failed to fetch" }), /kết nối/);
assert.match(describeLedgerCloudError({ code: "42501", message: "permission denied" }), /quyền/);
assert.match(describeLedgerCloudError({ status: 401, message: "JWT expired" }), /đăng nhập/);

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
const pristineLedger = createDefaultLedger();
assert.equal(isPristineLedger(pristineLedger), true);
assert.equal(isPristineLedger({ ...pristineLedger,
  categories: [{ id: "custom", name: "Đi lại", type: "expense" }] }), false);
assert.equal(isPristineLedger({ ...pristineLedger, accounts: pristineLedger.accounts.map((account, index) =>
  index === 0 ? { ...account, budgetEligibility: "eligible" } : account) }), false,
"choosing an account for budgeting is a local change that must not be overwritten");
assert.equal(isPristineLedger({ ...pristineLedger, accounts: [
  { ...pristineLedger.accounts[0], openingBalance: 100 }, ...pristineLedger.accounts.slice(1),
] }), false);
assert.equal(isPristineLedger({ ...pristineLedger, transactions: [baseTransaction] }), false);
const staleIosLedger = { ...localJarLedger, updatedAt: "2026-09-23T10:00:00Z" };
const deletedOnCloud = { ...newerCloudLedger, updatedAt: "2026-09-23T09:00:00Z" };
assert.equal(decideLedgerLoad(staleIosLedger, deletedOnCloud, undefined), "cloud");
assert.equal(hasLocalOnlyRecords(staleIosLedger, deletedOnCloud), true);
assert.equal(decideLedgerLoad(staleIosLedger, deletedOnCloud, "2026-09-22T00:00:00Z"), "conflict");
assert.equal(areLedgerContentsEqual(staleIosLedger, deletedOnCloud), false);
assert.equal(areLedgerContentsEqual(localJarLedger, { ...localJarLedger,
  updatedAt: "2026-09-24T00:00:00Z",
  accounts: localJarLedger.accounts.map((account) => ({ name: account.name,
    id: account.id, createdAt: account.createdAt, openingBalance: account.openingBalance,
    type: account.type, updatedAt: account.updatedAt })),
}), true);
assert.equal(decideLedgerLoad(staleIosLedger, deletedOnCloud, deletedOnCloud.updatedAt), "pending");
assert.equal(decideLedgerLoad(pristineLedger, null, undefined), "empty");
assert.equal(nextLedgerTimestamp("2026-09-23T09:00:00.000Z", Date.parse("2026-09-23T08:00:00.000Z")),
  "2026-09-23T09:00:00.001Z");
assert.notEqual(ledgerKey("user-a"), ledgerKey("user-b"));
assert.notEqual(pendingKey("user-a"), pendingKey("user-b"));
assert.equal(selectLocalLedgerValue("user-b", null, "user-a-cash", "user-a"), null,
  "a different user must never inherit an unscoped ledger");
assert.equal(selectLocalLedgerValue("user-a", null, "pending-cash", "user-a"), "pending-cash",
  "the pending owner can recover an old unsynced cache");
assert.equal(selectLocalLedgerValue("user-b", "own-cache", "other-cache", "user-a"), "own-cache");
const oldBudget = [{ id: "old", label: "Food", monthlyLimit: 100 }];
assert.equal(selectTrustedLegacyBudgets("user-b", true,
  { userId: "user-a", budgets: oldBudget }, oldBudget), undefined,
"unscoped V1 budgets and another owner's cloud budgets cannot seed this ledger");
assert.equal(selectTrustedLegacyBudgets("user-b", true,
  { userId: "user-b", budgets: oldBudget }, []), oldBudget);
console.log("Account ledger tests passed.");
