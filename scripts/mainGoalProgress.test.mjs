import assert from "node:assert/strict";
import {
  buildMainGoalProgress,
  buildMainGoalProgressTimeline,
} from "../src/features/goals/domain/mainGoalProgress.ts";

const goals = {
  bigGoalDeadline: "2026-09-05",
  bigGoalName: "Kiếm ròng 2 triệu",
  bigGoalSaved: 900_000,
  bigGoalStartDate: "2026-09-01",
  bigGoalTarget: 2_000_000,
  dailyHours: 0,
  dailyIncome: 0,
  expenseBudgets: [],
  monthlyHours: 0,
  monthlyIncome: 0,
  subGoals: [],
  weeklyHours: 0,
  weeklyIncome: 0,
};

const entries = [{
  bonusMoney: 0,
  createdAt: "2026-09-05T00:00:00.000Z",
  date: "2026-09-05",
  diary: "",
  id: "income",
  income: 2_500_000,
  mood: "normal",
  note: "",
  orderCount: 0,
  receivedMoney: 0,
  workHours: 0,
}];

const expenses = [{
  breakfast: 50_000,
  createdAt: "2026-09-05T00:00:00.000Z",
  date: "2026-09-05",
  dinner: 50_000,
  id: "expense",
  lunch: 100_000,
  note: "",
  other: 1_300_000,
  otherItems: [
    { amount: 200_000, id: "fuel", label: "Xăng", purpose: "daily_expense" },
    { amount: 100_000, id: "parking", label: "Gửi xe", purpose: "daily_expense" },
    { amount: 1_000_000, id: "debt", label: "Trả nợ", purpose: "goal_allocation" },
  ],
}];

const transactions = [
  {
    accountId: "driver",
    amount: 1_000_000,
    category: "Trả nợ",
    createdAt: "2026-09-05T00:00:00.000Z",
    date: "2026-09-05",
    id: "allocation",
    note: "",
    purpose: "goal_allocation",
    type: "expense",
    updatedAt: "2026-09-05T00:00:00.000Z",
  },
  {
    accountId: "driver",
    amount: 1_000_000,
    category: "Chuyển nội bộ",
    createdAt: "2026-09-05T00:00:00.000Z",
    date: "2026-09-05",
    id: "transfer",
    note: "",
    purpose: "internal_transfer",
    toAccountId: "bank",
    type: "transfer",
    updatedAt: "2026-09-05T00:00:00.000Z",
  },
  {
    accountId: "cash",
    amount: 999_000,
    category: "Legacy",
    createdAt: "2026-09-05T00:00:00.000Z",
    date: "2026-09-05",
    id: "legacy-unclassified",
    note: "",
    type: "expense",
    updatedAt: "2026-09-05T00:00:00.000Z",
  },
];

assert.deepEqual(buildMainGoalProgress({
  asOfDate: "2026-09-05",
  entries,
  expenses,
  goals,
  transactions,
}), {
  endDate: "2026-09-05",
  goalExpenses: 500_000,
  goalIncome: 2_500_000,
  goalNetAmount: 2_000_000,
  progress: 100,
  remainingAmount: 0,
  remainingDays: 0,
  requiredPerDay: 0,
  startDate: "2026-09-01",
  targetAmount: 2_000_000,
  unclassifiedTransactions: 1,
});

const paced = buildMainGoalProgress({
  asOfDate: "2026-09-03",
  entries: [{ ...entries[0], date: "2026-09-03", income: 500_000 }],
  expenses: [{ ...expenses[0], date: "2026-09-03", breakfast: 50_000,
    lunch: 50_000, dinner: 0, other: 0, otherItems: [] }],
  goals,
  transactions: [
    { ...transactions[0], id: "new-income", amount: 100_000, date: "2026-09-03",
      purpose: "income", type: "income" },
    { ...transactions[0], id: "new-expense", amount: 50_000, date: "2026-09-03",
      purpose: "daily_expense", type: "expense" },
  ],
});

assert.equal(paced.goalIncome, 600_000);
assert.equal(paced.goalExpenses, 150_000);
assert.equal(paced.goalNetAmount, 450_000);
assert.equal(paced.remainingAmount, 1_550_000);
assert.equal(paced.remainingDays, 2);
assert.equal(paced.requiredPerDay, 775_000);

const timeline = buildMainGoalProgressTimeline({
  asOfDate: "2026-09-05",
  entries,
  expenses,
  goals,
  transactions,
});
assert.equal(timeline.length, 5);
assert.equal(timeline.at(-1).actualMoney, 2_000_000);
assert.equal(timeline.at(-1).expense, 500_000);

console.log("Main goal progress tests passed.");
