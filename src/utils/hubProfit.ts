import type { HubEntry, HubSettings } from "../types/hub";
import { calculateHubIncome } from "./hubIncome";
import {
  calculateHubProfitTotals,
  getHubOperatingCosts,
  getHubShiftHours,
} from "./hubProfitCore";

export {
  getHubOperatingCosts,
  getHubOperatingCostTotal,
  getHubShiftHours,
  HUB_OPERATING_COST_CATEGORIES,
  HUB_OPERATING_COST_LABELS,
  summarizeHubOperatingCosts,
} from "./hubProfitCore";

export function calculateHubActualProfit(
  entry: HubEntry,
  settings: HubSettings
) {
  const income = calculateHubIncome(entry, settings);
  const operatingCosts = getHubOperatingCosts(entry);
  const operatingCost = operatingCosts.reduce(
    (total, cost) => total + cost.amount,
    0
  );
  const hours = getHubShiftHours(entry.shiftName);
  const totals = calculateHubProfitTotals({
    grossIncome: income.total,
    hours,
    operatingCost,
  });

  return {
    ...totals,
    grossIncome: income.total,
    hours,
    operatingCost,
    operatingCosts,
  };
}
