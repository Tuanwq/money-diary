import assert from "node:assert/strict";
import {
  buildCashFlowAccountProjections,
  buildCashFlowForecast,
  buildCashFlowSimulation,
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

const advancedForecast = buildCashFlowForecast({
  budgets: [
    {
      createdAt: "2026-07-01T00:00:00.000Z",
      id: "fuel-budget",
      label: "Xăng",
      monthlyLimit: 310_000,
    },
  ],
  currentBalance: 2_000_000,
  entries: averages.average7.income
    ? [
        {
          bonusMoney: 0,
          date: "2026-07-25",
          income: 840_000,
          receivedMoney: 0,
        },
      ]
    : [],
  expenses: [],
  goalCommitments: [
    {
      deadline: "2026-08-02",
      id: "goal-1",
      label: "Trả nợ",
      remaining: 90_000,
      type: "sub",
    },
  ],
  horizonDays: 7,
  plans: [],
  today: "2026-07-25",
});
const advancedRealistic = advancedForecast.scenarios[1];

assert.equal(advancedForecast.budgetEnvelopes[0].remaining, 310_000);
assert.equal(advancedForecast.totalBudgetEnvelope > 0, true);
assert.equal(advancedForecast.totalGoalReserve, 78_750);
assert.equal(advancedRealistic.points[0].goalReserve, 11_250);

const simulated = buildCashFlowSimulation(advancedRealistic, 2_000_000, {
  adjustments: [
    {
      amount: 500_000,
      date: "2026-07-26",
      id: "purchase",
      label: "Mua thử",
      type: "expense",
    },
    {
      days: 3,
      id: "rest",
      label: "Nghỉ thử",
      startDate: "2026-07-26",
      type: "rest",
    },
  ],
});

assert.equal(simulated.extraExpense, 500_000);
const expectedLostIncome = advancedRealistic.points
  .slice(0, 3)
  .reduce((total, point) => total + point.historicalIncome, 0);
assert.equal(simulated.lostIncome, expectedLostIncome);
assert.equal(
  simulated.baselineDifference,
  -(500_000 + expectedLostIncome)
);

const accountProjection = buildCashFlowAccountProjections({
  accounts: [{ balance: 1_000_000, id: "bank", name: "Ngân hàng" }],
  fromDate: "2026-07-26",
  plans: [
    {
      ...basePlan,
      accountId: "bank",
      amount: 100_000,
      startDate: "2026-07-26",
    },
  ],
  simulationAdjustments: [
    {
      accountId: "bank",
      amount: 500_000,
      date: "2026-07-27",
      id: "purchase",
      label: "Mua thử",
      type: "expense",
    },
  ],
  toDate: "2026-08-01",
});

assert.equal(accountProjection[0].plannedChange, -600_000);
assert.equal(accountProjection[0].projectedBalance, 400_000);

const combinedSimulation = buildCashFlowSimulation(
  advancedRealistic,
  2_000_000,
  {
    adjustments: [
      {
        amount: 200_000,
        date: "2026-07-27",
        id: "extra-income",
        label: "Thu thêm",
        type: "income",
      },
      {
        amount: 50_000,
        endDate: "2026-07-27",
        id: "daily-expense",
        label: "Chi thêm mỗi ngày",
        startDate: "2026-07-26",
        type: "daily_expense",
      },
    ],
  }
);

assert.equal(combinedSimulation.appliedAdjustmentCount, 2);
assert.equal(combinedSimulation.extraIncome, 200_000);
assert.equal(combinedSimulation.extraExpense, 100_000);
assert.equal(combinedSimulation.baselineDifference, 100_000);

console.log("Cash flow forecast tests passed.");
