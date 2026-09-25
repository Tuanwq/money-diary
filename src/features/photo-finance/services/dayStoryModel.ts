import type { AccountTransaction } from "../../account-ledger/accountLedgerModel.ts";
import type { DailyEntry, ExpenseEntry } from "../../../types.ts";
import { getExpenseTotal, getTotalEntryMoney } from "../../../utils/entries.ts";
import type { PhotoAttachment } from "../types/photoFinance.ts";

export type StoryTimelineItem = {
  id: string;
  type: AccountTransaction["type"];
  amount: number;
  label: string;
  time: string;
  transaction: AccountTransaction | null;
  photoIndex: number;
};

export function buildStoryTimeline(date: string, transactions: AccountTransaction[],
  entries: DailyEntry[], expenses: ExpenseEntry[], attachments: PhotoAttachment[]): StoryTimelineItem[] {
  const seenJarActivities = new Set<string>();
  const photoByTransaction = new Map<string, number>();
  attachments.forEach((attachment, index) => {
    if (!photoByTransaction.has(attachment.sourceId)) photoByTransaction.set(attachment.sourceId, index);
  });
  const jarLines = new Map<string, AccountTransaction[]>();
  for (const transaction of transactions) if (transaction.jarActivityId) {
    const lines = jarLines.get(transaction.jarActivityId) ?? [];
    lines.push(transaction);
    jarLines.set(transaction.jarActivityId, lines);
  }
  return [
    ...transactions.filter((transaction) => {
      if (transaction.date !== date ||
        !(transaction.source === "photo_finance" || transaction.source === "spending_jar" || transaction.type === "transfer")) return false;
      if (transaction.jarActivityId) {
        if (seenJarActivities.has(transaction.jarActivityId)) return false;
        seenJarActivities.add(transaction.jarActivityId);
      }
      return true;
    }).map((transaction): StoryTimelineItem => {
      const lines = transaction.jarActivityId ? jarLines.get(transaction.jarActivityId) ?? [transaction] : [transaction];
      const photoIndex = lines.map((line) => photoByTransaction.get(line.id) ?? -1).find((index) => index >= 0) ?? -1;
      return { id: transaction.id, type: transaction.type,
        amount: lines.reduce((sum, line) => sum + line.amount, 0),
        label: transaction.note || transaction.category, time: transaction.occurredAt ?? transaction.createdAt,
        transaction, photoIndex };
    }),
    ...entries.filter((entry) => entry.date === date).map((entry): StoryTimelineItem => ({
      id: `legacy-income-${entry.id}`, type: "income", amount: getTotalEntryMoney(entry),
      label: entry.diary || entry.note || "Thu nhập Nhật ký / HUB", time: entry.createdAt,
      transaction: null, photoIndex: -1 })),
    ...expenses.filter((expense) => expense.date === date).map((expense): StoryTimelineItem => ({
      id: `legacy-expense-${expense.id}`, type: "expense", amount: getExpenseTotal(expense),
      label: expense.note || "Chi tiêu Nhật ký", time: expense.createdAt,
      transaction: null, photoIndex: -1 })),
  ].filter((item) => item.amount > 0).sort((a, b) => b.time.localeCompare(a.time));
}
