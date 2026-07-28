import { HUB_TYPE_LABEL } from "../constants/hanoiHub";
import type { ExpenseEntry } from "../types";
import type { HubEntry, HubSettings, HubType } from "../types/hub";
import { getDateString, toDate } from "./date";
import { getExpenseTotal } from "./entries";
import { calculateHubIncomeByEntry } from "./hubIncome";
import {
  calculateHubProfitTotals,
  getHubOperatingCostTotal,
  getHubShiftHours,
} from "./hubProfitCore";

export type HubAnalyticsRow = {
  entry: HubEntry;
  grossIncome: number;
  workIncome: number;
  separatedReward: number;
  operatingCost: number;
  actualProfit: number;
  orderCount: number;
  joinOrderCount: number;
  hours: number;
  incomePerHour: number;
  actualProfitPerHour: number;
  profitMargin: number;
};

export type HubAnalyticsSummary = {
  shifts: number;
  grossIncome: number;
  workIncome: number;
  separatedReward: number;
  operatingCost: number;
  actualProfit: number;
  orders: number;
  joinOrders: number;
  hours: number;
  incomePerHour: number;
  actualProfitPerHour: number;
  profitMargin: number;
};

export type HubPerformanceItem = {
  key: string;
  label: string;
  hubType?: HubType;
  shiftName?: string;
  shifts: number;
  workIncome: number;
  grossIncome: number;
  operatingCost: number;
  actualProfit: number;
  orders: number;
  joinOrders: number;
  hours: number;
  incomePerHour: number;
  actualProfitPerHour: number;
  profitMargin: number;
  averageIncome: number;
  averageProfit: number;
};

export type HubReport = {
  title: string;
  fromDate: string;
  toDate: string;
  summary: HubAnalyticsSummary;
  previousSummary: HubAnalyticsSummary;
  changePercent: number | null;
  bestDay: { date: string; actualProfit: number } | null;
  worstDay: { date: string; actualProfit: number } | null;
  notes: string[];
};

export function buildHubAnalyticsRows(
  entries: HubEntry[],
  settings: HubSettings
): HubAnalyticsRow[] {
  const incomeByEntry = calculateHubIncomeByEntry(entries, settings);

  return entries.map((entry) => {
    const income = incomeByEntry.get(entry.id);
    if (!income) {
      throw new Error(`Missing Hub income for entry ${entry.id}`);
    }
    const hours = getHubShiftHours(entry.shiftName);
    const workIncome = income.workIncome;
    const operatingCost = getHubOperatingCostTotal(entry);
    const profit = calculateHubProfitTotals({
      grossIncome: income.total,
      hours,
      operatingCost,
    });

    return {
      entry,
      grossIncome: income.total,
      workIncome,
      separatedReward: income.excludedFromWorkIncome,
      operatingCost,
      actualProfit: profit.actualProfit,
      orderCount: entry.order,
      joinOrderCount: income.totalJoinChildOrders,
      hours,
      incomePerHour: hours > 0 ? Math.round(workIncome / hours) : 0,
      actualProfitPerHour: profit.actualProfitPerHour,
      profitMargin: profit.profitMargin,
    };
  });
}

export function summarizeHubRows(rows: HubAnalyticsRow[]): HubAnalyticsSummary {
  const summary = rows.reduce(
    (total, row) => ({
      shifts: total.shifts + 1,
      grossIncome: total.grossIncome + row.grossIncome,
      workIncome: total.workIncome + row.workIncome,
      separatedReward: total.separatedReward + row.separatedReward,
      operatingCost: total.operatingCost + row.operatingCost,
      actualProfit: total.actualProfit + row.actualProfit,
      orders: total.orders + row.orderCount,
      joinOrders: total.joinOrders + row.joinOrderCount,
      hours: total.hours + row.hours,
    }),
    {
      shifts: 0,
      grossIncome: 0,
      workIncome: 0,
      separatedReward: 0,
      operatingCost: 0,
      actualProfit: 0,
      orders: 0,
      joinOrders: 0,
      hours: 0,
    }
  );

  return {
    ...summary,
    hours: Math.round(summary.hours * 10) / 10,
    incomePerHour:
      summary.hours > 0 ? Math.round(summary.workIncome / summary.hours) : 0,
    actualProfitPerHour:
      summary.hours > 0
        ? Math.round(summary.actualProfit / summary.hours)
        : 0,
    profitMargin:
      summary.grossIncome > 0
        ? Math.round((summary.actualProfit / summary.grossIncome) * 100)
        : 0,
  };
}

export function filterHubRowsByDate(
  rows: HubAnalyticsRow[],
  fromDate: string,
  toDate: string
) {
  return rows.filter((row) => {
    if (fromDate && row.entry.date < fromDate) return false;
    if (toDate && row.entry.date > toDate) return false;
    return true;
  });
}

export function groupHubPerformance(
  rows: HubAnalyticsRow[],
  groupBy: "hub" | "shift",
  sortBy:
    | "workIncome"
    | "incomePerHour"
    | "actualProfit"
    | "actualProfitPerHour" = "incomePerHour"
): HubPerformanceItem[] {
  const map = new Map<string, HubAnalyticsRow[]>();

  for (const row of rows) {
    const key =
      groupBy === "hub"
        ? row.entry.hubType
        : `${row.entry.hubType}|${row.entry.shiftName}`;
    const current = map.get(key) ?? [];
    current.push(row);
    map.set(key, current);
  }

  return Array.from(map.entries())
    .map(([key, groupRows]) => {
      const summary = summarizeHubRows(groupRows);
      const [hubType, shiftName] = key.split("|") as [HubType, string?];

      return {
        key,
        label:
          groupBy === "hub"
            ? HUB_TYPE_LABEL[hubType]
            : `${HUB_TYPE_LABEL[hubType]} · ${shiftName || "Chưa có ca"}`,
        hubType,
        shiftName,
        shifts: summary.shifts,
        workIncome: summary.workIncome,
        grossIncome: summary.grossIncome,
        operatingCost: summary.operatingCost,
        actualProfit: summary.actualProfit,
        orders: summary.orders,
        joinOrders: summary.joinOrders,
        hours: summary.hours,
        incomePerHour: summary.incomePerHour,
        actualProfitPerHour: summary.actualProfitPerHour,
        profitMargin: summary.profitMargin,
        averageIncome:
          summary.shifts > 0 ? Math.round(summary.workIncome / summary.shifts) : 0,
        averageProfit:
          summary.shifts > 0
            ? Math.round(summary.actualProfit / summary.shifts)
            : 0,
      };
    })
    .sort((a, b) => b[sortBy] - a[sortBy]);
}

export function getWeekRangeFromDate(dateString: string, offset = 0) {
  const date = toDate(dateString);
  const day = date.getDay() === 0 ? 7 : date.getDay();
  date.setDate(date.getDate() - day + 1 + offset * 7);
  const fromDate = getDateString(date);
  date.setDate(date.getDate() + 6);

  return {
    fromDate,
    toDate: getDateString(date),
  };
}

export function getMonthRangeFromDate(dateString: string, offset = 0) {
  const [year, month] = dateString.slice(0, 7).split("-").map(Number);
  const start = new Date(year, month - 1 + offset, 1);
  const end = new Date(year, month + offset, 0);

  return {
    fromDate: getDateString(start),
    toDate: getDateString(end),
  };
}

function getDayTotals(rows: HubAnalyticsRow[]) {
  const map = new Map<string, number>();

  for (const row of rows) {
    map.set(
      row.entry.date,
      (map.get(row.entry.date) ?? 0) + row.actualProfit
    );
  }

  return Array.from(map.entries())
    .map(([date, actualProfit]) => ({ date, actualProfit }))
    .sort((a, b) => b.actualProfit - a.actualProfit);
}

function getChangePercent(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;

  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function buildHubReport({
  title,
  rows,
  expenses,
  fromDate,
  toDate,
  previousFromDate,
  previousToDate,
}: {
  title: string;
  rows: HubAnalyticsRow[];
  expenses: ExpenseEntry[];
  fromDate: string;
  toDate: string;
  previousFromDate: string;
  previousToDate: string;
}): HubReport {
  const currentRows = filterHubRowsByDate(rows, fromDate, toDate);
  const previousRows = filterHubRowsByDate(rows, previousFromDate, previousToDate);
  const summary = summarizeHubRows(currentRows);
  const previousSummary = summarizeHubRows(previousRows);
  const dayTotals = getDayTotals(currentRows);
  const lowHourReason =
    previousSummary.hours > 0 && summary.hours < previousSummary.hours;
  const lowOrderReason =
    previousSummary.orders > 0 && summary.orders < previousSummary.orders;
  const currentExpenses = expenses
    .filter((expense) => expense.date >= fromDate && expense.date <= toDate)
    .reduce((sum, expense) => sum + getExpenseTotal(expense), 0);
  const previousExpenses = expenses
    .filter(
      (expense) =>
        expense.date >= previousFromDate && expense.date <= previousToDate
    )
    .reduce((sum, expense) => sum + getExpenseTotal(expense), 0);
  const notes: string[] = [];

  if (lowHourReason) notes.push("Số giờ làm thấp hơn kỳ trước.");
  if (lowOrderReason) notes.push("Tổng đơn thấp hơn kỳ trước.");
  if (summary.operatingCost > previousSummary.operatingCost) {
    notes.push("Chi phí vận hành Hub cao hơn kỳ trước.");
  }
  if (currentExpenses > previousExpenses) notes.push("Chi tiêu cao hơn kỳ trước.");
  if (summary.actualProfitPerHour < previousSummary.actualProfitPerHour) {
    notes.push("Lợi nhuận/giờ thấp hơn kỳ trước.");
  }
  if (notes.length === 0) notes.push("Chưa thấy nguyên nhân giảm rõ ràng.");

  return {
    title,
    fromDate,
    toDate,
    summary,
    previousSummary,
    changePercent: getChangePercent(
      summary.actualProfit,
      previousSummary.actualProfit
    ),
    bestDay: dayTotals[0] ?? null,
    worstDay: dayTotals.at(-1) ?? null,
    notes,
  };
}
