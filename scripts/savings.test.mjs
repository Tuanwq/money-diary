import assert from "node:assert/strict";
import { calculateAccountBalance, createDefaultLedger, getLedgerSummary, isSavingsTransfer } from
  "../src/features/account-ledger/accountLedgerModel.ts";
import { getFinancialPosition } from "../src/features/spending-jars/domain/financialPosition.ts";
import { getAccountAvailableToAllocate } from "../src/features/spending-jars/domain/jarModel.ts";
import { assertSavingsCoverageAfterLedgerChange, calculateSavingsAmount, filterSavingsHistory,
  getSavingsAvailable, getSavingsHeldAmount, getSavingsReserved } from
  "../src/features/savings/domain/savingsModel.ts";
import { applySavingsCommand } from "../src/features/savings/services/savingsService.ts";
import { filterHistoryLedgerTransactions } from "../src/features/history/historyLedgerModel.ts";
import { buildStoryTimeline } from "../src/features/photo-finance/services/dayStoryModel.ts";

const now = "2026-10-23T10:00:00.000Z";
const today = "2026-10-23";
const source = "money-account-bank";
const target = "money-account-cash";
const base = () => {
  const ledger = createDefaultLedger();
  ledger.accounts = ledger.accounts.map((item) => ({ ...item, budgetEligibility: "eligible",
    openingBalance: item.id === source ? 100_000 : 0 }));
  ledger.transactions = [{ id: "income", type: "income", source: "manual", purpose: "income",
    accountId: source, amount: 400_000, category: "Thu nhập", note: "HUB", date: today,
    createdAt: now, updatedAt: now }];
  return ledger;
};
const rule = (overrides = {}) => ({ id: "rule", name: "20%", mode: "percentage", value: 20,
  cadence: "end_of_day", basis: "gross", minimumRemaining: 0, sourceAccountId: source,
  destination: { kind: "allocation" }, execution: "suggest", paused: false, startDate: today,
  createdAt: now, updatedAt: now, ...overrides });
const save = (ledger, savingsRule = rule()) => applySavingsCommand(ledger, { type: "save_rule", rule: savingsRule }, now);
const refresh = (ledger, date = today, random = () => 0.5) =>
  applySavingsCommand(ledger, { type: "refresh", today: date }, now, random);

assert.equal(calculateSavingsAmount(rule(), 400_000), 80_000);
assert.equal(calculateSavingsAmount(rule({ dailyCap: 50_000 }), 400_000), 50_000);
assert.equal(calculateSavingsAmount(rule({ mode: "fixed", value: 15_000 }), 400_000), 15_000);
assert.equal(refresh(save({ ...base(), transactions: [] })).savingsAllocations.length, 0,
  "no income must not create a result");

let ledger = refresh(save(base()));
assert.equal(ledger.savingsAllocations.length, 1);
assert.equal(ledger.savingsAllocations[0].amount, 80_000);
assert.equal(refresh(ledger), ledger, "refresh must not duplicate or rewrite a stable result");
const allocated = applySavingsCommand(ledger, { type: "confirm", resultId: "saving:rule:2026-10-23" }, now);
assert.equal(allocated.transactions.length, 1, "reservation is not an expense transaction");
assert.equal(getSavingsReserved(allocated), 80_000);
assert.equal(getSavingsHeldAmount(allocated), 80_000, "allocated savings is hidden from displayed balances");
assert.equal(getSavingsHeldAmount(applySavingsCommand(allocated,
  { type: "release", resultId: "saving:rule:2026-10-23" }, now)), 0,
"released savings becomes visible again");
assert.equal(getSavingsAvailable(allocated, source), 420_000);
assert.equal(getAccountAvailableToAllocate(allocated, source), 420_000,
  "money reserved for savings cannot be allocated again to a jar");
assert.equal(getFinancialPosition(allocated).totalBalance, 500_000);
assert.equal(getLedgerSummary(allocated.accounts, allocated.transactions, "2026-10").expense, 0);
assert.throws(() => applySavingsCommand(allocated, { type: "confirm", resultId: "saving:rule:2026-10-23" }),
  /đã được xử lý/, "replaying confirmation must not duplicate");
assert.throws(() => applySavingsCommand(ledger, { type: "confirm", resultId: "saving:rule:2026-10-23", amount: 500_001 }),
  /Không đủ tiền/, "savings cannot exceed available money");
assert.throws(() => applySavingsCommand(refresh(save(base(), rule({ minimumRemaining: 450_000 }))),
  { type: "confirm", resultId: "saving:rule:2026-10-23" }), /Không đủ tiền/);

const transferRule = rule({ destination: { kind: "transfer", accountId: target } });
const transferred = applySavingsCommand(refresh(save(base(), transferRule)),
  { type: "confirm", resultId: "saving:rule:2026-10-23" }, now);
assert.equal(transferred.transactions.length, 2);
assert.equal(transferred.transactions[0].type, "transfer");
assert.equal(calculateAccountBalance(transferred.accounts.find((item) => item.id === source), transferred.transactions), 420_000);
assert.equal(calculateAccountBalance(transferred.accounts.find((item) => item.id === target), transferred.transactions), 80_000);
assert.equal(getFinancialPosition(transferred).totalBalance, 500_000, "transfer cannot change total assets");
assert.equal(getSavingsHeldAmount(transferred), 80_000, "transferred savings is hidden once, despite remaining an asset");
assert.equal(getSavingsHeldAmount({ ...transferred, transactions: transferred.transactions.slice(1) }), 0,
  "missing transfer cannot hide money without an accounting entry");
assert.equal(getLedgerSummary(transferred.accounts, transferred.transactions, "2026-10").totalBalance -
  getSavingsHeldAmount(transferred), 420_000);
assert.equal(isSavingsTransfer(transferred.transactions[0]), true);
assert.equal(getLedgerSummary(transferred.accounts, transferred.transactions, "2026-10").transfer, 0,
  "savings transfer does not leak into ordinary transfer total");
assert.deepEqual(filterHistoryLedgerTransactions(transferred.transactions,
  { fromDate: "", toDate: "", search: "" }).map((item) => item.id), ["income"],
  "savings transfer is absent from general history");
assert.equal(buildStoryTimeline(today, transferred.transactions, [], [], []).length, 1,
  "savings transfer is absent from daily story timeline");
assert.equal(isSavingsTransfer({ ...transferred.transactions[0], source: "manual" }), true,
  "old savings transfers are recognized by stable ID");
assert.equal(filterSavingsHistory(transferred.savingsAllocations, { status: "saved", destination: "transfer",
  month: "2026-10", ruleId: "rule" }).length, 1);
assert.equal(filterSavingsHistory(transferred.savingsAllocations, { status: "proposed" }).length, 0);
assert.deepEqual([getLedgerSummary(transferred.accounts, transferred.transactions, "2026-10").income,
  getLedgerSummary(transferred.accounts, transferred.transactions, "2026-10").expense], [400_000, 0]);

const randomRule = rule({ mode: "random_percentage", value: 0, minimum: 10, maximum: 30 });
const randomLedger = refresh(save(base(), randomRule), today, () => 0.25);
assert.equal(randomLedger.savingsAllocations[0].sampledValue, 15);
assert.equal(randomLedger.savingsAllocations[0].amount, 60_000);
assert.equal(refresh(structuredClone(randomLedger), today, () => 0.99).savingsAllocations[0].amount, 60_000,
  "stored random draw survives reload");
const randomMoney = refresh(save(base(), rule({ mode: "random_amount", value: 0,
  minimum: 10_000, maximum: 20_000 })), today, () => 0);
assert.equal(randomMoney.savingsAllocations[0].amount, 10_000);

const net = base();
net.transactions.push({ id: "work", type: "expense", source: "manual", purpose: "daily_expense",
  accountId: source, amount: 50_000, isWorkExpense: true, category: "Chi phí công việc", note: "Xăng",
  date: today, createdAt: now, updatedAt: now });
assert.equal(refresh(save(net, rule({ basis: "net_work" }))).savingsAllocations[0].amount, 70_000);

const edited = { ...allocated, transactions: allocated.transactions.map((item) => item.id === "income"
  ? { ...item, amount: 300_000, updatedAt: "2026-10-23T11:00:00.000Z" } : item) };
const stale = refresh(edited);
assert.equal(stale.savingsAllocations[0].status, "needs_recalculation");
assert.equal(getSavingsReserved(stale), 80_000, "stale allocation stays reserved until confirmation");
assert.equal(refresh(stale), stale, "stale result must not cause a render/write loop");
const recalculated = applySavingsCommand(stale, { type: "recalculate", resultId: "saving:rule:2026-10-23" }, now);
assert.equal(recalculated.savingsAllocations[0].amount, 60_000);
assert.equal(recalculated.savingsAllocations[0].status, "proposed");
const deleted = refresh({ ...allocated, transactions: [] });
assert.equal(deleted.savingsAllocations[0].status, "needs_recalculation", "deleted income marks result stale");
assert.equal(applySavingsCommand(deleted, { type: "recalculate", resultId: "saving:rule:2026-10-23" }, now)
  .savingsAllocations[0].status, "skipped");

const automatic = rule({ execution: "automatic" });
const dayEnd = refresh(save(base(), automatic));
assert.equal(dayEnd.savingsAllocations[0].status, "proposed", "end-of-day mode waits today");
const nextDay = refresh(dayEnd, "2026-10-24");
assert.equal(nextDay.savingsAllocations[0].status, "allocated", "end-of-day mode executes once after day closes");
assert.equal(refresh(nextDay, "2026-10-24"), nextDay);
const perIncome = refresh(save(base(), rule({ cadence: "per_income", execution: "automatic" })));
assert.equal(perIncome.savingsAllocations[0].status, "allocated");
assert.equal(perIncome.savingsAllocations.length, 1);
const skipped = applySavingsCommand(ledger, { type: "skip", resultId: "saving:rule:2026-10-23" }, now);
assert.equal(refresh(skipped).savingsAllocations[0].status, "skipped", "skip today is sticky");
const paused = applySavingsCommand(save(base()), { type: "pause_rule", ruleId: "rule", paused: true }, now);
assert.equal(refresh(paused).savingsAllocations.length, 0, "paused rule cannot propose savings");

assert.throws(() => assertSavingsCoverageAfterLedgerChange(allocated, {
  ...allocated, transactions: [...allocated.transactions, { ...allocated.transactions[0], id: "expense", type: "expense", amount: 450_000 }],
}), /không đủ tiền/, "subsequent spending cannot silently consume savings reserve");

console.log("Savings: calculations, caps, random persistence, availability, idempotency, income edits, and asset invariants passed.");
