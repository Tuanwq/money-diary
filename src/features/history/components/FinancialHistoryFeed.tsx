import { formatMoney } from "../../../utils/money.ts";
import { formatReportDate } from "../../../utils/date.ts";
import type { FinancialHistoryEvent } from "../services/financialHistoryModel.ts";
import "./financialHistoryFeed.css";

const KIND_LABELS = {
  income: "Thu nhập", expense: "Chi tiêu", transfer: "Chuyển nội bộ",
  hub: "Ca HUB", reconciliation: "Kiểm kê", jar: "Hũ chi tiêu",
};

export function FinancialHistoryFeed({ events, onOpenTransaction }: {
  events: FinancialHistoryEvent[];
  onOpenTransaction: () => void;
}) {
  if (events.length === 0) return <p className="financial-history-empty">Chưa có hoạt động phù hợp trong khoảng này.</p>;
  return <div className="financial-history-feed">
    {events.map((event, index) => {
      const showDate = event.date !== events[index - 1]?.date;
      return <div key={event.id}>
        {showDate && <h3>{formatReportDate(event.date)}</h3>}
        <article className={`financial-history-item is-${event.kind}`}>
          <span className="financial-history-item__kind">{KIND_LABELS[event.kind]}{event.source === "spending_jar" ? " · Hũ" : event.source === "hub" ? " · HUB" : ""}</span>
          <div className="financial-history-item__main">
            <div><strong>{event.title}</strong><small>{event.detail}</small></div>
            {event.amount !== undefined && <b>{event.kind === "income" ? "+" : event.kind === "expense" ? "−" : ""}{formatMoney(event.amount)}</b>}
          </div>
          {event.transactionId && <button type="button" onClick={onOpenTransaction}>Xem trong Sổ tài khoản</button>}
        </article>
      </div>;
    })}
  </div>;
}
