import { isExpenseReversal, type AccountTransaction } from "../../account-ledger/accountLedgerModel.ts";
import { getJarBudgetRange, getJarBudgetView, type JarLedger, type SpendingJar } from "./jarModel.ts";

export type JarSpendingEvent = {
  id: string;
  date: string;
  category: string;
  note: string;
  amount: number;
  accountNames: string[];
};

export type JarSpendingAnalysis = {
  periodLabel: string;
  grossSpent: number;
  refunded: number;
  netSpent: number;
  expenseCount: number;
  averageExpense: number;
  categories: Array<{ name: string; amount: number; percentage: number }>;
  recent: JarSpendingEvent[];
};

/** Read-only breakdown of the same linked transactions and period as the jar budget. */
export function getJarSpendingAnalysis(ledger: JarLedger, jar: SpendingJar,
  asOfDate: string): JarSpendingAnalysis {
  const { fromDate, toDate } = getJarBudgetRange(jar, asOfDate);
  const budget = getJarBudgetView(ledger, jar, asOfDate);
  const accountNames = new Map(ledger.accounts.map((account) => [account.id, account.name]));
  const events = new Map<string, { lines: AccountTransaction[]; sortKey: string }>();
  const categoryAmounts = new Map<string, number>();
  let grossSpent = 0;
  let refunded = 0;

  for (const transaction of ledger.transactions) {
    if (transaction.jarId !== jar.id || transaction.date < fromDate || transaction.date > toDate) continue;
    if (isExpenseReversal(transaction)) {
      refunded += transaction.amount;
      continue;
    }
    if (transaction.type !== "expense") continue;

    grossSpent += transaction.amount;
    const category = transaction.category.trim() || "Chưa phân loại";
    categoryAmounts.set(category, (categoryAmounts.get(category) ?? 0) + transaction.amount);

    // One jar spend may have several ledger lines when paid from several accounts.
    const eventId = transaction.jarActivityId ?? transaction.id;
    const sortKey = `${transaction.date}T${transaction.occurredAt ?? transaction.createdAt}`;
    const existing = events.get(eventId);
    if (existing) {
      existing.lines.push(transaction);
      if (sortKey > existing.sortKey) existing.sortKey = sortKey;
    } else {
      events.set(eventId, { lines: [transaction], sortKey });
    }
  }

  const recent = [...events.entries()].map(([id, { lines, sortKey }]): JarSpendingEvent & { sortKey: string } => ({
    id,
    sortKey,
    date: lines[0].date,
    category: [...new Set(lines.map((line) => line.category.trim() || "Chưa phân loại"))].join(" · "),
    note: lines.find((line) => line.note.trim())?.note.trim() ?? "",
    amount: lines.reduce((sum, line) => sum + line.amount, 0),
    accountNames: [...new Set(lines.map((line) => accountNames.get(line.accountId) ?? "Tài khoản đã xóa"))],
  })).sort((a, b) => b.sortKey.localeCompare(a.sortKey)).slice(0, 3)
    .map((event) => ({ id: event.id, date: event.date, category: event.category,
      note: event.note, amount: event.amount, accountNames: event.accountNames }));

  const categories = [...categoryAmounts.entries()].map(([name, amount]) => ({
    name, amount, percentage: grossSpent > 0 ? Math.round(amount / grossSpent * 100) : 0,
  })).sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "vi"));

  return {
    periodLabel: budget.periodLabel,
    grossSpent,
    refunded,
    netSpent: budget.spent,
    expenseCount: events.size,
    averageExpense: events.size > 0 ? Math.round(grossSpent / events.size) : 0,
    categories,
    recent,
  };
}
