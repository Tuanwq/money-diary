import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { PopupNotice } from "../../components/feedback/PopupNotice.tsx";
import { showAppToast } from "../../components/feedback/appToast.ts";
import { getToday } from "../../utils/date.ts";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "../../utils/money.ts";
import { calculateAccountBalance, type AccountTransaction, type FinancialAccount } from "./accountLedgerModel.ts";
import { applyDebtCommand, getDebtPaid, getDebtRemaining, getDebtStatus, type Debt, type DebtCommand,
  type DebtFields, type DebtPayment, type DebtKind, type DebtOrigin } from "./debtModel.ts";

type DebtDialog = { kind: "create"; initialKind?: DebtKind } | { kind: "edit"; debt: Debt } |
  { kind: "pay"; debt: Debt } | { kind: "edit_payment"; debt: Debt; payment: DebtPayment };

function DebtForm({ accounts, transactions, dialog, onClose, onCommand }: {
  accounts: FinancialAccount[]; transactions: AccountTransaction[]; dialog: DebtDialog;
  onClose: () => void; onCommand: (command: DebtCommand) => void;
}) {
  const debt = dialog.kind === "create" ? undefined : dialog.debt;
  const payment = dialog.kind === "edit_payment" ? dialog.payment : undefined;
  const isPayment = dialog.kind === "pay" || dialog.kind === "edit_payment";
  const [kind, setKind] = useState<DebtKind>(debt?.kind ?? (dialog.kind === "create" ? dialog.initialKind : undefined) ?? "receivable");
  const [person, setPerson] = useState(debt?.person ?? "");
  const [amount, setAmount] = useState(formatMoneyInput(String(payment?.amount ?? (isPayment ? getDebtRemaining(debt!) : debt?.principal ?? ""))));
  const [date, setDate] = useState(payment?.date ?? (isPayment ? getToday() : debt?.incurredDate ?? getToday()));
  const [dueDate, setDueDate] = useState(debt?.dueDate ?? "");
  const [origin, setOrigin] = useState<DebtOrigin>(debt?.origin ?? "opening");
  const [accountId, setAccountId] = useState(payment?.accountId ?? (isPayment ? "" : debt?.originAccountId ?? ""));
  const [note, setNote] = useState(payment?.note ?? (isPayment ? "" : debt?.note ?? ""));
  const [error, setError] = useState("");
  const [newId] = useState(() => crypto.randomUUID());
  const parsed = parseMoneyInput(amount);
  function command(now: string): DebtCommand {
    if (isPayment) return { kind: dialog.kind === "pay" ? "pay" : "update_payment",
      id: debt!.id, paymentId: payment?.id ?? newId, amount: parsed,
      date, accountId: accountId || undefined, note, now };
    const fields: DebtFields = { kind, person, principal: parsed, incurredDate: date,
      dueDate: dueDate || undefined, origin, originAccountId: origin === "account" ? accountId : undefined, note };
    return dialog.kind === "create" ? { kind: "create", id: newId, fields, now }
      : { kind: "update", id: dialog.debt.id, fields, now };
  }
  const preview = (() => {
    try {
      const before = { accounts, transactions, debts: debt ? [debt] : [], jars: [], jarActivities: [], updatedAt: "" };
      const after = applyDebtCommand(before, command(new Date().toISOString()));
      return accounts.flatMap((item) => {
        const oldBalance = calculateAccountBalance(item, before.transactions);
        const newBalance = calculateAccountBalance(item, after.transactions);
        return oldBalance === newBalance ? [] : [`${item.name}: ${formatMoney(oldBalance)} → ${formatMoney(newBalance)}`];
      });
    } catch { return []; }
  })();

  function submit(event: FormEvent) {
    event.preventDefault();
    const now = new Date().toISOString();
    try {
      onCommand(command(now));
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được khoản công nợ."); }
  }

  return <div className="ledger-modal-backdrop" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}><form className="ledger-modal external-money-modal debt-modal" onSubmit={submit}>
    <header className="ledger-modal-header"><div><span>Công nợ</span>
      <h2>{isPayment ? payment ? "Sửa lần thanh toán" : "Ghi thanh toán" : debt ? "Sửa khoản công nợ" : "Thêm khoản công nợ"}</h2></div>
      <button className="ledger-icon-button" type="button" aria-label="Đóng" onClick={onClose}><X size={20} /></button></header>
    {!isPayment && <><label className="ledger-field"><span>Loại công nợ</span>
      <select value={kind} onChange={(event) => setKind(event.target.value as DebtKind)}>
        <option value="receivable">Cho vay · người khác nợ tôi</option><option value="payable">Đi vay · tôi nợ người khác</option>
      </select></label>
      <label className="ledger-field"><span>Người liên quan</span><input value={person} onChange={(event) => setPerson(event.target.value)} maxLength={80} required placeholder="Tên người vay / cho vay" /></label></>}
    {isPayment && <p className="external-money-account">{debt!.person} · còn {formatMoney(getDebtRemaining(debt!))}
      {payment && <> · đang sửa {formatMoney(payment.amount)}</>}</p>}
    <label className="ledger-field"><span>{isPayment ? "Số tiền thanh toán" : "Số tiền gốc"}</span>
      <div className="ledger-money-input"><input inputMode="numeric" value={amount} onChange={(event) => setAmount(formatMoneyInput(event.target.value))} required placeholder="VD: 1.000.000" /><span>đ</span></div></label>
    <label className="ledger-field"><span>{isPayment ? "Ngày thanh toán" : "Ngày phát sinh"}</span>
      <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
    {!isPayment && <><label className="ledger-field"><span>Hạn trả (tùy chọn)</span>
      <input type="date" min={date} value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
      <label className="ledger-field"><span>Nguồn phát sinh</span>
        <select value={origin} onChange={(event) => setOrigin(event.target.value as DebtOrigin)}>
          <option value="opening">Khoản nợ có từ trước · không đổi số dư</option>
          <option value="account">Phát sinh từ tài khoản · ghi biến động tiền</option>
        </select></label></>}
    {(isPayment || origin === "account") && <label className="ledger-field"><span>{isPayment ? "Tài khoản thanh toán" : kind === "receivable" ? "Tài khoản cho vay" : "Tài khoản nhận tiền"}</span>
      <select value={accountId} required={!isPayment} onChange={(event) => setAccountId(event.target.value)}>
        <option value="">{isPayment ? "Không liên kết tài khoản · cần đối chiếu" : "Chọn tài khoản"}</option>
        {accounts.filter((item) => !item.archivedAt).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>}
    <p className="debt-preview">{preview.length
      ? <>{preview.join(" · ")}. Không tính Thu/Chi.</>
      : !isPayment && origin === "account" ? "Chọn tài khoản và nhập tiền để xem biến động số dư."
        : "Không thay đổi số dư tài khoản. Khoản này cần đối chiếu nguồn tiền khi thanh toán."}</p>
    <label className="ledger-field"><span>Ghi chú</span><textarea rows={3} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} /></label>
    <PopupNotice message={error} />
    <footer className="ledger-modal-actions"><button className="notification-secondary-button" type="button" onClick={onClose}>Hủy</button>
      <button className="notification-primary-button" type="submit">{isPayment ? "Lưu thanh toán" : "Lưu khoản nợ"}</button></footer>
  </form></div>;
}

export function DebtManager({ debts, accounts, transactions, selectedAccountId, filter, onCommand, onShowAll }: {
  debts: Debt[]; accounts: FinancialAccount[]; transactions: AccountTransaction[];
  selectedAccountId: string; filter: "all" | "receivable" | "payable" | "other";
  onCommand: (command: DebtCommand) => void; onShowAll: () => void;
}) {
  const [dialog, setDialog] = useState<DebtDialog | null>(null);
  const visible = debts.filter((debt) => !debt.deletedAt && filter !== "other" &&
    (filter === "all" || debt.kind === filter) &&
    (selectedAccountId === "all" || debt.originAccountId === selectedAccountId ||
      debt.payments.some((payment) => !payment.voidedAt && payment.accountId === selectedAccountId)))
    .sort((left, right) => right.incurredDate.localeCompare(left.incurredDate));
  const today = getToday();
  function run(command: DebtCommand) {
    try { onCommand(command); } catch (cause) {
      showAppToast(cause instanceof Error ? cause.message : "Không thể cập nhật công nợ.");
    }
  }
  return <>
    {filter !== "other" && <div className="debt-manager-actions"><button className="notification-primary-button" type="button" onClick={() => setDialog({ kind: "create", initialKind: filter === "payable" ? "payable" : "receivable" })}>
      <Plus size={16} /> Thêm khoản công nợ</button></div>}
    {filter !== "other" && (visible.length ? <div className="debt-list">{visible.map((debt) => {
      const remaining = getDebtRemaining(debt);
      const paid = getDebtPaid(debt);
      const status = getDebtStatus(debt, today);
      const account = accounts.find((item) => item.id === debt.originAccountId);
      return <details className={`debt-card${debt.kind === "payable" ? " is-payable" : ""}`} key={debt.id}>
        <summary><span className="debt-card-main"><strong>{debt.kind === "receivable" ? "Cho vay" : "Đi vay"} · {debt.person}</strong>
          <small>{debt.incurredDate} · {debt.origin === "account" ? account?.name ?? "Tài khoản cũ" : "Nợ có từ trước"}</small>
          {status === "overdue" && <small className="is-overdue">Quá hạn từ {debt.dueDate}</small>}</span>
          <span className="debt-card-amount"><strong>{formatMoney(remaining)}</strong><small>còn nợ</small></span></summary>
        <div className="debt-card-body"><div className="debt-card-facts"><span>Gốc <strong>{formatMoney(debt.principal)}</strong></span>
          <span>Đã thanh toán <strong>{formatMoney(paid)}</strong></span>
          <span className={status === "overdue" ? "is-overdue" : ""}>{status === "overdue" ? "Quá hạn" : status === "settled" ? "Đã tất toán" : status === "partial" ? "Đang trả dần" : "Chưa thanh toán"}{debt.dueDate ? ` · ${debt.dueDate}` : ""}</span></div>
          <progress max={debt.principal} value={paid} aria-label="Tiến độ thanh toán" />
          {debt.note && <p>{debt.note}</p>}
          <div className="debt-card-actions">{remaining > 0 && <button type="button" onClick={() => setDialog({ kind: "pay", debt })}>Ghi thanh toán</button>}
            <button type="button" onClick={() => setDialog({ kind: "edit", debt })}>Sửa khoản</button>
            <button type="button" onClick={() => { if (confirm("Xóa khoản công nợ này? Các lần thanh toán phải được hoàn tác trước.")) run({ kind: "delete", id: debt.id, now: new Date().toISOString() }); }}>Xóa khoản</button></div>
          <div className="debt-payments"><strong>Lịch sử thanh toán</strong>
            {debt.payments.length ? debt.payments.map((payment) => <div className={payment.voidedAt ? "is-voided" : ""} key={payment.id}>
              <span>{payment.date} · {accounts.find((item) => item.id === payment.accountId)?.name ?? "Chưa liên kết tài khoản"}
                {payment.note && <small>{payment.note}</small>}{payment.voidedAt && <small>Đã hoàn tác</small>}</span>
              <strong>{formatMoney(payment.amount)}</strong>
              {!payment.voidedAt && <span className="debt-payment-actions"><button type="button" onClick={() => setDialog({ kind: "edit_payment", debt, payment })}>Sửa</button>
                <button type="button" onClick={() => { if (confirm("Hoàn tác lần thanh toán này? Số dư tài khoản liên kết sẽ được tính lại.")) run({ kind: "void_payment", id: debt.id, paymentId: payment.id, now: new Date().toISOString() }); }}>Hoàn tác</button></span>}</div>)
              : <p>Chưa có lần thanh toán.</p>}</div>
        </div>
      </details>;
    })}</div> : <p className="account-external-empty">Chưa có khoản công nợ mới trong bộ lọc này.</p>)}
    {dialog && <DebtForm key={`${dialog.kind}-${dialog.kind === "create" ? "new" : dialog.debt.id}-${dialog.kind === "edit_payment" ? dialog.payment.id : ""}`}
      accounts={accounts} transactions={transactions} dialog={dialog} onClose={() => setDialog(null)}
      onCommand={(command) => { onCommand(command); if (command.kind === "create" &&
        command.fields.origin === "opening" && selectedAccountId !== "all") onShowAll(); }} />}
  </>;
}
