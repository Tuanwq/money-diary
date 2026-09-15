import type { AccountTransaction } from "../../account-ledger/accountLedgerModel.ts";
import type { DailyEntry, ExpenseEntry } from "../../../types.ts";
import { getExpenseTotal, getTotalEntryMoney } from "../../../utils/entries.ts";
import type { DailyFinancialSummary, PhotoAttachment } from "../types/photoFinance.ts";

/** Existing diary/expense amounts are legacy authority; only photo-owned ledger
 * transactions are added, since an untagged ledger row may duplicate legacy. */
export function buildDailyFinancialSummaries(
  entries: DailyEntry[], expenses: ExpenseEntry[], transactions: AccountTransaction[]
): Map<string, DailyFinancialSummary> {
  const days = new Map<string, DailyFinancialSummary>();
  function add(date: string, income: number, expense: number) {
    const previous = days.get(date) ?? { date, income: 0, expense: 0, net: 0, hasData: false };
    const nextIncome = previous.income + income;
    const nextExpense = previous.expense + expense;
    days.set(date, { date, income: nextIncome, expense: nextExpense,
      net: nextIncome - nextExpense, hasData: true });
  }
  for (const entry of entries) add(entry.date, getTotalEntryMoney(entry), 0);
  for (const expense of expenses) add(expense.date, 0, getExpenseTotal(expense));
  for (const transaction of transactions) {
    if (transaction.source !== "photo_finance") continue;
    if (transaction.type === "income") add(transaction.date, transaction.amount, 0);
    if (transaction.type === "expense") add(transaction.date, 0, transaction.amount);
    // All transfers are excluded, regardless of account or provenance.
  }
  return days;
}

export function getDailyFinancialSummary(days: Map<string, DailyFinancialSummary>, date: string): DailyFinancialSummary {
  return days.get(date) ?? { date, income: 0, expense: 0, net: 0, hasData: false };
}

export function groupPhotoAttachmentsByDay(
  attachments: PhotoAttachment[], transactions: AccountTransaction[]
) {
  const byId = new Map(transactions.map((transaction) => [transaction.id, transaction]));
  const days = new Map<string, PhotoAttachment[]>();
  for (const attachment of attachments) {
    if (attachment.sourceType !== "account_transaction") continue;
    const transaction = byId.get(attachment.sourceId);
    if (!transaction) continue;
    const list = days.get(transaction.date) ?? [];
    list.push(attachment);
    days.set(transaction.date, list);
  }
  for (const list of days.values()) list.sort((a, b) =>
    Number(b.isCover) - Number(a.isCover) ||
    (byId.get(b.sourceId)?.occurredAt ?? b.createdAt).localeCompare(
      byId.get(a.sourceId)?.occurredAt ?? a.createdAt) ||
    b.createdAt.localeCompare(a.createdAt));
  return days;
}

export function getCalendarPhotoStack(attachments: PhotoAttachment[]) {
  return { visible: attachments.slice(0, 3), extraCount: Math.max(attachments.length - 3, 0) };
}

export function vietnamFinancialDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function vietnamFinancialTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

export function vietnamOccurredAt(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    throw new Error("Ngày hoặc giờ giao dịch không hợp lệ.");
  const occurredAt = new Date(`${date}T${time}:00+07:00`);
  if (Number.isNaN(occurredAt.getTime()) || vietnamFinancialDate(occurredAt) !== date)
    throw new Error("Ngày hoặc giờ giao dịch không hợp lệ.");
  return occurredAt.toISOString();
}

export function getCalendarDates(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const offset = first.getUTCDay();
  return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
    const date = new Date(Date.UTC(year, monthNumber - 1, index - offset + 1));
    return { date: date.toISOString().slice(0, 10), inMonth: date.getUTCMonth() === monthNumber - 1 };
  });
}

export function formatCalendarNet(net: number) {
  if (net === 0) return "0đ";
  const absolute = Math.abs(net);
  const scaled = absolute >= 1_000_000 ? `${Math.round(absolute / 100_000) / 10}tr`
    : absolute >= 1_000 ? `${Math.round(absolute / 100) / 10}k`
      : `${absolute}đ`;
  return `${net > 0 ? "+" : "−"}${scaled}`;
}
