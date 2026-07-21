import { ArrowDownLeft, ArrowRight, ArrowUpRight, Inbox } from "lucide-react";
import type { DailyEntry, ExpenseEntry } from "../../../../types";
import { formatReportDate } from "../../../../utils/date";
import { getExpenseTotal, getTotalEntryMoney } from "../../../../utils/entries";
import { formatMoney } from "../../../../utils/money";

type RecentTransactionsProps = {
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  onViewAll: () => void;
};

type TransactionItem = {
  amount: number;
  date: string;
  description: string;
  id: string;
  kind: "expense" | "income";
  source: string;
};

export function RecentTransactions({
  entries,
  expenses,
  onViewAll,
}: RecentTransactionsProps) {
  const transactions: TransactionItem[] = [
    ...entries.map((entry) => ({
      amount: getTotalEntryMoney(entry),
      date: entry.date,
      description: entry.diary.trim() || entry.note.trim() || "Thu nhập trong ngày",
      id: `income-${entry.id}`,
      kind: "income" as const,
      source: "Nhật ký / Hub",
    })),
    ...expenses.map((expense) => ({
      amount: getExpenseTotal(expense),
      date: expense.date,
      description: expense.note.trim() || "Chi tiêu trong ngày",
      id: `expense-${expense.id}`,
      kind: "expense" as const,
      source: "Chi tiêu",
    })),
  ]
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind))
    .slice(0, 6);

  return (
    <section className="money-card money-recent-transactions" aria-labelledby="recent-transactions-title">
      <div className="money-section-heading money-section-heading-inline">
        <div>
          <h2 id="recent-transactions-title">Giao dịch gần đây</h2>
          <p>Thu nhập và chi tiêu mới nhất đã được ghi.</p>
        </div>
        {transactions.length > 0 && (
          <button type="button" className="money-text-action" onClick={onViewAll}>
            <span>Xem tất cả</span>
            <ArrowRight aria-hidden="true" size={17} />
          </button>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="money-empty-state">
          <Inbox aria-hidden="true" size={28} />
          <strong>Chưa có giao dịch</strong>
          <p>Khoản thu hoặc chi đầu tiên sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <div className="money-transaction-list">
          {transactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </div>
      )}
    </section>
  );
}

function TransactionRow({ transaction }: { transaction: TransactionItem }) {
  const income = transaction.kind === "income";
  const Icon = income ? ArrowDownLeft : ArrowUpRight;

  return (
    <article className="money-transaction-row">
      <span className={`money-transaction-icon ${income ? "is-income" : "is-expense"}`} aria-hidden="true">
        <Icon size={19} />
      </span>
      <div className="money-transaction-copy">
        <strong>{transaction.description}</strong>
        <span>{transaction.source} · {formatReportDate(transaction.date)}</span>
      </div>
      <strong className={`money-transaction-amount ${income ? "is-income" : "is-expense"}`}>
        <span className="money-visually-hidden">{income ? "Thu nhập" : "Chi tiêu"}</span>
        {income ? "+" : "−"}{formatMoney(transaction.amount)}
      </strong>
    </article>
  );
}
