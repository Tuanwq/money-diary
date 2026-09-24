import { ChevronLeft, ChevronRight, Expand, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import type { AccountTransaction, FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import { formatMoney } from "../../../utils/money.ts";
import { useStoryImage } from "../hooks/useStoryImage.ts";
import type { createPhotoAttachmentRepository } from "../services/photoAttachmentRepository.ts";
import type { PhotoAttachment } from "../types/photoFinance.ts";

type Repository = ReturnType<typeof createPhotoAttachmentRepository>;

function Thumbnail({ index, active, onSelect, url }: {
  index: number; active: boolean; onSelect: () => void; url?: string;
}) {
  const [failed, setFailed] = useState(false);
  return <button className={`day-story-thumb${active ? " is-active" : ""}`} type="button"
    aria-label={`Xem ảnh ${index + 1}`} aria-current={active ? "true" : undefined} onClick={onSelect}>
    {url && !failed ? <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} /> : <span>{index + 1}</span>}
  </button>;
}

export function ImageGallery({ accounts, attachments, index, onIndexChange, onOpenViewer,
  onCapture, onAddPhoto, onDeletePhoto, onEditTransaction, onMakeCover, repository, thumbnailUrls, transactions }: {
  accounts: FinancialAccount[]; attachments: PhotoAttachment[]; index: number;
  onIndexChange: (index: number) => void; onOpenViewer: () => void;
  onCapture: () => void; onAddPhoto: (transaction: AccountTransaction) => void;
  onDeletePhoto: (attachment: PhotoAttachment) => void;
  onEditTransaction: (transaction: AccountTransaction) => void;
  onMakeCover: (attachment: PhotoAttachment) => void;
  repository: Repository; thumbnailUrls: Record<string, string>; transactions: AccountTransaction[];
}) {
  const safeIndex = Math.min(index, Math.max(attachments.length - 1, 0));
  const attachment = attachments[safeIndex];
  const transaction = transactions.find((item) => item.id === attachment?.sourceId);
  const lines = transaction?.jarActivityId
    ? transactions.filter((item) => item.jarActivityId === transaction.jarActivityId)
    : transaction ? [transaction] : [];
  const names = new Map(accounts.map((account) => [account.id, account.name]));
  const { url, error, retry, fail } = useStoryImage(attachment?.storagePath, repository);
  const time = transaction?.occurredAt
    ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(new Date(transaction.occurredAt))
    : "";

  return <section className="day-story-gallery" aria-label="Ảnh trong ngày">
    {attachment ? <>
      <div className="day-story-photo-frame">
        <button className="day-story-photo-hit" type="button" onClick={onOpenViewer} aria-label="Phóng to ảnh">
          {url ? <img src={url} alt={`Khoảnh khắc tài chính ${safeIndex + 1}`} onError={fail} />
            : <span className="day-story-photo-placeholder">{error || "Đang tải ảnh..."}</span>}
        </button>
        {error && <button className="day-story-photo-retry" onClick={retry} type="button">Thử lại</button>}
        <span className="day-story-photo-count">{safeIndex + 1}/{attachments.length}</span>
        {transaction && <div className="day-story-photo-overlay">
          <span>{transaction.type === "transfer" ? "Chuyển nội bộ" : transaction.type === "expense" ? "Chi tiêu" : "Thu nhập"}</span>
          <strong className={transaction.type === "expense" ? "is-outflow" : undefined}>
            {transaction.type === "transfer" ? "↔ " : transaction.type === "income" ? "+" : "−"}
            {formatMoney(lines.reduce((sum, item) => sum + item.amount, 0))}</strong>
          <p>{transaction.note || transaction.category}{time ? ` · ${time}` : ""}</p>
          {transaction.type === "transfer" && <small>{names.get(transaction.accountId) ?? "Tài khoản đã xóa"} ↔ {names.get(transaction.toAccountId ?? "") ?? "Tài khoản đã xóa"}</small>}
        </div>}
      </div>
      {attachments.length > 1 && <div className="day-story-gallery-switch">
        <button type="button" aria-label="Ảnh trước" disabled={safeIndex === 0} onClick={() => onIndexChange(safeIndex - 1)}><ChevronLeft size={20} /></button>
        <div className="day-story-thumbs">{attachments.map((photo, photoIndex) => <Thumbnail key={`${photo.id}-${thumbnailUrls[photo.id] ?? ""}`}
          index={photoIndex} active={safeIndex === photoIndex} url={thumbnailUrls[photo.id]}
          onSelect={() => onIndexChange(photoIndex)} />)}</div>
        <button type="button" aria-label="Ảnh sau" disabled={safeIndex === attachments.length - 1} onClick={() => onIndexChange(safeIndex + 1)}><ChevronRight size={20} /></button>
      </div>}
      <div className="day-story-gallery-actions">
        <button type="button" onClick={onOpenViewer}><Expand size={16} /> Phóng to ảnh</button>
        <button type="button" onClick={() => transaction && !transaction.jarActivityId ? onAddPhoto(transaction) : onCapture()}><Plus size={16} /> Thêm ảnh</button>
        <details className="day-story-menu"><summary aria-label="Tùy chọn ảnh"><MoreHorizontal size={20} /></summary>
          <div className="day-story-menu-popover">
            {transaction && !transaction.jarActivityId && <button type="button" onClick={() => onEditTransaction(transaction)}>Sửa giao dịch</button>}
            {!attachment.isCover && <button type="button" onClick={() => onMakeCover(attachment)}>Chọn ảnh chính</button>}
            <button type="button" onClick={() => onDeletePhoto(attachment)}>Xóa ảnh</button>
          </div>
        </details>
      </div>
    </> : <div className="day-story-gallery-empty"><strong>Ngày này chưa có ảnh</strong>
      <p>Giao dịch vẫn có trong dòng tiền bên dưới.</p>
      <button type="button" onClick={onCapture}><Plus size={16} /> Thêm ảnh</button></div>}
  </section>;
}
