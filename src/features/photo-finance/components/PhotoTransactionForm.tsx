import { useEffect, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CalendarDays, Camera, Check, ChevronDown,
  Image as ImageIcon, Pencil, RotateCcw, WalletCards, X } from "lucide-react";
import type { AccountTransaction, AccountTransactionType, FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import { getDefaultTransactionPurpose, TRANSACTION_CATEGORIES,
  type TransactionPurpose } from "../../account-ledger/accountLedgerModel.ts";
import { formatMoneyInput, parseMoneyInput } from "../../../utils/money.ts";
import { vietnamFinancialDate, vietnamFinancialTime } from "../services/photoFinanceModel.ts";
import { buildPhotoTransaction } from "../services/photoTransactionDraft.ts";
import type { PhotoAttachment } from "../types/photoFinance.ts";
import type { createPhotoAttachmentRepository } from "../services/photoAttachmentRepository.ts";
import { photoBlobDataUrl, processPhoto, type ProcessedPhoto } from "../services/photoImageProcessor.ts";
import type { JarActivity, SpendingJar } from "../../spending-jars/domain/jarModel.ts";
import { getJarView, suggestJar } from "../../spending-jars/domain/jarModel.ts";
import { planJarSpend, type JarCommand } from "../../spending-jars/services/jarService.ts";

type Repository = ReturnType<typeof createPhotoAttachmentRepository>;

export function PhotoTransactionForm({ accounts, jars, jarActivities, transactions, onJarCommand,
  existing, initialDate, ownerId,
  repository, dayHasPhotos, onSaved, onSaveTransaction, onStartNew }: {
  accounts: FinancialAccount[];
  jars: SpendingJar[]; jarActivities: JarActivity[]; transactions: AccountTransaction[];
  onJarCommand: (command: JarCommand) => void;
  existing?: AccountTransaction;
  initialDate?: string;
  ownerId?: string;
  repository: Repository;
  dayHasPhotos: (date: string) => boolean;
  onSaved: (transactionId: string, date: string, attachment?: PhotoAttachment) => void;
  onSaveTransaction: (transaction: AccountTransaction) => void;
  onStartNew: () => void;
}) {
  const now = new Date();
  const activeAccounts = accounts.filter((account) => !account.archivedAt);
  const [kind, setKind] = useState<AccountTransactionType>(existing?.type ?? "income");
  const [amount, setAmount] = useState(existing ? formatMoneyInput(String(existing.amount)) : "");
  const [category, setCategory] = useState(existing?.category ?? "Thu nhập");
  const [purpose, setPurpose] = useState<TransactionPurpose>(
    existing?.purpose ?? getDefaultTransactionPurpose(existing?.type ?? "income")
  );
  const [accountId, setAccountId] = useState(existing?.accountId ?? activeAccounts[0]?.id ?? "");
  const [jarId, setJarId] = useState("");
  const [jarChoiceTouched, setJarChoiceTouched] = useState(false);
  const [jarSourceId, setJarSourceId] = useState("");
  const [toAccountId, setToAccountId] = useState(existing?.toAccountId ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [date, setDate] = useState(existing?.date ?? initialDate ?? vietnamFinancialDate(now));
  const [time, setTime] = useState(existing?.occurredAt
    ? vietnamFinancialTime(new Date(existing.occurredAt)) : vietnamFinancialTime(now));
  const [selectedPhoto, setSelectedPhoto] = useState<{
    file: File; previewUrl: string; processed: ProcessedPhoto;
  } | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [error, setError] = useState("");
  const lockRef = useRef(false);
  const photoSelectionRef = useRef(0);
  const processingRef = useRef<AbortController | null>(null);
  useEffect(() => () => { processingRef.current?.abort(); }, []);
  const attachmentIdRef = useRef<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const file = selectedPhoto?.file ?? null;
  const previewUrl = selectedPhoto?.previewUrl ?? "";
  const canEdit = !savedId;
  const jarLedger = { accounts, transactions, jars, jarActivities };
  const suggestedJar = kind === "expense" && !existing ? suggestJar(jarLedger, category) : undefined;
  const selectedJarId = kind === "expense" && !existing
    ? (jarChoiceTouched ? jarId : suggestedJar?.id ?? "") : "";
  const selectedJar = jars.find((jar) => jar.id === selectedJarId && jar.status === "active");

  async function chooseFile(next: File | undefined) {
    if (!next) return;
    processingRef.current?.abort();
    const controller = new AbortController();
    processingRef.current = controller;
    const selection = photoSelectionRef.current + 1;
    photoSelectionRef.current = selection;
    setError("");
    setPreparingPhoto(true);
    try {
      const processed = await processPhoto(next, controller.signal);
      const previewUrl = await photoBlobDataUrl(processed.display);
      if (!controller.signal.aborted && photoSelectionRef.current === selection)
        setSelectedPhoto({ file: next, previewUrl, processed });
    } catch (cause) {
      if (!controller.signal.aborted && photoSelectionRef.current === selection)
        setError(cause instanceof Error ? cause.message : "Không đọc được ảnh đã chọn.");
    } finally {
      if (!controller.signal.aborted && photoSelectionRef.current === selection) setPreparingPhoto(false);
    }
  }

  function changeKind(next: AccountTransactionType) {
    if (!canEdit) return;
    setKind(next);
    setCategory(TRANSACTION_CATEGORIES[next][0]);
    setPurpose(getDefaultTransactionPurpose(next));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lockRef.current) return;
    lockRef.current = true;
    setWorking(true);
    setError("");
    try {
      if (!ownerId) throw new Error("Hãy đăng nhập và bật đồng bộ cloud để lưu ảnh riêng tư.");
      if (preparingPhoto) throw new Error("Ảnh đang được chuẩn bị, hãy đợi một chút.");
      if (!file && !existing) throw new Error("Hãy chụp hoặc chọn một ảnh trước khi lưu.");
      if (!file && savedId) throw new Error("Hãy chọn lại ảnh để tải lên.");

      const value = parseMoneyInput(amount);
      if (existing?.jarActivityId) throw new Error("Khoản chi từ hũ cần sửa trong chi tiết hũ để giữ đúng từng nguồn tiền.");
      const activityId = crypto.randomUUID();
      const jarLines = selectedJar && !savedId
        ? planJarSpend(jarLedger, selectedJar.id, value, jarSourceId || undefined) : [];
      const transactionId = savedId ?? (selectedJar
        ? `jar-spend:${activityId}:0` : existing?.id ?? crypto.randomUUID());
      const transaction = savedId || selectedJar ? null : buildPhotoTransaction({
        id: transactionId, accounts, existing, type: kind, amount: value,
        accountId, toAccountId, category, purpose, date, time, note,
        now: new Date().toISOString(),
      });

      // Verify photo persistence before creating a money transaction. After that,
      // savedId makes an upload retry reuse the same transaction.
      if (file && !savedId) await repository.prepare(ownerId);

      if (selectedJar && !savedId) {
        onJarCommand({ kind: "spend", id: activityId, now: new Date().toISOString(),
          jarId: selectedJar.id, amount: value, accountId: jarSourceId || undefined,
          date, category, note, purpose: purpose === "goal_allocation" ? "goal_allocation" : "daily_expense",
          occurredAt: new Date(`${date}T${time}:00+07:00`).toISOString() });
        setSavedId(transactionId);
      } else if (transaction) {
        onSaveTransaction(transaction);
        setSavedId(transactionId);
      }
      let attachment: PhotoAttachment | undefined;
      if (file) {
        attachmentIdRef.current ??= crypto.randomUUID();
        attachment = await repository.upload(ownerId, transactionId, file, !dayHasPhotos(date),
          attachmentIdRef.current, selectedPhoto?.processed);
      }
      onSaved(transactionId, date, attachment);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được khoảnh khắc.");
    } finally { lockRef.current = false; setWorking(false); }
  }

  const inputProps = {
    accept: "image/jpeg,image/png,image/webp",
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      void chooseFile(event.target.files?.[0]);
      event.target.value = "";
    },
    type: "file" as const,
  };

  return <form className={`photo-finance-form${previewUrl ? " has-photo" : ""}`}
    onSubmit={(event) => void submit(event)}>
    <input {...inputProps} capture="environment" className="photo-finance-file-input"
      ref={cameraInputRef} />
    <input {...inputProps} className="photo-finance-file-input" ref={libraryInputRef} />

    {!previewUrl && !existing ? <section className="photo-finance-camera-start">
      <div className="photo-finance-camera-frame" aria-hidden="true"><Camera size={44} /></div>
      <div className="photo-finance-camera-copy">
        <strong>Ghi lại một khoảnh khắc</strong>
        <span>Ảnh gốc được giữ riêng tư và không bị ghi chữ lên.</span>
      </div>

      <button aria-label="Mở camera" className="photo-finance-shutter" onClick={() => cameraInputRef.current?.click()}
        disabled={preparingPhoto} type="button"><span /></button>
      <button className="photo-finance-library-button" disabled={preparingPhoto}
        onClick={() => libraryInputRef.current?.click()} type="button">
        <ImageIcon size={18} /> {preparingPhoto ? "Đang chuẩn bị..." : "Chọn ảnh"}
      </button>
      <button className="photo-finance-skip-photo" onClick={() => setError("Ảnh là bắt buộc cho nhật ký tài chính bằng ảnh.")}
        type="button">Bỏ qua ảnh</button>
    </section> : <>
      <section className="photo-finance-compose">
        {previewUrl
          ? <img className="photo-finance-preview" src={previewUrl} alt="Ảnh sắp lưu" />
          : <div className="photo-finance-existing-photo"><ImageIcon size={32} /><span>Giữ ảnh hiện tại</span></div>}
        <div className="photo-finance-compose-tools">
          <button aria-label="Chụp lại" disabled={working || preparingPhoto} onClick={() => cameraInputRef.current?.click()} type="button">
            <RotateCcw size={17} /> <span>Chụp lại</span>
          </button>
          <button aria-label="Chọn ảnh khác" disabled={working || preparingPhoto} onClick={() => libraryInputRef.current?.click()} type="button">
            <ImageIcon size={17} /> <span>Thư viện</span>
          </button>
        </div>
        <label className={`photo-finance-amount${kind === "expense" ? " is-expense" : ""}${amount.length > 8 ? " is-long" : ""}`}>
          <span className="sr-only">Số tiền</span>
          <input aria-label="Số tiền" disabled={!canEdit} inputMode="numeric"
            onChange={(event) => setAmount(formatMoneyInput(event.target.value))} placeholder="0" required value={amount} />
          <b>đ</b>
        </label>
        <label className="photo-finance-note">
          <Pencil size={17} aria-hidden="true" />
          <textarea aria-label="Mô tả" disabled={!canEdit} onChange={(event) => setNote(event.target.value)}
            placeholder="Thêm ghi chú" rows={1} value={note} />
        </label>
      </section>

      <div className="photo-finance-kind" role="group" aria-label="Loại giao dịch">
        <button aria-pressed={kind === "expense"} className={kind === "expense" ? "is-active" : ""}
          disabled={!canEdit} onClick={() => changeKind("expense")} type="button">
          <ArrowUpRight size={21} /> Chi tiêu
        </button>
        <button aria-pressed={kind === "income"} className={kind === "income" ? "is-active" : ""}
          disabled={!canEdit} onClick={() => changeKind("income")} type="button">
          <ArrowDownLeft size={21} /> Thu nhập
        </button>
        <button aria-pressed={kind === "transfer"} className={kind === "transfer" ? "is-active" : ""}
          disabled={!canEdit} onClick={() => changeKind("transfer")} type="button">
          <ArrowLeftRight size={19} /> Chuyển nội bộ
        </button>
      </div>

      {kind === "expense" && <div className="photo-finance-purpose" role="group" aria-label="Ảnh hưởng đến mục tiêu">
        <button aria-pressed={purpose === "daily_expense"}
          className={purpose === "daily_expense" ? "is-active" : ""}
          disabled={!canEdit} onClick={() => setPurpose("daily_expense")} type="button">
          Chi thường ngày
        </button>
        <button aria-pressed={purpose === "goal_allocation"}
          className={purpose === "goal_allocation" ? "is-active" : ""}
          disabled={!canEdit} onClick={() => setPurpose("goal_allocation")} type="button">
          Phân bổ mục tiêu
        </button>
      </div>}
      {kind === "expense" && !existing && jars.some((jar) => jar.status === "active") &&
        <div className="photo-finance-jar-link">
          <label>Hũ chi tiêu<select aria-label="Hũ chi tiêu" disabled={!canEdit} value={selectedJarId}
            onChange={(event) => { setJarChoiceTouched(true); setJarId(event.target.value); setJarSourceId(""); }}>
            <option value="">Không dùng hũ</option>
            {jars.filter((jar) => jar.status === "active").map((jar) =>
              <option key={jar.id} value={jar.id}>{jar.icon} {jar.name} · còn {formatMoneyInput(String(getJarView(jarLedger, jar).remainingAmount))}đ</option>)}
          </select></label>
          {selectedJar && <label>Nguồn tiền trong hũ<select aria-label="Nguồn tiền trong hũ" disabled={!canEdit}
            value={jarSourceId} onChange={(event) => setJarSourceId(event.target.value)}>
            <option value="">Tự động chia theo nguồn</option>
            {getJarView(jarLedger, selectedJar).sources.filter((source) => source.amount > 0).map((source) =>
              <option key={source.accountId} value={source.accountId}>
                {accounts.find((account) => account.id === source.accountId)?.name ?? "Tài khoản"} · {formatMoneyInput(String(source.amount))}đ
              </option>)}
          </select></label>}
          {selectedJar && <small>Chi từ hũ sẽ ghi giao dịch thật vào từng tài khoản nguồn. Phân bổ không trừ tiền hai lần.</small>}
        </div>}
      <div className="photo-finance-chips">
        <label><span className="sr-only">Danh mục</span><Pencil size={16} aria-hidden="true" />
          <select aria-label="Danh mục" disabled={!canEdit} onChange={(event) => setCategory(event.target.value)} value={category}>
            {[...new Set([...TRANSACTION_CATEGORIES[kind], ...(kind === "expense"
              ? jars.flatMap((jar) => jar.linkedLabels) : [])])].map((item) => <option key={item}>{item}</option>)}
          </select><ChevronDown size={15} aria-hidden="true" /></label>
        {!selectedJar && <label><span className="sr-only">Tài khoản</span><WalletCards size={17} aria-hidden="true" />
          <select aria-label={kind === "transfer" ? "Tài khoản chuyển" : "Tài khoản"} disabled={!canEdit}
            onChange={(event) => {
              setAccountId(event.target.value);
              if (event.target.value === toAccountId) setToAccountId("");
            }} required value={accountId}>
            <option value="">Tài khoản</option>
            {activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select><ChevronDown size={15} aria-hidden="true" /></label>}
        <label><span className="sr-only">Ngày</span><CalendarDays size={17} aria-hidden="true" />
          <input aria-label="Ngày" disabled={!canEdit} onChange={(event) => setDate(event.target.value)} required type="date" value={date} />
        </label>
        <label><span className="sr-only">Giờ</span>
          <input aria-label="Giờ" disabled={!canEdit} onChange={(event) => setTime(event.target.value)} required type="time" value={time} />
        </label>
      </div>
      {kind === "transfer" && <div className="photo-finance-transfer">
        <label>
          <span>Đến tài khoản</span>
          <select aria-label="Tài khoản nhận" required disabled={!canEdit}
            value={toAccountId} onChange={(event) => setToAccountId(event.target.value)}>
            <option value="">Chọn nơi nhận tiền</option>
            {activeAccounts.filter((account) => account.id !== accountId).map((account) =>
              <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
        <small>{activeAccounts.length < 2
          ? "Cần ít nhất hai tài khoản đang hoạt động để chuyển tiền."
          : "Chuyển giữa các tài khoản của bạn; không tính vào thu, chi hoặc tiến độ mục tiêu."}</small>
      </div>}
    </>}

    {savedId && <p className="photo-finance-retry" role="status">Giao dịch đã lưu một lần. Nút bên dưới chỉ tải lại ảnh.
      <button onClick={onStartNew} type="button">Tạo khoảnh khắc khác</button></p>}
    {error && <p className="photo-finance-error photo-finance-form-error" role="alert">{error}</p>}

    {(previewUrl || existing) && <div className="photo-finance-form-actions">
      <button aria-label="Bỏ ảnh đã chọn" className="photo-finance-cancel" disabled={working}
        onClick={() => {
          if (savedId) onStartNew();
          else if (selectedPhoto) setSelectedPhoto(null);
        }} type="button"><X size={27} /></button>
      <button aria-label="Lưu khoảnh khắc" className="photo-finance-confirm" disabled={working || preparingPhoto}
        type="submit"><Check size={32} /></button>
    </div>}
    {working && <p className="photo-finance-working" role="status">
      {savedId ? "Đang tải ảnh lại..." : "Đang nén và lưu ảnh..."}
    </p>}
  </form>;
}
