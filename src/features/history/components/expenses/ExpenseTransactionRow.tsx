import { StickyNote } from "lucide-react";
import type { ExpenseEntry } from "../../../../types";
import { formatReportDate } from "../../../../utils/date";
import { getExpenseTotal, getOtherExpenseItems } from "../../../../utils/entries";
import { formatMoney } from "../../../../utils/money";
import { HistoryRecordMenu } from "../HistoryRecordMenu";

type ExpenseTransactionRowProps = {
  expense: ExpenseEntry;
  onDelete: () => void;
  onEdit: () => void;
  onView: () => void;
};

export function ExpenseTransactionRow({ expense, onDelete, onEdit, onView }: ExpenseTransactionRowProps) {
  const total = getExpenseTotal(expense);
  const categories = getExpenseCategoryLabels(expense);
  const labels = [...new Set(getOtherExpenseItems(expense).map((item) => item.label))];

  return (
    <article className="expense-transaction-row">
      <button type="button" className="expense-transaction-row__main" onClick={onView}>
        <span><strong>{formatReportDate(expense.date)}</strong><small>{labels[0] ?? (categories.join(" · ") || "Chi tiêu trong ngày")}</small></span>
        <span><strong>−{formatMoney(total)}</strong><small>{categories.join(" · ")}</small></span>
      </button>
      <div className="expense-transaction-row__meta">
        {labels.slice(0, 3).map((label) => <span key={label}>{label}</span>)}
        {expense.note && <span><StickyNote aria-hidden="true" size={13} /> Có ghi chú</span>}
      </div>
      <HistoryRecordMenu label={`khoản chi ${formatReportDate(expense.date)}`} onDelete={onDelete} onEdit={onEdit} onView={onView} />
    </article>
  );
}

export function ExpenseDetails({ expense }: { expense: ExpenseEntry }) {
  const otherItems = getOtherExpenseItems(expense);

  return (
    <div className="history-detail-stack">
      <dl className="history-detail-values">
        <DetailValue label="Ăn sáng" value={formatMoney(expense.breakfast)} />
        <DetailValue label="Ăn trưa" value={formatMoney(expense.lunch)} />
        <DetailValue label="Ăn tối" value={formatMoney(expense.dinner)} />
        <DetailValue label="Khoản khác" value={formatMoney(expense.other)} />
        <DetailValue label="Tổng chi tiêu" value={formatMoney(getExpenseTotal(expense))} />
      </dl>
      {otherItems.length > 0 && <section className="history-detail-text"><h3>Khoản khác theo nhãn</h3><div className="history-detail-rows">{otherItems.map((item) => <p key={item.id}><span>{item.label}</span><strong>{formatMoney(item.amount)}</strong></p>)}</div></section>}
      {expense.note && <section className="history-detail-text"><h3>Ghi chú</h3><p>{expense.note}</p></section>}
    </div>
  );
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function getExpenseCategoryLabels(item: ExpenseEntry) {
  return [
    { label: "Ăn sáng", value: item.breakfast },
    { label: "Ăn trưa", value: item.lunch },
    { label: "Ăn tối", value: item.dinner },
    { label: "Khoản khác", value: item.other },
  ].filter((entry) => entry.value > 0).map((entry) => entry.label);
}
