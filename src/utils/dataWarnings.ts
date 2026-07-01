import type {
  BalanceCheckEntry,
  DailyEntry,
  ExpenseEntry,
  GoalScreen,
  Page,
} from "../types";
import { getDateString, toDate } from "./date";
import { getExpenseTotal, getTotalEntryMoney } from "./entries";
import { formatMoney } from "./money";

export type DataWarning = {
  id: string;
  severity: "info" | "warning" | "danger";
  title: string;
  description: string;
  actionLabel: string;
  actionPage: Page;
  actionGoalScreen?: GoalScreen;
  actionDate?: string;
};

type BuildDataWarningsOptions = {
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  balanceChecks: BalanceCheckEntry[];
  today: string;
};

function addDays(dateString: string, days: number) {
  const date = toDate(dateString);
  date.setDate(date.getDate() + days);

  return getDateString(date);
}

function getRecentDates(today: string, days: number) {
  return Array.from({ length: days }, (_, index) => addDays(today, -index));
}

export function buildDataWarnings({
  entries,
  expenses,
  balanceChecks,
  today,
}: BuildDataWarningsOptions): DataWarning[] {
  const entryByDate = new Map(entries.map((entry) => [entry.date, entry]));
  const expenseByDate = new Map(
    expenses.map((expense) => [expense.date, expense])
  );
  const balanceCheckByDate = new Map(
    balanceChecks.map((item) => [item.date, item])
  );
  const recentDates = getRecentDates(today, 14);
  const warnings: DataWarning[] = [];

  const incomeWithoutExpenseDate = recentDates.find((date) => {
    const entry = entryByDate.get(date);

    return Boolean(entry && getTotalEntryMoney(entry) > 0 && !expenseByDate.has(date));
  });

  if (incomeWithoutExpenseDate) {
    const entry = entryByDate.get(incomeWithoutExpenseDate);

    warnings.push({
      id: `income-no-expense-${incomeWithoutExpenseDate}`,
      severity: "warning",
      title: "Có thu nhập nhưng chưa nhập chi tiêu",
      description: `${incomeWithoutExpenseDate}: đã ghi ${formatMoney(
        entry ? getTotalEntryMoney(entry) : 0
      )}, nhưng chưa có chi tiêu cùng ngày.`,
      actionLabel: "Chốt ngày này",
      actionPage: "closeDay",
      actionDate: incomeWithoutExpenseDate,
    });
  }

  const expenseWithoutEntryDate = recentDates.find((date) => {
    const expense = expenseByDate.get(date);

    return Boolean(expense && getExpenseTotal(expense) > 0 && !entryByDate.has(date));
  });

  if (expenseWithoutEntryDate) {
    const expense = expenseByDate.get(expenseWithoutEntryDate);

    warnings.push({
      id: `expense-no-entry-${expenseWithoutEntryDate}`,
      severity: "warning",
      title: "Có chi tiêu nhưng chưa ghi nhật ký",
      description: `${expenseWithoutEntryDate}: đã ghi chi ${formatMoney(
        expense ? getExpenseTotal(expense) : 0
      )}, nhưng chưa có nhật ký thu nhập/tâm trạng.`,
      actionLabel: "Bổ sung nhanh",
      actionPage: "closeDay",
      actionDate: expenseWithoutEntryDate,
    });
  }

  const largeDifferenceCheck = [...balanceChecks]
    .sort((a, b) => b.date.localeCompare(a.date))
    .find((item) => {
      const threshold = Math.max(
        100000,
        Math.round(Math.abs(item.appMoney) * 0.03)
      );

      return Math.abs(item.difference) >= threshold;
    });

  if (largeDifferenceCheck) {
    warnings.push({
      id: `large-balance-difference-${largeDifferenceCheck.id}`,
      severity: "danger",
      title: "Tiền thực tế lệch nhiều so với app tính",
      description: `${largeDifferenceCheck.date}: lệch ${formatMoney(
        largeDifferenceCheck.difference
      )}. Nên kiểm tra lại tiền mặt, tài khoản hoặc dữ liệu thu/chi.`,
      actionLabel: "Kiểm kê lại",
      actionPage: "home",
      actionDate: largeDifferenceCheck.date,
    });
  }

  let missingStreak = 0;

  for (const date of recentDates.slice(1)) {
    const hasAnyData =
      entryByDate.has(date) ||
      expenseByDate.has(date) ||
      balanceCheckByDate.has(date);

    if (hasAnyData) break;

    missingStreak += 1;
  }

  if (missingStreak >= 2) {
    const fromDate = addDays(today, -missingStreak);
    const toDate = addDays(today, -1);

    warnings.push({
      id: `missing-streak-${fromDate}-${toDate}`,
      severity: "info",
      title: "Quên nhập nhiều ngày liên tiếp",
      description: `Bạn chưa có dữ liệu từ ${fromDate} đến ${toDate}. Nên chốt lại các ngày gần nhất để báo cáo chính xác hơn.`,
      actionLabel: "Chốt ngày gần nhất",
      actionPage: "closeDay",
      actionDate: toDate,
    });
  }

  return warnings.slice(0, 4);
}
