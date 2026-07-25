import assert from "node:assert/strict";
import {
  calculateHubProfitTotals,
  getHubOperatingCostTotal,
  summarizeHubOperatingCosts,
} from "../src/utils/hubProfitCore.ts";

const entry = {
  id: "shift-1",
  date: "2026-07-25",
  hubType: "HUB_3",
  shiftName: "10:00 - 13:00",
  order: 10,
  joins: [],
  isWellDone: true,
  isHubShort: false,
  extraIncome: 5_000,
  operatingCosts: [
    {
      id: "cost-1",
      category: "fuel",
      amount: 20_000,
      note: "Đổ xăng",
    },
    {
      id: "cost-2",
      category: "parking",
      amount: 5_000,
      note: "",
    },
  ],
  note: "",
  createdAt: "2026-07-25T10:00:00.000Z",
};

assert.equal(getHubOperatingCostTotal(entry), 25_000);

const profit = calculateHubProfitTotals({
  grossIncome: 105_000,
  hours: 3,
  operatingCost: 25_000,
});
assert.equal(profit.actualProfit, 80_000);
assert.equal(profit.actualProfitPerHour, 26_667);
assert.equal(profit.profitMargin, 76);

const legacyEntry = {
  ...entry,
  id: "shift-2",
  operatingCosts: undefined,
};
assert.equal(getHubOperatingCostTotal(legacyEntry), 0);

const costs = summarizeHubOperatingCosts([entry, legacyEntry]);
assert.deepEqual(
  costs.map(({ label, amount }) => [label, amount]),
  [
    ["Xăng", 20_000],
    ["Gửi xe", 5_000],
  ]
);

console.log("Hub actual profit tests passed.");
