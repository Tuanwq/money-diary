import assert from "node:assert/strict";
import { buildManagerMonthlyOverview } from "../src/features/money-diary/utils/managerDashboardSelectors.ts";

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

console.log("Dashboard selector tests passed.");
