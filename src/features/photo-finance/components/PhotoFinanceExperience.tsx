import { useCallback, useMemo, useRef, useState } from "react";
import type { AccountTransaction, FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import type { DailyEntry, ExpenseEntry } from "../../../types.ts";
import type { JarActivity, SpendingJar } from "../../spending-jars/domain/jarModel.ts";
import type { JarCommand } from "../../spending-jars/services/jarService.ts";
import { usePhotoFinance } from "../hooks/usePhotoFinance.ts";
import { usePhotoThumbnails } from "../hooks/usePhotoThumbnails.ts";
import { buildDailyFinancialSummaries, getDailyFinancialSummary,
  groupPhotoAttachmentsByDay, getCalendarDates, getCalendarPhotoStack, vietnamFinancialDate } from "../services/photoFinanceModel.ts";
import { deleteAccountTransactionWithPhotos } from "../services/photoTransactionService.ts";
import type { PhotoAttachment } from "../types/photoFinance.ts";
import { DayStory } from "./DayStory.tsx";
import { PhotoCaptureSheet } from "./PhotoCaptureSheet.tsx";
import { PhotoFinanceCalendar } from "./PhotoFinanceCalendar.tsx";
import "./photoFinance.css";

export function PhotoFinanceExperience({ accounts, jars, jarActivities, entries, expenses, ownerId,
  onDeleteTransaction, onSaveTransaction, onJarCommand, transactions }: {
  accounts: FinancialAccount[];
  jars: SpendingJar[]; jarActivities: JarActivity[];
  entries: DailyEntry[]; expenses: ExpenseEntry[]; ownerId?: string;
  onDeleteTransaction: (transactionId: string) => void;
  onSaveTransaction: (transaction: AccountTransaction) => void;
  onJarCommand: (command: JarCommand) => void;
  transactions: AccountTransaction[];
}) {
  const photos = usePhotoFinance(ownerId);
  const [month, setMonth] = useState(() => vietnamFinancialDate(new Date()).slice(0, 7));
  const [storyDate, setStoryDate] = useState<string | null>(null);
  const [captureDate, setCaptureDate] = useState<string | undefined>();
  const [captureOpen, setCaptureOpen] = useState(false);
  const captureVisible = useRef(false);
  const [editing, setEditing] = useState<AccountTransaction | undefined>();
  const [formKey, setFormKey] = useState(0);
  const [actionError, setActionError] = useState("");
  const summaries = useMemo(() => buildDailyFinancialSummaries(entries, expenses, transactions),
    [entries, expenses, transactions]);
  const attachmentsByDay = useMemo(() => groupPhotoAttachmentsByDay(
    photos.attachments, transactions), [photos.attachments, transactions]);
  const visiblePhotos = useMemo(() => getCalendarDates(month).flatMap(({ date }) =>
    getCalendarPhotoStack(attachmentsByDay.get(date) ?? []).visible), [month, attachmentsByDay]);
  const thumbnails = usePhotoThumbnails(visiblePhotos, photos.repository);
  const dayHasPhotos = useCallback((date: string) =>
    (attachmentsByDay.get(date)?.length ?? 0) > 0, [attachmentsByDay]);

  function openCapture(date: string, transaction?: AccountTransaction) {
    captureVisible.current = true;
    setCaptureDate(date);
    setEditing(transaction);
    setCaptureOpen(true);
    setActionError("");
  }
  const closeCapture = useCallback(() => {
    captureVisible.current = false;
    setCaptureOpen(false);
  }, []);
  function photoSaved(_transactionId: string, savedDate: string, attachment?: PhotoAttachment) {
    if (attachment) photos.acceptAttachment(attachment);
    const showStory = captureVisible.current;
    captureVisible.current = false;
    setCaptureOpen(false);
    setFormKey((value) => value + 1);
    if (savedDate && showStory) setStoryDate(savedDate);
  }
  async function deletePhoto(attachment: PhotoAttachment) {
    if (!ownerId || !window.confirm("Xóa ảnh này? Giao dịch và số tiền vẫn được giữ.")) return;
    try { await photos.repository.delete(ownerId, attachment); await photos.refresh(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "Không xóa được ảnh."); }
  }
  async function makeCover(attachment: PhotoAttachment) {
    if (!ownerId || !storyDate) return;
    try {
      await photos.repository.makeCover(ownerId, attachment, attachmentsByDay.get(storyDate) ?? []);
      await photos.refresh();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Không chọn được ảnh chính."); }
  }
  async function deleteTransaction(transaction: AccountTransaction) {
    if (!window.confirm("Xóa giao dịch và các ảnh liên kết? Số dư tài khoản sẽ được tính lại.")) return;
    try {
      await deleteAccountTransactionWithPhotos(transaction.id, ownerId, onDeleteTransaction);
      await photos.refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Đã xóa giao dịch nhưng chưa dọn được ảnh. Hãy thử lại.");
    }
  }

  return <div className="photo-finance-experience">
    <PhotoFinanceCalendar attachmentsByDay={attachmentsByDay} days={summaries}
      month={month} onMonthChange={setMonth}
      onCapture={(date) => openCapture(date)} onSelectDay={setStoryDate}
      thumbnailUrls={thumbnails.urls} />
    {photos.status === "loading" && <p className="photo-finance-status" role="status">Đang tải ảnh riêng tư...</p>}
    {photos.status === "needs-login" && <p className="photo-finance-status" role="status">
      Để lưu ảnh riêng tư cùng tài khoản, hãy đăng nhập và bật đồng bộ Supabase cho môi trường local.</p>}
    {(photos.error || actionError || thumbnails.error) && <p className="photo-finance-error" role="alert">
      {actionError || photos.error || thumbnails.error} <button onClick={() => {
        thumbnails.retry();
        void photos.refresh();
      }} type="button">Thử lại</button></p>}
    <DayStory accounts={accounts} attachments={storyDate ? attachmentsByDay.get(storyDate) ?? [] : []}
      date={storyDate ?? ""} entries={entries} expenses={expenses} isOpen={Boolean(storyDate) && !captureOpen}
      onAddPhoto={(transaction) => openCapture(transaction.date, transaction)}
      onClose={() => setStoryDate(null)} onDeletePhoto={(attachment) => void deletePhoto(attachment)}
      onDeleteTransaction={(transaction) => void deleteTransaction(transaction)}
      onEditTransaction={(transaction) => openCapture(transaction.date, transaction)}
      onMakeCover={(attachment) => void makeCover(attachment)}
      repository={photos.repository} summary={getDailyFinancialSummary(summaries, storyDate ?? "")}
      transactions={transactions} />
    <PhotoCaptureSheet accounts={accounts} jars={jars} jarActivities={jarActivities}
      transactions={transactions} onJarCommand={onJarCommand} existing={editing} formKey={formKey}
      initialDate={captureDate} isOpen={captureOpen} ownerId={ownerId}
      repository={photos.repository} dayHasPhotos={dayHasPhotos}
      onClose={closeCapture} onSaved={photoSaved}
      onStartNew={() => { setEditing(undefined); setFormKey((value) => value + 1); }}
      onSaveTransaction={onSaveTransaction} />
  </div>;
}
