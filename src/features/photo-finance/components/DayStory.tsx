import { X } from "lucide-react";
import { useMemo } from "react";
import { usePhotoDialog } from "../hooks/usePhotoDialog.ts";
import { createPortal } from "react-dom";
import type { AccountTransaction, FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import type { DailyEntry, ExpenseEntry } from "../../../types.ts";
import { getExpenseTotal, getTotalEntryMoney } from "../../../utils/entries.ts";
import { formatMoney } from "../../../utils/money.ts";
import type { DailyFinancialSummary as Summary, PhotoAttachment } from "../types/photoFinance.ts";
import type { createPhotoAttachmentRepository } from "../services/photoAttachmentRepository.ts";
import { DailyFinancialSummary } from "./DailyFinancialSummary.tsx";
import { DayStoryCarousel } from "./DayStoryCarousel.tsx";

export function DayStory({ accounts, attachments, date, entries, expenses, isOpen,
  onAddPhoto, onClose, onDeletePhoto, onDeleteTransaction, onEditTransaction,
  onMakeCover, repository, summary, transactions }: {
  accounts: FinancialAccount[]; attachments: PhotoAttachment[]; date: string;
  entries: DailyEntry[]; expenses: ExpenseEntry[]; isOpen: boolean;
  onAddPhoto: (transaction: AccountTransaction) => void;
  onClose: () => void; onDeletePhoto: (attachment: PhotoAttachment) => void;
  onDeleteTransaction: (transaction: AccountTransaction) => void;
  onEditTransaction: (transaction: AccountTransaction) => void;
  onMakeCover: (attachment: PhotoAttachment) => void;
  repository: ReturnType<typeof createPhotoAttachmentRepository>;
  summary: Summary; transactions: AccountTransaction[];
}) {
  const timeline = useMemo(() => [
    ...transactions.filter((transaction) => transaction.date === date &&
      (transaction.source === "photo_finance" || transaction.type === "transfer"))
      .map((transaction) => ({ id: transaction.id, type: transaction.type,
        amount: transaction.amount, label: transaction.note || transaction.category,
        time: transaction.occurredAt ?? transaction.createdAt,
        transaction })),
    ...entries.filter((entry) => entry.date === date).map((entry) => ({
      id: `legacy-income-${entry.id}`, type: "income", amount: getTotalEntryMoney(entry),
      label: entry.diary || entry.note || "Thu nhập Nhật ký / HUB", time: entry.createdAt,
      transaction: null })),
    ...expenses.filter((expense) => expense.date === date).map((expense) => ({
      id: `legacy-expense-${expense.id}`, type: "expense", amount: getExpenseTotal(expense),
      label: expense.note || "Chi tiêu Nhật ký", time: expense.createdAt,
      transaction: null })),
  ].filter((item) => item.amount > 0).sort((a, b) => b.time.localeCompare(a.time)),
  [date, entries, expenses, transactions]);

  usePhotoDialog(isOpen, onClose);
  if (!isOpen) return null;
  return createPortal(<div className="photo-finance-story-backdrop">
    <main aria-label={`Câu chuyện trong ngày ${date}`} className="photo-finance-story" role="dialog" aria-modal="true">
      <header><div><span>Nhật ký tài chính</span><h2>Câu chuyện trong ngày</h2><p>{date}</p></div>
        <button aria-label="Đóng câu chuyện" onClick={onClose} type="button"><X size={22} /></button></header>
      <DayStoryCarousel accounts={accounts} attachments={attachments} repository={repository}
        transactions={transactions} onAddPhoto={onAddPhoto} onDeletePhoto={onDeletePhoto}
        onEditTransaction={onEditTransaction} onMakeCover={onMakeCover} />
      <section className="photo-finance-timeline"><h3>Dòng tiền trong ngày</h3>
        {timeline.length === 0 ? <p>Chưa có khoản thu hoặc chi trong ngày.</p>
          : timeline.map((item) => <article key={item.id}>
            <div><strong>{item.label}</strong><small>{item.transaction?.occurredAt
              ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit",
                minute: "2-digit" }).format(new Date(item.transaction.occurredAt))
              : "Bản ghi trong ngày"}</small></div>
            <strong className={item.type === "expense" ? "photo-finance-outflow" : undefined}>{item.type === "income" ? "+" : item.type === "expense" ? "−" : "↔"}{formatMoney(item.amount)}</strong>
            {item.transaction?.source === "photo_finance" && <div className="photo-finance-timeline-actions">
              <button onClick={() => onEditTransaction(item.transaction!)} type="button">Sửa</button>
              <button onClick={() => onDeleteTransaction(item.transaction!)} type="button">Xóa giao dịch</button>
            </div>}
          </article>)}
      </section>
      <DailyFinancialSummary summary={summary} />
    </main>
  </div>, document.body);
}
