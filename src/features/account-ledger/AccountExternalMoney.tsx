import { useState, type FormEvent } from "react";
import { ArrowDownLeft, Clock3, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "../../utils/money.ts";
import { getToday } from "../../utils/date.ts";
import type { AccountTransaction, FinancialAccount } from "./accountLedgerModel.ts";
import { calculateAccountActualAvailable, calculateAccountExternalAmount,
  getExternalEntries, getExternalOutstanding, getExternalStatus, getReturnedAmount,
  ACCOUNT_EXTERNAL_LABELS, type AccountExternalCommand, type AccountExternalEntry,
  type AccountExternalType } from "./accountExternalModel.ts";
import "./accountExternal.css";

export type ExternalDialog =
  | { kind: "create"; accountId: string }
  | { kind: "edit" | "recover"; accountId: string; entry: AccountExternalEntry };

export function AccountExternalForm({ accounts, transactions, dialog, onClose, onCommand }: {
  accounts: FinancialAccount[]; transactions: AccountTransaction[]; dialog: ExternalDialog;
  onClose: () => void; onCommand: (command: AccountExternalCommand) => void;
}) {
  const existing = dialog.kind === "create" ? null : dialog.entry;
  const [accountId, setAccountId] = useState(dialog.accountId);
  const [amount, setAmount] = useState(existing && dialog.kind === "edit"
    ? formatMoneyInput(String(existing.amount)) : "");
  const [kind, setKind] = useState<AccountExternalType>(existing?.type ?? "loaned");
  const [person, setPerson] = useState(existing?.relatedPerson ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [date, setDate] = useState(dialog.kind === "edit" ? existing?.date ?? getToday() : getToday());
  const [dueDate, setDueDate] = useState(existing?.expectedReturnDate ?? "");
  const [error, setError] = useState("");
  const account = accounts.find((item) => item.id === accountId);
  const outstanding = existing ? getExternalOutstanding(existing) : 0;
  const available = account ? calculateAccountActualAvailable(account, transactions) : 0;

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = parseMoneyInput(amount);
    const now = new Date().toISOString();
    try {
      if (dialog.kind === "recover") {
        onCommand({ kind: "recover", accountId, id: dialog.entry.id, recoveryId: crypto.randomUUID(),
          amount: value, date, now });
      } else {
        const fields = { amount: value, type: kind, relatedPerson: person.trim() || undefined,
          note: note.trim(), date, expectedReturnDate: dueDate || undefined };
        onCommand(dialog.kind === "edit"
          ? { kind: "update", accountId, id: dialog.entry.id, fields, now }
          : { kind: "create", accountId, id: crypto.randomUUID(), fields, now });
      }
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được khoản tiền."); }
  }

  return <div className="ledger-modal-backdrop" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}><form className="ledger-modal external-money-modal" onSubmit={submit}>
    <header className="ledger-modal-header"><div><span>Tiền vẫn thuộc về bạn</span>
      <h2>{dialog.kind === "recover" ? "Thu hồi tiền" : dialog.kind === "edit" ? "Sửa khoản đang ở ngoài" : "Đánh dấu tiền đang ở ngoài"}</h2></div>
      <button className="ledger-icon-button" type="button" aria-label="Đóng" onClick={onClose}><X size={20} /></button></header>
    <p className="external-money-help">Khoản này chỉ thay đổi tiền có thể dùng ngay; tổng số dư và báo cáo Thu/Chi không đổi.</p>
    {dialog.kind === "create" && <label className="ledger-field"><span>Tài khoản</span>
      <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
        {accounts.filter((item) => !item.archivedAt).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select><small>Có thể đánh dấu tối đa {formatMoney(available)} từ tài khoản này.</small></label>}
    {dialog.kind !== "create" && <p className="external-money-account">{account?.name ?? "Tài khoản"}
      {dialog.kind === "recover" && <> · còn {formatMoney(outstanding)} ở ngoài</>}</p>}
    {dialog.kind !== "recover" && <><label className="ledger-field"><span>Loại khoản</span>
      <select value={kind} onChange={(event) => setKind(event.target.value as AccountExternalType)}>
        {Object.entries(ACCOUNT_EXTERNAL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label className="ledger-field"><span>Người liên quan (nếu có)</span>
        <input value={person} onChange={(event) => setPerson(event.target.value)} maxLength={80} placeholder="Ví dụ: Nam" /></label></>}
    <label className="ledger-field"><span>{dialog.kind === "recover" ? "Số tiền thu hồi" : "Số tiền đang ở ngoài"}</span>
      <div className="ledger-money-input"><input inputMode="numeric" value={amount}
        onChange={(event) => setAmount(formatMoneyInput(event.target.value))} placeholder="VD: 1.000.000" required /><span>đ</span></div>
      {dialog.kind === "recover" && <button className="external-money-fill" type="button"
        onClick={() => setAmount(formatMoneyInput(String(outstanding)))}>Thu hồi toàn bộ {formatMoney(outstanding)}</button>}
      {dialog.kind === "edit" && <small>Đã thu hồi {formatMoney(getReturnedAmount(dialog.entry))}; không thể giảm tổng khoản thấp hơn số này.</small>}</label>
    <label className="ledger-field"><span>{dialog.kind === "recover" ? "Ngày thu hồi" : "Ngày đánh dấu"}</span>
      <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
    {dialog.kind !== "recover" && <><label className="ledger-field"><span>Dự kiến thu lại (không bắt buộc)</span>
      <input type="date" value={dueDate} min={date} onChange={(event) => setDueDate(event.target.value)} /></label>
      <label className="ledger-field"><span>Ghi chú</span><textarea rows={2} maxLength={300} value={note}
        onChange={(event) => setNote(event.target.value)} placeholder="Khoản này đang ở đâu?" /></label></>}
    {error && <p className="external-money-error" role="alert">{error}</p>}
    <footer className="ledger-modal-actions"><button className="notification-secondary-button" type="button" onClick={onClose}>Hủy</button>
      <button className="notification-primary-button" type="submit">{dialog.kind === "recover" ? "Xác nhận thu hồi" : "Lưu khoản tiền"}</button></footer>
  </form></div>;
}

export function AccountExternalSection({ accounts, selectedAccountId, onCreate, onEdit, onRecover, onDelete }: {
  accounts: FinancialAccount[]; selectedAccountId: string;
  onCreate: (accountId: string) => void; onEdit: (entry: AccountExternalEntry) => void;
  onRecover: (entry: AccountExternalEntry) => void; onDelete: (entry: AccountExternalEntry) => void;
}) {
  const visibleAccounts = accounts.filter((item) => !item.archivedAt &&
    (selectedAccountId === "all" || item.id === selectedAccountId));
  const rows = visibleAccounts.flatMap((account) => getExternalEntries(account).map((entry) => ({ account, entry })))
    .sort((a, b) => Number(getExternalOutstanding(b.entry) > 0) - Number(getExternalOutstanding(a.entry) > 0)
      || b.entry.date.localeCompare(a.entry.date));
  const total = visibleAccounts.reduce((sum, account) => sum + calculateAccountExternalAmount(account), 0);
  return <section className="account-external-section" id="account-external-money">
    <div className="account-ledger-section-heading"><div><h2>Tiền đang ở ngoài</h2>
      <p>Vẫn thuộc tổng số dư, nhưng chưa thể dùng ngay.</p></div>
      <button className="notification-secondary-button" type="button" onClick={() => onCreate(
        selectedAccountId !== "all" ? selectedAccountId : visibleAccounts[0]?.id ?? "")} disabled={!visibleAccounts.length}>
        <Plus size={17} /> Đánh dấu khoản tiền</button></div>
    <div className="account-external-total"><span>Chưa thực cầm</span><strong>{formatMoney(total)}</strong></div>
    {rows.length === 0 ? <p className="account-external-empty">Chưa có khoản nào đang ở ngoài.</p>
      : <div className="account-external-list">{rows.map(({ account, entry }) => {
        const outstanding = getExternalOutstanding(entry);
        const status = getExternalStatus(entry);
        return <article className={`account-external-item${outstanding === 0 ? " is-returned" : ""}`} key={entry.id}>
          <div className="account-external-item-icon">{outstanding ? <Clock3 size={18} /> : <ArrowDownLeft size={18} />}</div>
          <div className="account-external-item-main"><strong>{ACCOUNT_EXTERNAL_LABELS[entry.type]}{entry.relatedPerson ? ` · ${entry.relatedPerson}` : ""}</strong>
            <small>{account.name} · {entry.date}{entry.expectedReturnDate ? ` · dự kiến ${entry.expectedReturnDate}` : ""}</small>
            {entry.note && <p>{entry.note}</p>}
            <span className="account-external-status">{status === "returned" ? "Đã thu hồi" : status === "partial_returned" ? `Đã thu hồi ${formatMoney(getReturnedAmount(entry))}` : "Chưa thu hồi"}</span>
          </div>
          <div className="account-external-item-end"><strong>{formatMoney(outstanding)}</strong>
            <div className="account-external-item-actions">
              {outstanding > 0 && <button type="button" onClick={() => onRecover(entry)}><RotateCcw size={14} /> Thu hồi</button>}
              <button type="button" onClick={() => onEdit(entry)}>Sửa</button>
              <button type="button" aria-label={`Xóa khoản ${ACCOUNT_EXTERNAL_LABELS[entry.type]}`} onClick={() => onDelete(entry)}><Trash2 size={15} /></button>
            </div>
          </div>
        </article>;
      })}</div>}
  </section>;
}
