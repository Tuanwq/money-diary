import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { AccountTransaction, FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import type { SpendingJar } from "../../spending-jars/domain/jarModel.ts";
import { groupLedgerTransactionsByDay } from "../historyLedgerModel.ts";
import { formatReportDate } from "../../../utils/date.ts";
import { formatMoney } from "../../../utils/money.ts";
import "./LedgerDayGroups.css";

export function LedgerDayGroups({ transactions, accounts, jars = [], onView }: {
  transactions: AccountTransaction[];
  accounts: FinancialAccount[];
  jars?: SpendingJar[];
  onView: (transaction: AccountTransaction) => void;
}) {
  const [openDates, setOpenDates] = useState<Set<string>>(() => new Set());
  const groups = groupLedgerTransactionsByDay(transactions);
  if (!groups.length) return <div className="history-empty-state"><h3>Chưa có giao dịch trong khoảng này.</h3></div>;
  const accountName = (id?: string) => accounts.find((item) => item.id === id)?.name ?? "Tài khoản cũ";
  return <div className="ledger-day-groups">{groups.map((group) => {
    const expanded = openDates.has(group.date);
    return <article className="ledger-day-card" key={group.date}>
      <button aria-expanded={expanded} className="ledger-day-card__toggle" onClick={() => setOpenDates((current) => {
        const next = new Set(current); if (next.has(group.date)) next.delete(group.date); else next.add(group.date);
        return next;
      })} type="button">
        <span className="ledger-day-card__heading"><strong>{formatReportDate(group.date)}</strong><small>{group.count} giao dịch</small></span>
        <span className="ledger-day-card__summary">
          <span className="is-income">Thu {formatMoney(group.income)}</span>
          <span className="is-expense">Chi {formatMoney(group.expense)}</span>
          <strong className={group.net < 0 ? "is-expense" : "is-income"}>Ròng {group.net < 0 ? "−" : "+"}{formatMoney(Math.abs(group.net))}</strong>
        </span>
        <span className="ledger-day-card__view">{expanded ? "Thu gọn" : "Xem chi tiết"}<ChevronDown aria-hidden="true" size={17} /></span>
      </button>
      {expanded && <div className="ledger-day-card__items">{group.transactions.map((item) => {
        const place = item.type === "transfer" ? `${accountName(item.accountId)} → ${accountName(item.toAccountId)}` : accountName(item.accountId);
        const jar = jars.find((candidate) => candidate.id === item.jarId);
        return <button className="ledger-day-card__item" key={item.id} onClick={() => onView(item)} type="button">
          <span><strong>{item.note || item.category || (item.type === "transfer" ? "Chuyển nội bộ" : "Giao dịch")}</strong>
            <small>{new Date(item.occurredAt ?? item.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · {item.type === "income" ? "Thu" : item.type === "expense" ? "Chi" : "Chuyển"} · {place}{jar ? ` · ${jar.name}` : ""}</small>
            {item.category && <small>Nhãn: {item.category}</small>}</span>
          <b className={item.type === "expense" ? "is-expense" : item.type === "income" ? "is-income" : "is-transfer"}>
            {item.type === "expense" ? "−" : item.type === "income" ? "+" : "↔ "}{formatMoney(item.amount)}</b>
        </button>;
      })}</div>}
    </article>;
  })}</div>;
}
