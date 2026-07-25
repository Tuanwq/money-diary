import type {
  HubEntry,
  HubOperatingCost,
  HubOperatingCostCategory,
} from "../types/hub";

export const HUB_OPERATING_COST_LABELS: Record<
  HubOperatingCostCategory,
  string
> = {
  fuel: "Xăng",
  parking: "Gửi xe",
  food: "Ăn uống",
  maintenance: "Bảo dưỡng",
  phone: "Điện thoại",
  other: "Khác",
};

export const HUB_OPERATING_COST_CATEGORIES = Object.keys(
  HUB_OPERATING_COST_LABELS
) as HubOperatingCostCategory[];

export function getHubShiftHours(shiftName: string) {
  const match = shiftName.match(
    /^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/
  );

  if (!match) return 0;

  const [, startHour, startMinute, endHour, endMinute] = match;
  const start = Number(startHour) * 60 + Number(startMinute);
  const end = Number(endHour) * 60 + Number(endMinute);
  const duration = end >= start ? end - start : end + 24 * 60 - start;

  return Math.round((duration / 60) * 10) / 10;
}

export function getHubOperatingCosts(entry: Pick<HubEntry, "operatingCosts">) {
  return (entry.operatingCosts ?? []).filter(
    (cost): cost is HubOperatingCost =>
      Boolean(cost?.id) &&
      HUB_OPERATING_COST_CATEGORIES.includes(cost.category) &&
      Number.isFinite(cost.amount) &&
      cost.amount > 0
  );
}

export function getHubOperatingCostTotal(
  entry: Pick<HubEntry, "operatingCosts">
) {
  return getHubOperatingCosts(entry).reduce(
    (total, cost) => total + cost.amount,
    0
  );
}

export function calculateHubProfitTotals({
  grossIncome,
  hours,
  operatingCost,
}: {
  grossIncome: number;
  hours: number;
  operatingCost: number;
}) {
  const actualProfit = grossIncome - operatingCost;

  return {
    actualProfit,
    actualProfitPerHour:
      hours > 0 ? Math.round(actualProfit / hours) : 0,
    profitMargin:
      grossIncome > 0
        ? Math.round((actualProfit / grossIncome) * 100)
        : 0,
  };
}

export function summarizeHubOperatingCosts(entries: HubEntry[]) {
  const totals = new Map<HubOperatingCostCategory, number>();

  entries.forEach((entry) => {
    getHubOperatingCosts(entry).forEach((cost) => {
      totals.set(cost.category, (totals.get(cost.category) ?? 0) + cost.amount);
    });
  });

  return HUB_OPERATING_COST_CATEGORIES.map((category) => ({
    amount: totals.get(category) ?? 0,
    category,
    label: HUB_OPERATING_COST_LABELS[category],
  }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}
