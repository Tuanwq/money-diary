import type { DailyEntry, ExpenseEntry } from "../types";

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
