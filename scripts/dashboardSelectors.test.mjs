import assert from "node:assert/strict";
import { buildDashboardJarFlow, buildManagerMonthlyOverview, buildManagerOverview, buildManagerRecentTransactions } from "../src/features/money-diary/utils/managerDashboardSelectors.ts";
import { readDashboardTab, rememberDashboardTab } from "../src/features/money-diary/utils/dashboardTabPreference.ts";
import { buildDailyFinancialSummaries, getDailyFinancialSummary } from "../src/features/photo-finance/services/photoFinanceModel.ts";
import { buildMainGoalProgress } from "../src/features/goals/domain/mainGoalProgress.ts";
import { getLedgerSummary } from "../src/features/account-ledger/accountLedgerModel.ts";
import { calculateActualAvailableBalance } from "../src/features/account-ledger/accountExternalModel.ts";
import { getFinancialPosition } from "../src/features/spending-jars/domain/financialPosition.ts";
import { applyJarCommand } from "../src/features/spending-jars/services/jarService.ts";

const entries = [
  {
    id: "income-september",
    date: "2026-09-10",
    income: 1_000_000,
    bonusMoney: 200_000,
    receivedMoney: 100_000,
    diary: "",
    orderCount: 0,
    workHours: 0,
    mood: "normal",
    note: "",
    createdAt: "2026-09-10T00:00:00.000Z",
  },
  {
    id: "income-october",
    date: "2026-10-01",
    income: 9_000_000,
    bonusMoney: 0,
    receivedMoney: 0,
    diary: "",
    orderCount: 0,
    workHours: 0,
    mood: "normal",
    note: "",
    createdAt: "2026-10-01T00:00:00.000Z",
  },
];

const expenses = [
  {
    id: "expense-september",
    date: "2026-09-11",
    breakfast: 50_000,
    lunch: 120_000,
    dinner: 80_000,
    other: 300_000,
    otherItems: [{ id: "rent", label: "Tiền nhà", amount: 300_000 }],
    note: "",
    createdAt: "2026-09-11T00:00:00.000Z",
  },
];

assert.deepEqual(buildManagerMonthlyOverview(entries, expenses, "2026-09-20"), {
  expense: 550_000,
  income: 1_300_000,
  net: 750_000,
  savingsRate: 58,
  topExpense: { label: "Tiền nhà", amount: 300_000 },
});

assert.deepEqual(buildManagerMonthlyOverview([], [], "2026-09-20"), {
  expense: 0,
  income: 0,
  net: 0,
  savingsRate: null,
  topExpense: null,
});

const day = "2026-09-21";
const dayEntries = [{ ...entries[0], date: day, income: 170_000, bonusMoney: 0, receivedMoney: 0 }];
const photoExpenses = [69_000, 7_000, 1_067_000].map((amount, index) => ({
  id: `photo-${index}`, accountId: "momo", amount, date: day, category: "Ăn uống", note: "",
  type: "expense", purpose: "goal_allocation", source: "photo_finance",
  createdAt: `${day}T11:00:00Z`, updatedAt: `${day}T11:00:00Z`,
}));
const overview = buildManagerOverview(dayEntries, [], day, photoExpenses);
assert.deepEqual(overview.day, {
  date: day, income: 170_000, expense: 1_143_000, net: -973_000, hasData: true,
});
assert.deepEqual(overview.day,
  getDailyFinancialSummary(buildDailyFinancialSummaries(dayEntries, [], photoExpenses), day));
assert.equal(overview.month.expense, 1_143_000);
assert.equal(overview.month.net, -973_000);
assert.deepEqual(overview.month.topExpense, { label: "Ăn uống", amount: 1_143_000 });
assert.equal(buildManagerRecentTransactions(dayEntries, [], photoExpenses)
  .filter((item) => item.kind === "expense").length, 3);

const goals = { bigGoalStartDate: "2026-09-01", bigGoalDeadline: "2026-09-30",
  bigGoalTarget: 13_500_000, bigGoalSaved: 10_000_000 };
const progressInput = { asOfDate: day, goals, entries: dayEntries, expenses: [], transactions: [] };
const before = buildMainGoalProgress(progressInput);
const after = buildMainGoalProgress({ ...progressInput, transactions: photoExpenses });
assert.equal(after.achievedAmount, before.achievedAmount, "goal allocations still count as cash outflow without reducing progress");
const accounts = [{ id: "momo", openingBalance: 2_000_000 }];
assert.equal(getLedgerSummary(accounts, photoExpenses, "2026-09").totalBalance, 857_000);

const transfer = { ...photoExpenses[0], id: "transfer", type: "transfer", purpose: "internal_transfer", toAccountId: "bank" };
const ambiguousLegacy = { ...photoExpenses[0], id: "legacy", source: undefined, purpose: undefined };
assert.deepEqual(buildManagerOverview(dayEntries, [], day, [...photoExpenses, transfer, ambiguousLegacy]), overview);
const edited = photoExpenses.map((item, index) => index === 0 ? { ...item, amount: 50_000 } : item);
assert.equal(buildManagerOverview(dayEntries, [], day, edited).day.expense, 1_124_000);
assert.equal(buildManagerOverview(dayEntries, [], day, photoExpenses.slice(1)).day.expense, 1_074_000);
const moved = photoExpenses.map((item) => ({ ...item, date: "2026-10-01" }));
assert.equal(buildManagerOverview(dayEntries, [], day, moved).month.expense, 0);
assert.equal(buildManagerOverview(dayEntries, [], "2026-10-01", moved).day.expense, 1_143_000);
const photoIncome = { ...photoExpenses[0], id: "photo-income", type: "income", purpose: "income", amount: 80_000 };
assert.equal(buildManagerOverview(dayEntries, [], day, [...photoExpenses, photoIncome]).day.income, 250_000);
const refund = { ...photoExpenses[0], id: "jar-refund:r1", source: "spending_jar",
  type: "income", purpose: "goal_allocation", reversesExpense: true, amount: 50_000 };
const withRefund = buildManagerOverview(dayEntries, [], day, [...photoExpenses, refund]);
assert.equal(withRefund.day.income, 170_000, "refunds are not earned income");
assert.equal(withRefund.day.expense, 1_093_000, "refund reverses expense");
assert.equal(withRefund.day.net, -923_000);
assert.equal(buildManagerRecentTransactions(dayEntries, [], [...photoExpenses, refund])
  .find((item) => item.id === "ledger-jar-refund:r1")?.kind, "refund");

// Account money and jar money share one ledger: allocations and internal moves
// never create another income or change assets.
const flowDay = "2026-10-20";
const now = "2026-10-20T03:00:00.000Z";
const account = (id, openingBalance, externalEntries = []) => ({
  id, name: id, type: "bank", openingBalance, budgetEligibility: "eligible",
  externalEntries, createdAt: now, updatedAt: now,
});
const outside = { id: "outside", accountId: "bank", amount: 100_000, type: "unavailable",
  note: "Chưa khả dụng", date: flowDay, recoveries: [], createdAt: now, updatedAt: now };
let ledger = {
  accounts: [account("cash", 1_000_000), account("bank", 500_000, [outside])],
  transactions: [
    { id: "income", accountId: "cash", amount: 200_000, date: flowDay, type: "income",
      source: "manual", category: "Lương", note: "", createdAt: now, updatedAt: now },
    { id: "outside-expense", accountId: "cash", amount: 50_000, date: flowDay, type: "expense",
      source: "manual", category: "Ăn uống", note: "", createdAt: now, updatedAt: now },
    { id: "account-transfer", accountId: "cash", toAccountId: "bank", amount: 100_000,
      date: flowDay, type: "transfer", source: "manual", category: "Chuyển nội bộ",
      note: "", createdAt: now, updatedAt: now },
  ], jars: [], jarActivities: [], updatedAt: now,
};
const jarFields = (name) => ({ name, icon: "🫙", limitAmount: 500_000,
  startDate: flowDay, linkedLabels: [] });
ledger = applyJarCommand(ledger, { kind: "create", id: "jar-1", now, fields: jarFields("Ăn uống") });
ledger = applyJarCommand(ledger, { kind: "create", id: "jar-2", now, fields: jarFields("Đi lại") });
ledger = applyJarCommand(ledger, { kind: "allocate", id: "allocate", now, jarId: "jar-1",
  accountId: "cash", amount: 300_000 });
ledger = applyJarCommand(ledger, { kind: "spend", id: "spend", now, jarId: "jar-1",
  accountId: "cash", amount: 60_000, date: flowDay, category: "Ăn uống", note: "",
  purpose: "daily_expense" });
ledger = applyJarCommand(ledger, { kind: "transfer", id: "jar-transfer", now, jarId: "jar-1",
  toJarId: "jar-2", accountId: "cash", amount: 40_000 });
ledger = applyJarCommand(ledger, { kind: "release", id: "release", now, jarId: "jar-2",
  accountId: "cash", amount: 20_000 });
ledger = applyJarCommand(ledger, { kind: "refund", id: "refund", now, jarId: "jar-1",
  accountId: "cash", amount: 10_000, date: flowDay, note: "" });
const ledgerDay = buildManagerOverview([], [], flowDay, ledger.transactions).day;
const jarFlow = buildDashboardJarFlow(ledgerDay, ledger.transactions, ledger.jarActivities);
assert.deepEqual({ income: ledgerDay.income, expense: ledgerDay.expense, net: ledgerDay.net },
  { income: 200_000, expense: 100_000, net: 100_000 });
assert.deepEqual(jarFlow, {
  incomeNotLinkedToJar: 200_000, incomeLinkedToJar: 0,
  expenseOutsideJar: 50_000, expenseFromJar: 50_000,
  allocatedToJar: 300_000, releasedFromJar: 20_000, transferredBetweenJars: 40_000,
});
const position = getFinancialPosition(ledger);
const spendable = calculateActualAvailableBalance(ledger);
assert.equal(getLedgerSummary(ledger.accounts, ledger.transactions, "2026-10").totalBalance, 1_600_000);
assert.equal(spendable, 1_500_000, "money held outside is excluded");
assert.equal(position.liquid, spendable, "dashboard and jar views use the same available-money scope");
assert.equal(position.reserved, 230_000, "jar spend and refund change both account and jar balances");
assert.equal(position.reserved + (spendable - position.reserved), spendable);
assert.equal(jarFlow.expenseOutsideJar + jarFlow.expenseFromJar, ledgerDay.expense);

// Switching tabs persists only the presentation choice, including after a remount.
const previousStorage = globalThis.localStorage;
const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => { values.set(key, value); },
};
try {
  assert.equal(readDashboardTab(), "overview");
  rememberDashboardTab("allocation");
  assert.equal(readDashboardTab(), "allocation");
  rememberDashboardTab("overview");
  assert.equal(readDashboardTab(), "overview");
  values.set("money-diary-financial-dashboard-tab", "unexpected");
  assert.equal(readDashboardTab(), "overview", "invalid old preferences fall back safely");
  globalThis.localStorage = {
    getItem: () => { throw new Error("storage unavailable"); },
    setItem: () => { throw new Error("storage unavailable"); },
  };
  assert.equal(readDashboardTab(), "overview");
  assert.doesNotThrow(() => rememberDashboardTab("allocation"));
} finally {
  globalThis.localStorage = previousStorage;
}

console.log("Dashboard selector tests passed.");
