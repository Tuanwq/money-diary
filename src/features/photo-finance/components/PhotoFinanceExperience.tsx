import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AccountTransaction, FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import type { DailyEntry, ExpenseEntry } from "../../../types.ts";
import type { JarActivity, SpendingJar } from "../../spending-jars/domain/jarModel.ts";
import type { JarCommand } from "../../spending-jars/services/jarService.ts";
import { usePhotoFinance } from "../hooks/usePhotoFinance.ts";
import { usePhotoThumbnails } from "../hooks/usePhotoThumbnails.ts";
import { buildPhotoGalleryItems } from "../services/photoGalleryModel.ts";
import { buildDailyFinancialSummaries, getDailyFinancialSummary,
  groupPhotoAttachmentsByDay, getCalendarDates, getCalendarPhotoStack, vietnamFinancialDate } from "../services/photoFinanceModel.ts";
import { deleteAccountTransactionWithPhotos } from "../services/photoTransactionService.ts";
import type { PhotoAttachment } from "../types/photoFinance.ts";
import { DayStory } from "./DayStory.tsx";
import { PhotoCaptureSheet } from "./PhotoCaptureSheet.tsx";
import { PhotoFinanceCalendar } from "./PhotoFinanceCalendar.tsx";
import { PhotoGalleryGrid } from "./PhotoGalleryGrid.tsx";
import "./photoFinance.css";

export function PhotoFinanceExperience({ accounts, jars, jarActivities, entries, expenses, ownerId,
  captureIntent, onCaptureIntentConsumed, onDeleteTransaction, onSaveTransaction, onJarCommand, transactions }: {
  captureIntent: string | null;
  onCaptureIntentConsumed: () => void;
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
  const [photoView, setPhotoView] = useState<"calendar" | "gallery">("calendar");
  const [galleryLimit, setGalleryLimit] = useState(30);
  const [storyDate, setStoryDate] = useState<string | null>(null);
  const [storyPhotoId, setStoryPhotoId] = useState<string | null>(null);
  const [captureDate, setCaptureDate] = useState<string | undefined>();
  const [captureOpen, setCaptureOpen] = useState(false);
  const captureVisible = useRef(false);
  const handledCaptureIntent = useRef<string | null>(null);
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
  const galleryItems = useMemo(() => buildPhotoGalleryItems(photos.attachments, transactions),
    [photos.attachments, transactions]);
  const visibleGalleryItems = useMemo(() => galleryItems.slice(0, galleryLimit),
    [galleryItems, galleryLimit]);
  const galleryAttachments = useMemo(() => photoView === "gallery"
    ? visibleGalleryItems.map((item) => item.attachment) : [], [photoView, visibleGalleryItems]);
  const galleryThumbnails = usePhotoThumbnails(galleryAttachments, photos.repository);
  const dayHasPhotos = useCallback((date: string) =>
    (attachmentsByDay.get(date)?.length ?? 0) > 0, [attachmentsByDay]);

  const openCapture = useCallback((date: string, transaction?: AccountTransaction) => {
    captureVisible.current = true;
    setCaptureDate(date);
    setEditing(transaction);
    setCaptureOpen(true);
    setActionError("");
  }, []);
  useEffect(() => {
    if (!captureIntent || handledCaptureIntent.current === captureIntent) return;
    handledCaptureIntent.current = captureIntent;
    openCapture(vietnamFinancialDate(new Date()));
    onCaptureIntentConsumed();
  }, [captureIntent, onCaptureIntentConsumed, openCapture]);
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
    if (savedDate && showStory) {
      setStoryPhotoId(attachment?.id ?? null);
      setStoryDate(savedDate);
    }
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
    <div className="photo-finance-layout-toggle" role="group" aria-label="Cách xem nhật ký tài chính">
      <button className={photoView === "calendar" ? "is-active" : ""} type="button"
        aria-pressed={photoView === "calendar"} onClick={() => setPhotoView("calendar")}>Lịch</button>
      <button className={photoView === "gallery" ? "is-active" : ""} type="button"
        aria-pressed={photoView === "gallery"} onClick={() => setPhotoView("gallery")}>Ảnh</button>
    </div>
    {photoView === "calendar" ? <PhotoFinanceCalendar attachmentsByDay={attachmentsByDay} days={summaries}
      month={month} onMonthChange={setMonth}
      onCapture={(date) => openCapture(date)} onSelectDay={(date) => {
        setStoryPhotoId(null); setStoryDate(date);
      }} thumbnailUrls={thumbnails.urls} />
      : <PhotoGalleryGrid items={visibleGalleryItems} urls={galleryThumbnails.urls}
        loading={photos.status === "loading"}
        hasMore={galleryItems.length > galleryLimit} onShowMore={() => setGalleryLimit((value) => value + 30)}
        onCapture={() => openCapture(vietnamFinancialDate(new Date()))}
        onOpenPhoto={({ attachment, transaction }) => {
          setStoryPhotoId(attachment.id); setStoryDate(transaction.date);
        }} />}
    {photoView === "calendar" && photos.status === "loading" &&
      <p className="photo-finance-status" role="status">Đang tải ảnh riêng tư...</p>}
    {photos.status === "needs-login" && <p className="photo-finance-status" role="status">
      Để lưu ảnh riêng tư cùng tài khoản, hãy đăng nhập và bật đồng bộ Supabase cho môi trường local.</p>}
    {(photos.error || actionError || (photoView === "calendar" ? thumbnails.error : galleryThumbnails.error)) && <p className="photo-finance-error" role="alert">
      {actionError || photos.error || (photoView === "calendar" ? thumbnails.error : galleryThumbnails.error)} <button onClick={() => {
        thumbnails.retry();
        galleryThumbnails.retry();
        void photos.refresh();
      }} type="button">Thử lại</button></p>}
    <DayStory key={`${storyDate ?? "closed"}:${storyPhotoId ?? "cover"}`} accounts={accounts} attachments={storyDate ? attachmentsByDay.get(storyDate) ?? [] : []}
      date={storyDate ?? ""} entries={entries} expenses={expenses} isOpen={Boolean(storyDate) && !captureOpen}
      initialPhotoId={storyPhotoId ?? undefined}
      onAddPhoto={(transaction) => openCapture(transaction.date, transaction)}
      onCapture={() => storyDate && openCapture(storyDate)}
      onClose={() => { setStoryDate(null); setStoryPhotoId(null); }} onDeletePhoto={(attachment) => void deletePhoto(attachment)}
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
