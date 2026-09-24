import { Image as ImageIcon, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import type { AccountTransaction, FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import { formatMoney } from "../../../utils/money.ts";
import type { StoryTimelineItem } from "../services/dayStoryModel.ts";
import type { PhotoAttachment } from "../types/photoFinance.ts";

function TimelineRow({ item, accounts, attachment, thumbnailUrl, onEdit, onDelete, onViewPhoto }: {
  item: StoryTimelineItem; accounts: FinancialAccount[]; attachment?: PhotoAttachment;
  thumbnailUrl?: string; onEdit: (transaction: AccountTransaction) => void;
  onDelete: (transaction: AccountTransaction) => void; onViewPhoto: (index: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const transaction = item.transaction;
  const source = transaction ? accountNames.get(transaction.accountId) ?? "Tài khoản đã xóa" : "";
  const destination = transaction?.toAccountId ? accountNames.get(transaction.toAccountId) ?? "Tài khoản đã xóa" : "";
  const time = transaction?.occurredAt
    ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(new Date(transaction.occurredAt))
    : "Bản ghi trong ngày";
  const typeLabel = item.type === "transfer" ? "Chuyển nội bộ" : item.type === "expense" ? "Chi tiêu" : "Thu nhập";
  function action(event: React.MouseEvent<HTMLButtonElement>, callback: () => void) {
    event.currentTarget.closest("details")?.removeAttribute("open");
    callback();
  }
  return <article className="day-story-transaction">
    {attachment && <button className="day-story-transaction-photo" type="button" aria-label="Xem ảnh giao dịch"
      onClick={() => onViewPhoto(item.photoIndex)}>
      {thumbnailUrl && !thumbnailFailed ? <img src={thumbnailUrl} alt="" loading="lazy" onError={() => setThumbnailFailed(true)} /> : <ImageIcon size={18} />}
    </button>}
    <div className="day-story-transaction-main"><strong>{item.label}</strong>
      <small><span>{time}</span><span className={`day-story-type is-${item.type}`}>{typeLabel}</span></small>
      {item.type === "transfer" && transaction && <p>{source} ↔ {destination}</p>}
      {expanded && <p className="day-story-transaction-detail">{transaction
        ? `${transaction.category} · ${source}${destination ? ` → ${destination}` : ""}${transaction.note ? ` · ${transaction.note}` : ""}`
        : "Dữ liệu Nhật ký cũ"}</p>}
    </div>
    <div className="day-story-transaction-end"><strong className={item.type === "expense" ? "is-outflow" : undefined}>
      {item.type === "income" ? "+" : item.type === "expense" ? "−" : "↔ "}{formatMoney(item.amount)}</strong>
      <details className="day-story-menu"><summary aria-label={`Tùy chọn ${item.label}`}><MoreHorizontal size={19} /></summary>
        <div className="day-story-menu-popover">
          <button type="button" onClick={(event) => action(event, () => setExpanded((value) => !value))}>{expanded ? "Ẩn chi tiết" : "Xem chi tiết"}</button>
          {attachment && <button type="button" onClick={(event) => action(event, () => onViewPhoto(item.photoIndex))}>Xem ảnh liên quan</button>}
          {transaction?.source === "photo_finance" && <>
            <button type="button" onClick={(event) => action(event, () => onEdit(transaction))}>Sửa</button>
            <button type="button" onClick={(event) => action(event, () => onDelete(transaction))}>Xóa</button>
          </>}
        </div>
      </details>
    </div>
  </article>;
}

export function TransactionTimeline({ accounts, attachments, items, thumbnailUrls, onEdit, onDelete, onViewPhoto }: {
  accounts: FinancialAccount[]; attachments: PhotoAttachment[]; items: StoryTimelineItem[];
  thumbnailUrls: Record<string, string>; onEdit: (transaction: AccountTransaction) => void;
  onDelete: (transaction: AccountTransaction) => void; onViewPhoto: (index: number) => void;
}) {
  return <section className="day-story-timeline" aria-label="Giao dịch trong ngày">
    <div className="day-story-section-head"><h3>Dòng tiền trong ngày</h3><span>{items.length} giao dịch</span></div>
    {items.length === 0 ? <p className="day-story-timeline-empty">Chưa có khoản thu, chi hoặc chuyển nội bộ trong ngày.</p>
      : <div className="day-story-transaction-list">{items.map((item) => <TimelineRow key={item.id} item={item}
        accounts={accounts} attachment={attachments[item.photoIndex]}
        thumbnailUrl={attachments[item.photoIndex] ? thumbnailUrls[attachments[item.photoIndex].id] : undefined}
        onEdit={onEdit} onDelete={onDelete} onViewPhoto={onViewPhoto} />)}</div>}
  </section>;
}
