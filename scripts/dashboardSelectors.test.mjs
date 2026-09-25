import assert from "node:assert/strict";
import { buildManagerMonthlyOverview, buildManagerOverview, buildManagerRecentTransactions } from "../src/features/money-diary/utils/managerDashboardSelectors.ts";
import { buildDailyFinancialSummaries, getDailyFinancialSummary } from "../src/features/photo-finance/services/photoFinanceModel.ts";
import { buildMainGoalProgress } from "../src/features/goals/domain/mainGoalProgress.ts";
import { getLedgerSummary } from "../src/features/account-ledger/accountLedgerModel.ts";

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

console.log("Dashboard selector tests passed.");
