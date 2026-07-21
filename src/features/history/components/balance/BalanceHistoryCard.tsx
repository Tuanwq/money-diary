import { StickyNote } from "lucide-react";
import type { BalanceCheckEntry } from "../../../../types";
import { getBalanceStatus } from "../../../../utils/balance";
import { formatReportDate } from "../../../../utils/date";
import { formatMoney } from "../../../../utils/money";
import { formatSignedDifference } from "../../historySelectors";
import { HistoryRecordMenu } from "../HistoryRecordMenu";

type BalanceHistoryCardProps = {
  item: BalanceCheckEntry;
  onDelete: () => void;
  onEdit: () => void;
  onView: () => void;
};

export function BalanceHistoryCard({ item, onDelete, onEdit, onView }: BalanceHistoryCardProps) {
  const time = formatCreatedTime(item.createdAt);
  const tone = item.difference === 0 ? "is-matched" : item.difference > 0 ? "is-surplus" : "is-shortage";

  return (
    <article className="balance-history-card">
      <header>
        <div><h3>{formatReportDate(item.date)}</h3>{time && <p>Kiểm kê lúc {time}</p>}</div>
        <span className={`balance-difference-status ${tone}`}>{getBalanceStatus(item.difference)} {formatSignedDifference(item.difference)}</span>
        <HistoryRecordMenu label={`kiểm kê ${formatReportDate(item.date)}`} onDelete={onDelete} onEdit={onEdit} onView={onView} />
      </header>
      <div className="balance-history-card__actual"><span>Số dư thực tế</span><strong>{formatMoney(item.actualMoney)}</strong></div>
      <dl className="balance-history-card__values">
        <DetailValue label="Tiền mặt" value={formatMoney(item.cash)} />
        <DetailValue label="Tài khoản" value={formatMoney(item.bank)} />
        <DetailValue label="App ước tính" value={formatMoney(item.appMoney)} />
        <DetailValue label="Chênh lệch" value={formatSignedDifference(item.difference)} />
      </dl>
      <footer>{item.note && <span><StickyNote aria-hidden="true" size={14} /> Có ghi chú</span>}<button type="button" className="history-view-action" onClick={onView}>Xem chi tiết</button></footer>
    </article>
  );
}

export function BalanceDetails({ item }: { item: BalanceCheckEntry }) {
  return (
    <div className="history-detail-stack">
      <div className="history-detail-highlight"><span>Số dư thực tế</span><strong>{formatMoney(item.actualMoney)}</strong><small>{getBalanceStatus(item.difference)} · {formatSignedDifference(item.difference)}</small></div>
      <dl className="history-detail-values">
        <DetailValue label="Tiền mặt" value={formatMoney(item.cash)} />
        <DetailValue label="Tài khoản" value={formatMoney(item.bank)} />
        <DetailValue label="App ước tính" value={formatMoney(item.appMoney)} />
        <DetailValue label="Chênh lệch" value={formatSignedDifference(item.difference)} />
      </dl>
      {item.note && <section className="history-detail-text"><h3>Ghi chú</h3><p>{item.note}</p></section>}
    </div>
  );
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function formatCreatedTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
