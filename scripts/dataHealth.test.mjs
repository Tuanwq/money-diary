import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
        return nextResolve(`${specifier}.ts`, context);
      }

      throw error;
    }
  },
});

const { DEFAULT_HUB_SETTINGS } = await import(
  "../src/constants/hanoiHub.ts"
);
const { buildDataHealthReport } = await import(
  "../src/features/data-health/dataHealthModel.ts"
);
const { calculateHubIncome } = await import("../src/utils/hubIncome.ts");

const now = "2026-08-01T08:00:00.000Z";
const goals = {
  bigGoalDeadline: "2026-12-31",
  bigGoalName: "Quỹ chính",
  bigGoalSaved: 100_000,
  bigGoalStartDate: "2026-08-01",
  bigGoalTarget: 10_000_000,
  dailyHours: 4,
  dailyIncome: 300_000,
  expenseBudgets: [],
  monthlyHours: 120,
  monthlyIncome: 9_000_000,
  subGoals: [],
  weeklyHours: 28,
  weeklyIncome: 2_100_000,
};
const cleanInput = {
  accounts: [],
  accountTransactions: [],
  balanceChecks: [],
  completedGoals: [],
  entries: [],
  expenses: [],
  goals,
  hubEntries: [],
  hubSettings: DEFAULT_HUB_SETTINGS,
  reconciliations: [],
};

assert.equal(buildDataHealthReport(cleanInput, now).issues.length, 0);

const entry = {
  bonusMoney: 0,
  createdAt: now,
  date: "2026-08-01",
  diary: "",
  id: "entry-1",
  income: 100_000,
  mood: "normal",
  note: "",
  orderCount: 5,
  receivedMoney: 0,
  workHours: 1,
};
const duplicateReport = buildDataHealthReport({
  ...cleanInput,
  entries: [entry, { ...entry, id: "entry-2" }],
}, now);
assert.ok(
  duplicateReport.issues.some((issue) => issue.id === "duplicate:journal:2026-08-01")
);

const hubEntry = {
  createdAt: now,
  date: "2026-08-01",
  diaryIncomeAmount: 1,
  diaryOrderCount: 10,
  diaryWorkHours: 3,
  extraIncome: 0,
  hubType: "HUB_3",
  id: "hub-1",
  isHubShort: false,
  isWellDone: false,
  joins: [],
  note: "",
  operatingCosts: [],
  order: 10,
  shiftName: "10:00 - 13:00",
};
const expectedHubIncome = calculateHubIncome(
  hubEntry,
  DEFAULT_HUB_SETTINGS
).workIncome;
const hubReport = buildDataHealthReport({
  ...cleanInput,
  entries: [
    {
      ...entry,
      income: expectedHubIncome,
      orderCount: 10,
      workHours: 3,
    },
  ],
  hubEntries: [hubEntry],
}, now);
assert.ok(
  hubReport.issues.some((issue) => issue.id === "hub:income-mismatch:hub-1")
);

const account = {
  createdAt: now,
  id: "cash",
  name: "Tiền mặt",
  openingBalance: 100_000,
  type: "cash",
  updatedAt: now,
};
const reconciliation = {
  createdAt: now,
  date: "2026-08-01",
  id: "reconciliation-1",
  lines: [
    {
      accountId: account.id,
      accountName: account.name,
      actualBalance: 120_000,
      difference: 20_000,
      expectedBalance: 100_000,
      note: "",
      reason: "unknown",
    },
  ],
  note: "",
  updatedAt: now,
};
const accountReport = buildDataHealthReport({
  ...cleanInput,
  accounts: [account],
  reconciliations: [reconciliation],
}, now);
assert.ok(
  accountReport.issues.some((issue) =>
    issue.id.startsWith("account:balance-mismatch:")
  )
);

const goalReport = buildDataHealthReport({
  ...cleanInput,
  balanceChecks: [
    {
      actualMoney: 100_000,
      appMoney: 50_000,
      bank: 100_000,
      cash: 0,
      createdAt: now,
      date: "2026-08-01",
      difference: 50_000,
      id: "balance-1",
      note: "",
    },
  ],
}, now);
assert.ok(
  goalReport.issues.some((issue) => issue.id === "goal:balance-snapshot:balance-1")
);

console.log("Data health tests passed.");
