import assert from "node:assert/strict";
import { calculateAccountBalance, getLedgerSummary, isExpenseReversal } from
  "../src/features/account-ledger/accountLedgerModel.ts";
import { calculateActualAvailableBalance } from
  "../src/features/account-ledger/accountExternalModel.ts";
import { getAccountAvailableToAllocate, getJarBudgetView, getJarRemainingPercent, getJarView, migrateExpenseBudgets } from
  "../src/features/spending-jars/domain/jarModel.ts";
import { assertReservationCoverageAfterLedgerChange, getFinancialPosition } from
  "../src/features/spending-jars/domain/financialPosition.ts";
import { getJarSpendingAnalysis } from
  "../src/features/spending-jars/domain/jarSpendingAnalysis.ts";
import { applyJarCommand, planJarSpend, smartAllocate } from
  "../src/features/spending-jars/services/jarService.ts";
import { repairClosedJars } from "../src/features/spending-jars/services/closedJarMigration.ts";

const now = "2026-09-22T10:00:00.000Z";
const accounts = [
  { id: "a", name: "Tiền mặt", type: "cash", openingBalance: 1_000_000,
    budgetEligibility: "eligible", createdAt: now, updatedAt: now },
  { id: "b", name: "BIDV", type: "bank", openingBalance: 2_000_000,
    budgetEligibility: "eligible", createdAt: now, updatedAt: now },
];
let ledger = { accounts, transactions: [], jars: [], jarActivities: [] };
const apply = (command) => { ledger = applyJarCommand(ledger, { id: crypto.randomUUID(), now, ...command }); };
const view = () => getJarView(ledger, ledger.jars[0]);

apply({ kind: "create", id: "food", fields: { name: "Ăn uống", icon: "🍜", limitAmount: 1_500_000,
  startDate: "2026-09-01", linkedLabels: ["Ăn uống"] } });
apply({ kind: "allocate", jarId: "food", accountId: "a", amount: 1_000_000 });
apply({ kind: "allocate", jarId: "food", accountId: "b", amount: 500_000 });
assert.equal(getFinancialPosition(ledger).totalBalance, 3_000_000, "allocation cannot create assets");
assert.equal(getFinancialPosition(ledger).reserved, 1_500_000);
assert.equal(getFinancialPosition(ledger).allocationCapacity, 1_500_000);
assert.equal(ledger.transactions.length, 0, "allocation cannot create income or expense");
assert.equal(calculateAccountBalance(accounts[0], ledger.transactions), 1_000_000);
assert.equal(calculateAccountBalance(accounts[1], ledger.transactions), 2_000_000);
assert.equal(getAccountAvailableToAllocate(ledger, "a"), 0);
assert.equal(getAccountAvailableToAllocate(ledger, "b"), 1_500_000);
assert.deepEqual(view().sources, [{ accountId: "a", amount: 1_000_000 }, { accountId: "b", amount: 500_000 }]);
assert.equal(getJarRemainingPercent(view()), 100);
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
assert.equal(getJarRemainingPercent(view()), 20);
assert.equal(getFinancialPosition(ledger).totalBalance, 1_800_000, "jar spend reduces assets once");
assert.equal(getFinancialPosition(ledger).reserved, 300_000);
assert.deepEqual(view().sources, [{ accountId: "b", amount: 300_000 }]);
const firstAnalysis = getJarSpendingAnalysis(ledger, ledger.jars[0], "2026-09-22");
assert.equal(firstAnalysis.expenseCount, 1, "split account postings are one purchase");
assert.equal(firstAnalysis.grossSpent, 1_200_000);
assert.equal(firstAnalysis.averageExpense, 1_200_000);
assert.deepEqual(firstAnalysis.categories, [{ name: "Ăn uống", amount: 1_200_000, percentage: 100 }]);
assert.deepEqual(firstAnalysis.recent[0].accountNames, ["Tiền mặt", "BIDV"]);
assert.equal(firstAnalysis.recent[0].note, "Ăn tối");
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
assert.equal(getJarRemainingPercent(view()), 83);
assert.equal(calculateAccountBalance(accounts[1], ledger.transactions), 1_750_000);
assert.equal(isExpenseReversal(ledger.transactions.find((item) => item.id.startsWith("jar-refund:"))), true);
assert.equal(getLedgerSummary(accounts, ledger.transactions, "2026-09").income, 0);
assert.equal(getLedgerSummary(accounts, ledger.transactions, "2026-09").expense, 250_000);
assert.equal(getJarBudgetView(ledger, ledger.jars[0], "2026-09-22").spent, 250_000,
  "refund reverses spending rather than creating new earned income");
const refundedAnalysis = getJarSpendingAnalysis(ledger, ledger.jars[0], "2026-09-22");
assert.equal(refundedAnalysis.expenseCount, 1);
assert.equal(refundedAnalysis.grossSpent, 300_000);
assert.equal(refundedAnalysis.refunded, 50_000);
assert.equal(refundedAnalysis.netSpent, 250_000);
assert.equal(refundedAnalysis.recent[0].note, "Ăn tối sửa", "analysis follows edited ledger data");
assert.throws(() => apply({ kind: "refund", jarId: "food", accountId: "a", amount: 1,
  date: "2026-09-22", note: "Sai nguồn" }), /vượt số đã chi/);

apply({ kind: "close", jarId: "food" });
assert.equal(ledger.jars[0].status, "closed");
assert.deepEqual(ledger.jars[0].linkedLabels, []);
assert.equal(ledger.transactions.find((transaction) => transaction.type === "expense")?.category, "Ăn uống");
assert.equal(getAccountAvailableToAllocate(ledger, "a"), 1_000_000);
assert.equal(getAccountAvailableToAllocate(ledger, "b"), 1_750_000);
assert.equal(calculateAccountBalance(accounts[1], ledger.transactions), 1_750_000);
assert.equal(repairClosedJars(ledger, now), ledger);
const sibling = applyJarCommand(ledger, { kind: "create", id: "shared", now,
  fields: { name: "Hũ khác", icon: "🫙", limitAmount: 100_000,
    startDate: "2026-09-22", linkedLabels: ["Ăn uống"] } });
assert.deepEqual(sibling.jars.find((jar) => jar.id === "shared").linkedLabels, ["Ăn uống"]);

const oldClosed = {
  accounts, transactions: ledger.transactions,
  jars: [
    { ...ledger.jars[0], linkedLabels: ["Ăn uống", "Siêu thị"] },
    sibling.jars.find((jar) => jar.id === "shared"),
  ],
  jarActivities: ledger.jarActivities.filter((activity) =>
    activity.jarId !== "food" || activity.kind !== "release"),
};
const repaired = repairClosedJars(oldClosed, now);
assert.deepEqual(repaired.jars[0].linkedLabels, []);
assert.deepEqual(repaired.jars[1].linkedLabels, ["Ăn uống"]);
assert.equal(getJarView(repaired, repaired.jars[0]).remainingAmount, 0);
assert.equal(repaired.transactions, oldClosed.transactions);
assert.equal(repairClosedJars(repaired, now), repaired);

const budget = { id: "old-food", label: "Ăn uống", monthlyLimit: 1_500_000, createdAt: now };
const migrated = migrateExpenseBudgets(ledger, [budget], now);
assert.equal(migrated.jars.length, 2);
assert.equal(migrated.jars[1].budgetPeriod, "monthly");
assert.equal(migrateExpenseBudgets(migrated, [budget], now), migrated);
assert.deepEqual(migrated.jars[1].linkedLabels, ["Ăn uống"]);

const removable = applyJarCommand(migrated, { kind: "create", id: "unused", now,
  fields: { name: "Hũ tạm", icon: "🫙", limitAmount: 100, startDate: "2026-09-22", linkedLabels: [] } });
const deleted = applyJarCommand(removable, { kind: "delete", id: "delete-unused", jarId: "unused", now });
assert.equal(deleted.jars.find((jar) => jar.id === "unused").status, "deleted");
assert.equal(migrateExpenseBudgets(deleted, [budget], now), deleted);
const deletedLegacy = applyJarCommand(deleted, { kind: "delete", id: "delete-legacy",
  jarId: "legacy-budget:old-food", now });
assert.equal(deletedLegacy.jars.find((jar) => jar.id === "legacy-budget:old-food").status, "deleted");
assert.equal(migrateExpenseBudgets(deletedLegacy, [budget], now), deletedLegacy);
assert.throws(() => applyJarCommand(deleted, { kind: "allocate", id: "reuse", jarId: "unused",
  accountId: "a", amount: 1, now }), /đã đóng hoặc không tồn tại/);

let monthly = { accounts, transactions: [], jars: [], jarActivities: [] };
monthly = applyJarCommand(monthly, { kind: "create", id: "monthly", now,
  fields: { name: "Tiền nhà", icon: "🏠", budgetPeriod: "monthly", limitAmount: 3_000_000,
    startDate: "2026-09-01", linkedLabels: [] } });
assert.equal(getFinancialPosition(monthly).totalBalance, 3_000_000, "budget limit cannot create money");
assert.equal(getFinancialPosition(monthly).liquid, calculateActualAvailableBalance(monthly),
  "Dashboard and account ledger must agree on real money");
monthly = applyJarCommand(monthly, { kind: "allocate", id: "fund", now,
  jarId: "monthly", accountId: "b", amount: 1_000_000 });
assert.equal(getFinancialPosition(monthly).totalBalance, 3_000_000);
assert.equal(getFinancialPosition(monthly).allocationCapacity, 2_000_000);
assert.equal(applyJarCommand(monthly, { kind: "allocate", id: "fund", now,
  jarId: "monthly", accountId: "b", amount: 1_000_000 }), monthly, "allocation retry is idempotent");
assert.throws(() => applyJarCommand(monthly, { kind: "spend", id: "too-much", now,
  jarId: "monthly", amount: 1_000_001, date: "2026-09-22", category: "Nhà",
  note: "", purpose: "daily_expense" }), /không còn đủ tiền/);
monthly = applyJarCommand(monthly, { kind: "spend", id: "rent", now,
  jarId: "monthly", amount: 500_000, date: "2026-09-22", category: "Nhà",
  note: "", purpose: "daily_expense" });
assert.equal(getJarBudgetView(monthly, monthly.jars[0], "2026-09-22").remaining, 2_500_000);
assert.equal(getJarBudgetView(monthly, monthly.jars[0], "2026-10-01").spent, 0,
  "a new budget period does not erase the cash still reserved");
assert.equal(getJarSpendingAnalysis(monthly, monthly.jars[0], "2026-10-01").expenseCount, 0,
  "analysis follows the jar's budget period");
assert.equal(getJarView(monthly, monthly.jars[0]).remainingAmount, 500_000);
const release = { kind: "release", id: "unreserve", now, jarId: "monthly", accountId: "b", amount: 200_000 };
monthly = applyJarCommand(monthly, release);
assert.equal(getFinancialPosition(monthly).allocationCapacity, 2_200_000);
assert.equal(applyJarCommand(monthly, release), monthly, "release retry is idempotent");
const transfer = { id: "between-accounts", accountId: "b", toAccountId: "a", amount: 1_300_000,
  type: "transfer", category: "Chuyển nội bộ", note: "", date: "2026-09-22",
  createdAt: now, updatedAt: now };
const transferred = { ...monthly, transactions: [transfer, ...monthly.transactions] };
assert.equal(getFinancialPosition(transferred).totalBalance, getFinancialPosition(monthly).totalBalance);
assert.throws(() => assertReservationCoverageAfterLedgerChange(monthly, transferred), /không đủ tiền thực có/,
  "a transfer must not silently strand a jar on its source account");
const excluded = { ...monthly, accounts: monthly.accounts.map((account) => account.id === "a"
  ? { ...account, budgetEligibility: "needs_review" } : account) };
assert.equal(getAccountAvailableToAllocate(excluded, "a"), 0,
  "an existing account is never automatically eligible");
assert.equal(getFinancialPosition(excluded).needsReview, 1);
assert.equal(getJarBudgetView(ledger, ledger.jars[0], "2026-09-22").needsPeriodReview, true);
const reversed = applyJarCommand(monthly, { kind: "delete_spend", id: "undo-rent", now,
  jarId: "monthly", activityId: "rent" });
assert.equal(getFinancialPosition(reversed).totalBalance, 3_000_000,
  "deleting a jar expense restores account balance exactly once");
assert.equal(getJarBudgetView(reversed, reversed.jars[0], "2026-09-22").spent, 0);
assert.equal(getJarSpendingAnalysis(reversed, reversed.jars[0], "2026-09-22").expenseCount, 0,
  "deleted jar spend does not linger in insights");
assert.equal(getFinancialPosition(reversed).reserved, 800_000);
const outside = { ...monthly, accounts: monthly.accounts.map((account) => account.id === "b"
  ? { ...account, externalEntries: [{ id: "away", amount: 1_300_000, type: "loaned",
    date: "2026-09-22", note: "", relatedPerson: "", createdAt: now, updatedAt: now }] }
  : account) };
assert.equal(getAccountAvailableToAllocate(outside, "b"), 0,
  "money outside an account cannot be reserved twice");
assert.throws(() => assertReservationCoverageAfterLedgerChange(monthly, outside), /không đủ tiền thực có/);

console.log("Spending jars tests passed.");
