import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { AccountTransaction, FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import type { createPhotoAttachmentRepository } from "../services/photoAttachmentRepository.ts";
import { PhotoTransactionForm } from "./PhotoTransactionForm.tsx";

export function PhotoCaptureSheet({ accounts, existing, initialDate, isOpen, ownerId,
  repository, dayHasPhotos, onClose, onSaved, onSaveTransaction, onStartNew, formKey }: {
  accounts: FinancialAccount[]; existing?: AccountTransaction;
  initialDate?: string; isOpen: boolean; ownerId?: string;
  repository: ReturnType<typeof createPhotoAttachmentRepository>;
  dayHasPhotos: (date: string) => boolean;
  onClose: () => void; onSaved: (transactionId: string) => void;
  onSaveTransaction: (transaction: AccountTransaction) => void;
  onStartNew: () => void;
  formKey: number;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", onKey); };
  }, [isOpen, onClose]);
  return createPortal(<div className="photo-finance-backdrop" role="presentation"
    style={isOpen ? undefined : { display: "none" }}
    onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section aria-modal="true" className="photo-finance-sheet" role="dialog" aria-label="Ghi khoảnh khắc tài chính">
      <header><div><span>Nhật ký tài chính bằng ảnh</span><h2>{existing ? "Sửa giao dịch / thêm ảnh" : "Ghi một khoảnh khắc"}</h2>
        <p>Ảnh liên kết với giao dịch trong Sổ tài khoản. Số tiền chỉ hiển thị trên giao diện.</p></div>
        <button aria-label="Đóng" onClick={onClose} type="button"><X size={20} /></button></header>
      <PhotoTransactionForm accounts={accounts} existing={existing} initialDate={initialDate}
        key={`${existing?.id ?? "new"}-${formKey}`} ownerId={ownerId} repository={repository}
        dayHasPhotos={dayHasPhotos}
        onSaved={onSaved} onSaveTransaction={onSaveTransaction} onStartNew={onStartNew} />
    </section>
  </div>, document.body);
}
