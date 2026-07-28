import assert from "node:assert/strict";
import {
  calculateHubProfitTotals,
  getHubOperatingCostTotal,
  summarizeHubOperatingCosts,
} from "../src/utils/hubProfitCore.ts";
import { allocateHubDailyRewards } from "../src/utils/hubDailyRewards.ts";

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

const sameDayEntries = [
  {
    ...entry,
    createdAt: "2026-07-27T10:00:00.000Z",
    date: "2026-07-27",
    extraIncome: 0,
    id: "day-shift-1",
    operatingCosts: [],
    order: 16,
  },
  {
    ...entry,
    createdAt: "2026-07-27T17:55:00.000Z",
    date: "2026-07-27",
    extraIncome: 0,
    id: "day-shift-2",
    operatingCosts: [],
    order: 16,
    shiftName: "17:55 - 21:00",
  },
];
const sameDayRewards = allocateHubDailyRewards(
  sameDayEntries,
  (date, totalOrders) => {
    assert.equal(totalOrders, 32);
    return date === "2026-07-26" ? 70_000 : 50_000;
  }
);

assert.equal(
  sameDayEntries.reduce(
    (total, item) => total + (sameDayRewards.get(item.id) ?? 0),
    0
  ),
  50_000
);
assert.equal(sameDayRewards.get("day-shift-1"), 25_000);
assert.equal(sameDayRewards.get("day-shift-2"), 25_000);

const sundayEntries = sameDayEntries.map((item) => ({
  ...item,
  date: "2026-07-26",
}));
const sundayRewards = allocateHubDailyRewards(
  sundayEntries,
  (date, totalOrders) => {
    assert.equal(date, "2026-07-26");
    assert.equal(totalOrders, 32);
    return 70_000;
  }
);

assert.equal(
  sundayEntries.reduce(
    (total, item) => total + (sundayRewards.get(item.id) ?? 0),
    0
  ),
  70_000
);

const mixedHubEntries = [
  {
    ...sameDayEntries[0],
    hubType: "HUB_1",
    id: "hub-1-shift",
    order: 5,
  },
  {
    ...sameDayEntries[1],
    hubType: "HUB_3",
    id: "hub-3-shift",
    order: 15,
  },
];
let mixedEligibleOrders = 0;
const mixedHubRewards = allocateHubDailyRewards(
  mixedHubEntries,
  (_date, totalOrders) => {
    mixedEligibleOrders = totalOrders;
    return totalOrders >= 20 ? 30_000 : 0;
  },
  (item) => item.hubType !== "HUB_1"
);

assert.equal(mixedEligibleOrders, 15);
assert.equal(
  mixedHubEntries.reduce(
    (total, item) => total + (mixedHubRewards.get(item.id) ?? 0),
    0
  ),
  0
);

const eligibleMixedHubEntries = mixedHubEntries.map((item, index) => ({
  ...item,
  hubType: index === 0 ? "HUB_5" : "HUB_3",
  order: 10,
}));
const eligibleMixedHubRewards = allocateHubDailyRewards(
  eligibleMixedHubEntries,
  (_date, totalOrders) => (totalOrders >= 20 ? 30_000 : 0),
  (item) => item.hubType !== "HUB_1"
);

assert.equal(
  eligibleMixedHubEntries.reduce(
    (total, item) =>
      total + (eligibleMixedHubRewards.get(item.id) ?? 0),
    0
  ),
  30_000
);

console.log("Hub actual profit tests passed.");
