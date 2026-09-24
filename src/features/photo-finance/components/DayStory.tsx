import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { AccountTransaction, FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import type { DailyEntry, ExpenseEntry } from "../../../types.ts";
import { usePhotoDialog } from "../hooks/usePhotoDialog.ts";
import { usePhotoThumbnails } from "../hooks/usePhotoThumbnails.ts";
import { buildStoryTimeline } from "../services/dayStoryModel.ts";
import type { createPhotoAttachmentRepository } from "../services/photoAttachmentRepository.ts";
import type { DailyFinancialSummary, PhotoAttachment } from "../types/photoFinance.ts";
import { DailySummaryCards } from "./DailySummaryCards.tsx";
import { FullscreenImageViewer } from "./FullscreenImageViewer.tsx";
import { ImageGallery } from "./ImageGallery.tsx";
import { TransactionTimeline } from "./TransactionTimeline.tsx";
import "./dayStory.css";

export function DayStory({ accounts, attachments, date, entries, expenses, isOpen,
  onAddPhoto, onCapture, onClose, onDeletePhoto, onDeleteTransaction, onEditTransaction,
  onMakeCover, repository, summary, transactions }: {
  accounts: FinancialAccount[]; attachments: PhotoAttachment[]; date: string;
  entries: DailyEntry[]; expenses: ExpenseEntry[]; isOpen: boolean;
  onAddPhoto: (transaction: AccountTransaction) => void; onCapture: () => void;
  onClose: () => void; onDeletePhoto: (attachment: PhotoAttachment) => void;
  onDeleteTransaction: (transaction: AccountTransaction) => void;
  onEditTransaction: (transaction: AccountTransaction) => void;
  onMakeCover: (attachment: PhotoAttachment) => void;
  repository: ReturnType<typeof createPhotoAttachmentRepository>;
  summary: DailyFinancialSummary; transactions: AccountTransaction[];
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const timeline = useMemo(() => buildStoryTimeline(date, transactions, entries, expenses, attachments),
    [date, transactions, entries, expenses, attachments]);
  const thumbnails = usePhotoThumbnails(attachments, repository);
  const currentIndex = Math.min(imageIndex, Math.max(attachments.length - 1, 0));
  usePhotoDialog(isOpen, onClose);
  if (!isOpen) return null;
  const dateLabel = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`))
    : date;
  return createPortal(<div className="photo-finance-story-backdrop">
    <main className="photo-finance-story day-story" role="dialog" aria-modal="true" aria-label={`Câu chuyện trong ngày ${date}`}>
      <header className="day-story-header"><div><span className="day-story-badge">Nhật ký tài chính</span>
        <h2>Câu chuyện trong ngày</h2><p>{dateLabel} <i>·</i> {attachments.length} ảnh <i>·</i> {timeline.length} giao dịch</p></div>
        <button type="button" aria-label="Đóng câu chuyện" onClick={onClose}><X size={21} /></button></header>
      <div className="day-story-body">
        <ImageGallery accounts={accounts} attachments={attachments} index={currentIndex} onIndexChange={setImageIndex}
          onOpenViewer={() => setViewerOpen(true)} onCapture={onCapture} onAddPhoto={onAddPhoto}
          onDeletePhoto={onDeletePhoto} onEditTransaction={onEditTransaction} onMakeCover={onMakeCover}
          repository={repository} thumbnailUrls={thumbnails.urls} transactions={transactions} />
        <DailySummaryCards summary={summary} />
        <TransactionTimeline accounts={accounts} attachments={attachments} items={timeline} thumbnailUrls={thumbnails.urls}
          onEdit={onEditTransaction} onDelete={onDeleteTransaction} onViewPhoto={(index) => {
            setImageIndex(index); setViewerOpen(true);
          }} />
      </div>
    </main>
    <FullscreenImageViewer key={`${date}-${currentIndex}-${viewerOpen}`} attachments={attachments} index={currentIndex} isOpen={viewerOpen}
      onClose={() => setViewerOpen(false)} onIndexChange={setImageIndex} repository={repository} />
  </div>, document.body);
}
