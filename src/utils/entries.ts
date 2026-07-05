import type { DailyEntry, ExpenseEntry } from "../types";

export type OtherExpenseBreakdownItem = {
  label: string;
  total: number;
  count: number;
};

export const UNLABELED_OTHER_EXPENSE_LABEL = "Khác chưa gắn nhãn";

export function getMainIncome(entry: DailyEntry) {
  return entry.income ?? 0;
}

export function getReceivedMoney(entry: DailyEntry) {
  return entry.receivedMoney ?? 0;
}

export function getBonusMoney(entry: DailyEntry) {
  return entry.bonusMoney ?? 0;
}

// Thu nhập tính bình thường: dùng cho tiền thực tế hôm nay và biểu đồ
export function getNormalIncome(entry: DailyEntry) {
  return getMainIncome(entry) + getBonusMoney(entry);
}

// Tổng tiền thực sự nhận được: dùng cho tuần, tháng, tổng hành trình, tiền hiện có
export function getTotalEntryMoney(entry: DailyEntry) {
  return getMainIncome(entry) + getBonusMoney(entry) + getReceivedMoney(entry);
}

export function getExpenseTotal(expense: ExpenseEntry) {
  return expense.breakfast + expense.lunch + expense.dinner + expense.other;
}

export function getOtherExpenseLabel(expense: ExpenseEntry) {
  return expense.otherLabel?.trim() || UNLABELED_OTHER_EXPENSE_LABEL;
}

export function buildOtherExpenseBreakdown(
  expenses: ExpenseEntry[],
  range?: { fromDate: string; toDate: string }
): OtherExpenseBreakdownItem[] {
  const breakdown = new Map<string, OtherExpenseBreakdownItem>();

  expenses
    .filter((expense) => {
      if (expense.other <= 0) return false;
      if (!range) return true;

      return expense.date >= range.fromDate && expense.date <= range.toDate;
    })
    .forEach((expense) => {
      const label = getOtherExpenseLabel(expense);
      const current = breakdown.get(label) ?? {
        label,
        total: 0,
        count: 0,
      };

      breakdown.set(label, {
        ...current,
        total: current.total + expense.other,
        count: current.count + 1,
      });
    });

  return [...breakdown.values()].sort((a, b) => b.total - a.total);
}
