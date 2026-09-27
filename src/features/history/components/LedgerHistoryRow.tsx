import type { AccountTransaction, FinancialAccount } from "../../account-ledger/accountLedgerModel";
import { formatReportDate } from "../../../utils/date";
import { formatMoney } from "../../../utils/money";
import "./LedgerHistoryRow.css";

export function LedgerHistoryRow({ transaction, accounts, onView }: {
  transaction: AccountTransaction;
  accounts: FinancialAccount[];
  onView: () => void;
}) {
  const accountName = accounts.find((account) => account.id === transaction.accountId)?.name ?? "Tài khoản cũ";
  const toAccountName = accounts.find((account) => account.id === transaction.toAccountId)?.name ?? "Tài khoản nhận";
  const place = transaction.type === "transfer" ? `${accountName} → ${toAccountName}` : accountName;
  const prefix = transaction.type === "income" ? "+" : transaction.type === "expense" ? "−" : "↔ ";
  return (
    <article className={`expense-transaction-row ledger-history-row ledger-history-row--${transaction.type}`}>
      <button type="button" className="expense-transaction-row__main" onClick={onView}>
        <span><strong>{formatReportDate(transaction.date)}</strong><small>{transaction.note || transaction.category || place}</small></span>
        <span><strong>{prefix}{formatMoney(transaction.amount)}</strong><small>{place}</small></span>
      </button>
      <div className="expense-transaction-row__meta">
        <span>{transaction.category || "Chưa phân loại"}</span>
        <span>{transaction.source === "photo_finance" ? "Nhật ký ảnh" : transaction.source === "spending_jar" ? "Hũ chi tiêu" : "Sổ tài khoản"}</span>
      </div>
      <button type="button" className="history-view-action" onClick={onView}>Xem chi tiết</button>
    </article>
  );
}

export function LedgerHistoryDetails({ transaction, accounts }: {
  transaction: AccountTransaction;
  accounts: FinancialAccount[];
}) {
  const accountName = accounts.find((account) => account.id === transaction.accountId)?.name ?? "Tài khoản cũ";
  const toAccountName = accounts.find((account) => account.id === transaction.toAccountId)?.name ?? "Tài khoản nhận";
  return <div className="history-detail-stack">
    <dl className="history-detail-values">
      <div><dt>Loại</dt><dd>{transaction.type === "income" ? "Thu nhập" : transaction.type === "expense" ? "Chi tiêu" : "Chuyển nội bộ"}</dd></div>
      <div><dt>Số tiền</dt><dd>{formatMoney(transaction.amount)}</dd></div>
      <div><dt>Tài khoản</dt><dd>{accountName}</dd></div>
      {transaction.type === "transfer" && <div><dt>Chuyển đến</dt><dd>{toAccountName}</dd></div>}
      <div><dt>Danh mục</dt><dd>{transaction.category || "Chưa phân loại"}</dd></div>
    </dl>
    {transaction.note && <section className="history-detail-text"><h3>Ghi chú</h3><p>{transaction.note}</p></section>}
  </div>;
}
