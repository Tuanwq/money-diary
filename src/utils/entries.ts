import type { DailyEntry, ExpenseEntry, OtherExpenseItem } from "../types";

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
  const items = getOtherExpenseItems(expense);

  if (items.length === 1) return items[0].label;
  if (items.length > 1) return `${items.length} khoản khác`;

  return expense.otherLabel?.trim() || UNLABELED_OTHER_EXPENSE_LABEL;
}

export function getOtherExpenseItems(expense: ExpenseEntry): OtherExpenseItem[] {
  const savedItems =
    expense.otherItems
      ?.filter((item) => item.amount > 0)
      .map((item) => ({
        ...item,
        label: item.label?.trim() || UNLABELED_OTHER_EXPENSE_LABEL,
      })) ?? [];

  if (savedItems.length > 0) return savedItems;

  if (expense.other > 0) {
    return [
      {
        id: `${expense.id}-legacy-other`,
        amount: expense.other,
        label: expense.otherLabel?.trim() || UNLABELED_OTHER_EXPENSE_LABEL,
      },
    ];
  }

  return [];
}

export function buildOtherExpenseBreakdown(
  expenses: ExpenseEntry[],
  range?: { fromDate: string; toDate: string }
): OtherExpenseBreakdownItem[] {
  const breakdown = new Map<string, OtherExpenseBreakdownItem>();

  expenses
    .filter((expense) => {
      if (!range) return true;

      return expense.date >= range.fromDate && expense.date <= range.toDate;
    })
    .forEach((expense) => {
      getOtherExpenseItems(expense).forEach((item) => {
        const current = breakdown.get(item.label) ?? {
          label: item.label,
          total: 0,
          count: 0,
        };

        breakdown.set(item.label, {
          ...current,
          total: current.total + item.amount,
          count: current.count + 1,
        });
      });
    });

  return [...breakdown.values()].sort((a, b) => b.total - a.total);
}
