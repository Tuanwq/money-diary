import assert from "node:assert/strict";
import { calculateAccountBalance } from "../src/features/account-ledger/accountLedgerModel.ts";
import { getAccountAvailableToAllocate, getJarView, migrateExpenseBudgets } from
  "../src/features/spending-jars/domain/jarModel.ts";
import { applyJarCommand, planJarSpend, smartAllocate } from
  "../src/features/spending-jars/services/jarService.ts";

const now = "2026-09-22T10:00:00.000Z";
const accounts = [
  { id: "a", name: "Tiền mặt", type: "cash", openingBalance: 1_000_000, createdAt: now, updatedAt: now },
  { id: "b", name: "BIDV", type: "bank", openingBalance: 2_000_000, createdAt: now, updatedAt: now },
];
let ledger = { accounts, transactions: [], jars: [], jarActivities: [] };
const apply = (command) => { ledger = applyJarCommand(ledger, { id: crypto.randomUUID(), now, ...command }); };
const view = () => getJarView(ledger, ledger.jars[0]);

apply({ kind: "create", id: "food", fields: { name: "Ăn uống", icon: "🍜", limitAmount: 1_500_000,
  startDate: "2026-09-01", linkedLabels: ["Ăn uống"] } });
apply({ kind: "allocate", jarId: "food", accountId: "a", amount: 1_000_000 });
apply({ kind: "allocate", jarId: "food", accountId: "b", amount: 500_000 });
assert.equal(calculateAccountBalance(accounts[0], ledger.transactions), 1_000_000);
assert.equal(calculateAccountBalance(accounts[1], ledger.transactions), 2_000_000);
assert.equal(getAccountAvailableToAllocate(ledger, "a"), 0);
assert.equal(getAccountAvailableToAllocate(ledger, "b"), 1_500_000);
assert.deepEqual(view().sources, [{ accountId: "a", amount: 1_000_000 }, { accountId: "b", amount: 500_000 }]);
assert.throws(() => apply({ kind: "allocate", jarId: "food", accountId: "b", amount: 1 }), /hạn mức/);
assert.deepEqual(smartAllocate(ledger, "food"), []);

assert.deepEqual(planJarSpend(ledger, "food", 1_200_000),
  [{ accountId: "a", amount: 1_000_000 }, { accountId: "b", amount: 200_000 }]);
apply({ kind: "spend", id: "dinner", jarId: "food", amount: 1_200_000,
  date: "2026-09-22", category: "Ăn uống", note: "Ăn tối", purpose: "daily_expense" });
assert.equal(ledger.transactions.length, 2);
assert.equal(calculateAccountBalance(accounts[0], ledger.transactions), 0);
assert.equal(calculateAccountBalance(accounts[1], ledger.transactions), 1_800_000);
assert.equal(view().remainingAmount, 300_000);
assert.equal(view().spentAmount, 1_200_000);
assert.deepEqual(view().sources, [{ accountId: "b", amount: 300_000 }]);
const unchanged = applyJarCommand(ledger, { kind: "spend", id: "dinner", now,
  jarId: "food", amount: 1_200_000, date: "2026-09-22", category: "Ăn uống",
  note: "Ăn tối", purpose: "daily_expense" });
assert.equal(unchanged, ledger);

apply({ kind: "spend", id: "edit", activityId: "dinner", jarId: "food", amount: 300_000,
  accountId: "b", date: "2026-09-22", category: "Ăn uống", note: "Ăn tối sửa", purpose: "daily_expense" });
assert.equal(ledger.transactions.length, 1);
assert.equal(view().remainingAmount, 1_200_000);
assert.equal(calculateAccountBalance(accounts[0], ledger.transactions), 1_000_000);
assert.equal(calculateAccountBalance(accounts[1], ledger.transactions), 1_700_000);

apply({ kind: "refund", jarId: "food", accountId: "b", amount: 50_000,
  date: "2026-09-22", note: "Trả lại" });
assert.equal(view().spentAmount, 250_000);
assert.equal(view().remainingAmount, 1_250_000);
assert.equal(calculateAccountBalance(accounts[1], ledger.transactions), 1_750_000);
assert.throws(() => apply({ kind: "refund", jarId: "food", accountId: "a", amount: 1,
  date: "2026-09-22", note: "Sai nguồn" }), /vượt số đã chi/);

apply({ kind: "close", jarId: "food" });
assert.equal(ledger.jars[0].status, "closed");
assert.equal(getAccountAvailableToAllocate(ledger, "a"), 1_000_000);
assert.equal(getAccountAvailableToAllocate(ledger, "b"), 1_750_000);
assert.equal(calculateAccountBalance(accounts[1], ledger.transactions), 1_750_000);

const budget = { id: "old-food", label: "Ăn uống", monthlyLimit: 1_500_000, createdAt: now };
const migrated = migrateExpenseBudgets(ledger, [budget], now);
assert.equal(migrated.jars.length, 2);
assert.equal(migrateExpenseBudgets(migrated, [budget], now), migrated);
assert.deepEqual(migrated.jars[1].linkedLabels, ["Ăn uống"]);

console.log("Spending jars tests passed.");
