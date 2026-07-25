import assert from "node:assert/strict";
import {
  buildAutomationEvents,
  planAutomationExecutions,
} from "../src/features/automation/automationModel.ts";

const timestamp = "2026-07-25T10:00:00.000Z";
const events = buildAutomationEvents({
  balanceChecks: [
    {
      actualMoney: 1100,
      appMoney: 1000,
      bank: 600,
      cash: 500,
      createdAt: timestamp,
      date: "2026-07-25",
      difference: 100,
      id: "balance-1",
      note: "",
    },
  ],
  entries: [
    {
      bonusMoney: 100,
      createdAt: timestamp,
      date: "2026-07-25",
      diary: "",
      id: "entry-1",
      income: 900,
      mood: "normal",
      note: "",
      orderCount: 10,
      receivedMoney: 0,
      workHours: 4,
    },
  ],
  expenses: [
    {
      breakfast: 0,
      createdAt: timestamp,
      date: "2026-07-25",
      dinner: 0,
      id: "expense-1",
      lunch: 0,
      note: "",
      other: 200,
      otherItems: [{ amount: 200, id: "other-1", label: "Xăng" }],
    },
  ],
  hubEntries: [
    {
      createdAt: timestamp,
      date: "2026-07-25",
      diaryIncomeAmount: 500,
      extraIncome: 0,
      hubType: "HUB_3",
      id: "hub-1",
      isHubShort: false,
      isWellDone: false,
      joins: [],
      note: "",
      order: 10,
      shiftName: "10:00 - 13:00",
    },
  ],
});

assert.equal(events.length, 4);

const baseRule = {
  action: "ledger",
  activeFrom: "2026-07-25T09:00:00.000Z",
  amountMode: "full",
  amountValue: 0,
  createdAt: "2026-07-25T09:00:00.000Z",
  enabled: true,
  expenseLabel: "",
  hubType: "",
  id: "rule-1",
  minimumAmount: 0,
  name: "Quy tắc",
  targetId: "account-1",
  trigger: "journal_income",
  updatedAt: "2026-07-25T09:00:00.000Z",
};

const incomeExecutions = planAutomationExecutions({
  events,
  processedKeys: [],
  rules: [{ ...baseRule, amountMode: "percent", amountValue: 20 }],
});

assert.equal(incomeExecutions.length, 1);
assert.equal(incomeExecutions[0].amount, 200);

const expenseExecutions = planAutomationExecutions({
  events,
  processedKeys: [],
  rules: [
    {
      ...baseRule,
      expenseLabel: "Xăng",
      id: "rule-expense",
      minimumAmount: 100,
      trigger: "expense",
    },
  ],
});

assert.equal(expenseExecutions.length, 1);
assert.equal(expenseExecutions[0].amount, 200);

const hubExecutions = planAutomationExecutions({
  events,
  processedKeys: [],
  rules: [
    {
      ...baseRule,
      amountMode: "fixed",
      amountValue: 50,
      hubType: "HUB_3",
      id: "rule-hub",
      trigger: "hub_shift",
    },
  ],
});

assert.equal(hubExecutions.length, 1);
assert.equal(hubExecutions[0].amount, 50);

assert.equal(
  planAutomationExecutions({
    events,
    processedKeys: [hubExecutions[0].idempotencyKey],
    rules: [
      {
        ...baseRule,
        hubType: "HUB_3",
        id: "rule-hub",
        trigger: "hub_shift",
      },
    ],
  }).length,
  0
);

console.log("Automation rule tests passed.");
