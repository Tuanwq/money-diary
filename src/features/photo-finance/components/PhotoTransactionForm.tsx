import { useEffect, useRef, useState } from "react";
import type { AccountTransaction, FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import { TRANSACTION_CATEGORIES } from "../../account-ledger/accountLedgerModel.ts";
import { formatMoneyInput, parseMoneyInput } from "../../../utils/money.ts";
import { vietnamFinancialDate, vietnamFinancialTime, vietnamOccurredAt } from "../services/photoFinanceModel.ts";
import type { createPhotoAttachmentRepository } from "../services/photoAttachmentRepository.ts";

type Repository = ReturnType<typeof createPhotoAttachmentRepository>;

export function PhotoTransactionForm({ accounts, existing, initialDate, ownerId,
  repository, dayHasPhotos, onSaved, onSaveTransaction }: {
  accounts: FinancialAccount[];
  existing?: AccountTransaction;
  initialDate?: string;
  ownerId?: string;
  repository: Repository;
  dayHasPhotos: (date: string) => boolean;
  onSaved: (transactionId: string) => void;
  onSaveTransaction: (transaction: AccountTransaction) => void;
}) {
  const now = new Date();
  const [kind, setKind] = useState<"income" | "expense">(
    existing?.type === "expense" ? "expense" : "income");
  const [amount, setAmount] = useState(existing ? formatMoneyInput(String(existing.amount)) : "");
  const [category, setCategory] = useState(existing?.category ?? "Thu nhập");
  const [accountId, setAccountId] = useState(existing?.accountId ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [date, setDate] = useState(existing?.date ?? initialDate ?? vietnamFinancialDate(now));
  const [time, setTime] = useState(existing?.occurredAt
    ? vietnamFinancialTime(new Date(existing.occurredAt)) : vietnamFinancialTime(now));
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const lockRef = useRef(false);
  const activeAccounts = accounts.filter((account) => !account.archivedAt);
  const canEdit = !savedId;

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const timer = window.setTimeout(() => setPreviewUrl(url), 0);
    return () => { window.clearTimeout(timer); URL.revokeObjectURL(url); };
  }, [file]);

  function chooseFile(next: File | undefined) {
    if (!next) return;
    setError("");
    setFile(next);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lockRef.current) return;
    lockRef.current = true;
    setWorking(true);
    setError("");
    try {
      if (!ownerId) throw new Error("Hãy đăng nhập và bật đồng bộ cloud để lưu ảnh riêng tư.");
      if (!file && !existing) throw new Error("Hãy chụp hoặc chọn một ảnh trước khi lưu.");
      if (!file && savedId) throw new Error("Hãy chọn lại ảnh để tải lên.");
      const transactionId = savedId ?? existing?.id ?? crypto.randomUUID();
      if (!savedId) {
        const value = parseMoneyInput(amount);
        if (!Number.isSafeInteger(value) || value <= 0)
          throw new Error("Số tiền phải là số nguyên dương.");
        if (!activeAccounts.some((account) => account.id === accountId))
          throw new Error("Hãy chọn tài khoản nhận hoặc trả tiền.");
        if (!TRANSACTION_CATEGORIES[kind].includes(category))
          throw new Error("Danh mục không hợp lệ.");
        const occurredAt = vietnamOccurredAt(date, time);
        const timestamp = new Date().toISOString();
        onSaveTransaction({ id: transactionId, accountId, amount: value, category,
          createdAt: existing?.createdAt ?? timestamp, date,
          note: note.trim(), type: kind, updatedAt: timestamp,
          occurredAt, source: existing?.source ?? "photo_finance" });
        setSavedId(transactionId);
      }
      if (file) await repository.upload(ownerId, transactionId, file, !dayHasPhotos(date));
      onSaved(transactionId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được khoảnh khắc.");
    } finally { lockRef.current = false; setWorking(false); }
  }

  return <form className="photo-finance-form" onSubmit={(event) => void submit(event)}>
    <div className="photo-finance-picker">
      <label className="app-secondary-button">Mở camera
        <input accept="image/jpeg,image/png,image/webp" capture="environment" disabled={!canEdit && !file}
          onChange={(event) => chooseFile(event.target.files?.[0])} type="file" />
      </label>
      <label className="app-secondary-button">Chọn từ thư viện
        <input accept="image/jpeg,image/png,image/webp" disabled={!canEdit && !file}
          onChange={(event) => chooseFile(event.target.files?.[0])} type="file" />
      </label>
    </div>
    <p className="photo-finance-hint">Nếu camera không mở hoặc bị từ chối quyền, hãy chọn ảnh từ thư viện.</p>
    {previewUrl && <img className="photo-finance-preview" src={previewUrl} alt="Ảnh sắp lưu" />}
    {savedId && <p className="photo-finance-retry" role="status">Giao dịch đã lưu. Tải ảnh lại sẽ dùng cùng giao dịch, không tạo khoản tiền thứ hai.</p>}
    <div className="photo-finance-form-grid">
      <fieldset disabled={!canEdit}><legend>Loại giao dịch</legend>
        <label><input checked={kind === "expense"} onChange={() => { setKind("expense"); setCategory("Ăn uống"); }} type="radio" /> Chi tiêu</label>
        <label><input checked={kind === "income"} onChange={() => { setKind("income"); setCategory("Thu nhập"); }} type="radio" /> Thu nhập</label>
      </fieldset>
      <label>Số tiền <input disabled={!canEdit} inputMode="numeric" onChange={(event) => setAmount(event.target.value)} required value={amount} /></label>
      <label>Danh mục <select disabled={!canEdit} onChange={(event) => setCategory(event.target.value)} value={category}>
        {TRANSACTION_CATEGORIES[kind].map((item) => <option key={item}>{item}</option>)}
      </select></label>
      <label>Tài khoản <select disabled={!canEdit} onChange={(event) => setAccountId(event.target.value)} required value={accountId}>
        <option value="">Chọn tài khoản</option>
        {activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
      </select></label>
      <label>Ngày <input disabled={!canEdit} onChange={(event) => setDate(event.target.value)} required type="date" value={date} /></label>
      <label>Giờ <input disabled={!canEdit} onChange={(event) => setTime(event.target.value)} required type="time" value={time} /></label>
      <label className="photo-finance-wide">Mô tả <textarea disabled={!canEdit} onChange={(event) => setNote(event.target.value)} value={note} /></label>
    </div>
    {error && <p className="photo-finance-error" role="alert">{error}</p>}
    <button className="app-primary-button photo-finance-submit" disabled={working || (!ownerId && !existing)} type="submit">
      {working ? "Đang lưu..." : savedId ? "Tải ảnh lại" : existing ? "Lưu thay đổi / thêm ảnh" : "Lưu khoảnh khắc"}
    </button>
  </form>;
}
