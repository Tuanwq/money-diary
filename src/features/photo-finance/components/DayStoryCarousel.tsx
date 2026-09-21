import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AccountTransaction, FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import { formatMoney } from "../../../utils/money.ts";
import type { PhotoAttachment } from "../types/photoFinance.ts";
import type { createPhotoAttachmentRepository } from "../services/photoAttachmentRepository.ts";

type Repository = ReturnType<typeof createPhotoAttachmentRepository>;

function PrivatePhoto({ attachment, repository }: { attachment: PhotoAttachment; repository: Repository }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const signed = await repository.signedImage(attachment.storagePath);
        if (active) { setUrl(signed); setError(""); }
      } catch { if (active) setError("Không tải được ảnh riêng tư."); }
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [attachment.storagePath, repository, attempt]);
  if (error) return <div className="photo-finance-image-error"><p>{error}</p>
    <button onClick={() => setAttempt((value) => value + 1)} type="button">Thử lại</button></div>;
  return url ? <img alt="Khoảnh khắc tài chính" decoding="async" onError={() => {
    repository.invalidateImage(attachment.storagePath);
    setError("Ảnh chưa tải được. Hãy thử lại.");
  }}
    src={url} /> : <div className="photo-finance-image-loading">Đang tải ảnh...</div>;
}

export function DayStoryCarousel({ accounts, attachments, onAddPhoto,
  onDeletePhoto, onEditTransaction, onMakeCover, repository, transactions }: {
  accounts: FinancialAccount[];
  attachments: PhotoAttachment[];
  onAddPhoto: (transaction: AccountTransaction) => void;
  onDeletePhoto: (attachment: PhotoAttachment) => void;
  onEditTransaction: (transaction: AccountTransaction) => void;
  onMakeCover: (attachment: PhotoAttachment) => void;
  repository: Repository;
  transactions: AccountTransaction[];
}) {
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const byId = new Map(transactions.map((transaction) => [transaction.id, transaction]));
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const safeIndex = Math.min(index, Math.max(attachments.length - 1, 0));
  function navigate(next: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
    setIndex(next);
  }
  if (attachments.length === 0) return <div className="photo-finance-story-empty">
    <strong>Ngày này chưa có ảnh</strong><p>Giao dịch không có ảnh vẫn nằm trong timeline bên dưới.</p>
  </div>;
  return <section className="photo-finance-carousel" aria-label="Ảnh trong ngày">
    <div className="photo-finance-carousel-count">{safeIndex + 1}/{attachments.length}</div>
    <div className="photo-finance-carousel-track" onScroll={(event) => {
      const target = event.currentTarget;
      setIndex(Math.round(target.scrollLeft / Math.max(target.clientWidth, 1)));
    }} ref={trackRef}>
      {attachments.map((attachment, photoIndex) => {
        const transaction = byId.get(attachment.sourceId);
        return <article className="photo-finance-slide" key={attachment.id}>
          {Math.abs(photoIndex - safeIndex) <= 1
            ? <PrivatePhoto attachment={attachment} repository={repository} />
            : <div className="photo-finance-image-loading" aria-hidden="true" />}
          {transaction && <div className="photo-finance-slide-overlay">
            <span>{transaction.type === "transfer" ? "Chuyển nội bộ" : transaction.type === "expense" ? "Chi tiêu" : "Thu nhập"}</span>
            <strong className={transaction.type === "expense" ? "photo-finance-outflow" : undefined}>{transaction.type === "transfer" ? "↔ " : transaction.type === "income" ? "+" : "−"}{formatMoney(transaction.amount)}</strong>
            <p>{transaction.category} · {accountNames.get(transaction.accountId) ?? "Tài khoản đã xóa"}
              {transaction.type === "transfer" && ` → ${accountNames.get(transaction.toAccountId ?? "") ?? "Tài khoản đã xóa"}`}</p>
            <p>{transaction.occurredAt ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh",
              hour: "2-digit", minute: "2-digit" }).format(new Date(transaction.occurredAt)) : transaction.date}
              {transaction.note ? ` · ${transaction.note}` : ""}</p>
          </div>}
          <div className="photo-finance-slide-actions">
            {transaction && <><button onClick={() => onEditTransaction(transaction)} type="button">Sửa giao dịch</button>
              <button onClick={() => onAddPhoto(transaction)} type="button">Thêm ảnh</button></>}
            {!attachment.isCover && <button onClick={() => onMakeCover(attachment)} type="button">Chọn ảnh chính</button>}
            <button onClick={() => onDeletePhoto(attachment)} type="button">Xóa ảnh</button>
          </div>
        </article>;
      })}
    </div>
    {attachments.length > 1 && <div className="photo-finance-carousel-nav">
      <button aria-label="Ảnh trước" disabled={safeIndex === 0} onClick={() => navigate(safeIndex - 1)} type="button"><ChevronLeft size={18} /></button>
      <button aria-label="Ảnh sau" disabled={safeIndex >= attachments.length - 1}
        onClick={() => navigate(safeIndex + 1)} type="button"><ChevronRight size={18} /></button>
    </div>}
  </section>;
}
