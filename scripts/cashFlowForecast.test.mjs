import assert from "node:assert/strict";
import {
  buildCashFlowForecast,
  getCashFlowPlanOccurrences,
} from "../src/features/cash-flow/cashFlowForecastModel.ts";

const basePlan = {
  amount: 500_000,
  createdAt: "2026-07-25T00:00:00.000Z",
  enabled: true,
  id: "plan-1",
  label: "Tiền nhà",
  recurrence: "once",
  startDate: "2026-07-26",
  type: "expense",
  updatedAt: "2026-07-25T00:00:00.000Z",
};

assert.deepEqual(
  getCashFlowPlanOccurrences(
    {
      ...basePlan,
      recurrence: "weekly",
      startDate: "2026-07-20",
    },
    "2026-07-25",
    "2026-08-10"
  ),
  ["2026-07-27", "2026-08-03", "2026-08-10"]
);

assert.deepEqual(
  getCashFlowPlanOccurrences(
    {
      ...basePlan,
      recurrence: "monthly",
      startDate: "2027-01-31",
    },
    "2027-01-01",
    "2027-03-31"
  ),
  ["2027-01-31", "2027-02-28", "2027-03-31"]
);

const averages = buildCashFlowForecast({
  currentBalance: 1_000_000,
  entries: [
    {
      bonusMoney: 70_000,
      date: "2026-07-25",
      income: 700_000,
      receivedMoney: 70_000,
    },
  ],
  expenses: [
    {
      breakfast: 70_000,
      date: "2026-07-25",
      dinner: 70_000,
      lunch: 70_000,
      other: 140_000,
    },
  ],
  horizonDays: 7,
  plans: [],
  today: "2026-07-25",
});

assert.deepEqual(averages.average7, {
  expense: 50_000,
  income: 120_000,
  net: 70_000,
});
assert.equal(
  averages.scenarios[0].projectedBalance <
    averages.scenarios[1].projectedBalance,
  true
);
assert.equal(
  averages.scenarios[1].projectedBalance <
    averages.scenarios[2].projectedBalance,
  true
);

const riskForecast = buildCashFlowForecast({
  currentBalance: 1_000_000,
  entries: [],
  expenses: [],
  horizonDays: 7,
  plans: [{ ...basePlan, amount: 1_500_000 }],
  today: "2026-07-25",
});
const realistic = riskForecast.scenarios.find(
  (scenario) => scenario.id === "realistic"
);

assert.equal(realistic?.negativeBalanceDate, "2026-07-26");
assert.equal(realistic?.points[0].plannedExpense, 1_500_000);
assert.equal(realistic?.projectedBalance, -500_000);

const recurringIncomeForecast = buildCashFlowForecast({
  currentBalance: 0,
  entries: [],
  expenses: [],
  horizonDays: 14,
  plans: [
    {
      ...basePlan,
      amount: 200_000,
      recurrence: "weekly",
      startDate: "2026-07-26",
      type: "income",
    },
  ],
  today: "2026-07-25",
});

assert.equal(recurringIncomeForecast.plannedIncome, 400_000);
assert.equal(
  recurringIncomeForecast.scenarios[1].projectedBalance,
  400_000
);

console.log("Cash flow forecast tests passed.");
