import { useState, type FormEvent } from "react";
import type { AccountLedgerData } from "../../account-ledger/accountLedgerModel.ts";
import type { SubGoal } from "../../../types.ts";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "../../../utils/money.ts";
import { getSavingsAvailable } from "../domain/savingsModel.ts";
import type { SavingsCommand } from "../services/savingsService.ts";

type Props = {
  ledger: AccountLedgerData;
  goals: SubGoal[];
  today: string;
  onClose: () => void;
  onSave: (command: Extract<SavingsCommand, { type: "manual_transfer" }>) => void;
};

export function SavingsTransferForm({ ledger, goals, today, onClose, onSave }: Props) {
  const [id] = useState(() => crypto.randomUUID());
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [goalId, setGoalId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const accounts = ledger.accounts.filter((item) => !item.archivedAt);
  const available = sourceAccountId ? getSavingsAvailable(ledger, sourceAccountId) : 0;
  const value = parseMoneyInput(amount);

  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      setError("");
      onSave({ type: "manual_transfer", id, sourceAccountId, destinationAccountId,
        amount: value, date, goalId: goalId || undefined, note });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chưa chuyển được tiền vào tiết kiệm.");
    }
  }

  return <div className="savings-dialog-backdrop" onClick={onClose}>
    <section className="savings-dialog" role="dialog" aria-modal="true" aria-labelledby="savings-transfer-title"
      onClick={(event) => event.stopPropagation()}>
      <div className="savings-dialog-head"><div><small>TIẾT KIỆM</small>
        <h2 id="savings-transfer-title">Chuyển tiền vào tiết kiệm</h2>
        <p>Chọn nơi gửi và nơi nhận. App sẽ tự ghi giao dịch chuyển nội bộ vào Sổ tài khoản.</p></div>
        <button type="button" className="savings-quiet-button" onClick={onClose} aria-label="Đóng">✕</button></div>
      <form onSubmit={submit} className="savings-rule-form">
        <label className="savings-field">Tài khoản gửi
          <select required value={sourceAccountId} onChange={(event) => {
            setSourceAccountId(event.target.value);
            if (event.target.value === destinationAccountId) setDestinationAccountId("");
          }}><option value="">Chọn tài khoản gửi</option>{accounts.map((item) =>
            <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="savings-field">Tài khoản tiết kiệm nhận
          <select required value={destinationAccountId} onChange={(event) => setDestinationAccountId(event.target.value)}>
            <option value="">Chọn tài khoản nhận</option>{accounts.filter((item) => item.id !== sourceAccountId).map((item) =>
              <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="savings-field">Số tiền chuyển (₫)
          <input required inputMode="numeric" value={amount} onChange={(event) => setAmount(formatMoneyInput(event.target.value))}
            placeholder="Ví dụ: 100.000" /></label>
        <label className="savings-field">Ngày chuyển
          <input required type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="savings-field savings-full">Mục tiêu liên kết (nếu có)
          <select value={goalId} onChange={(event) => setGoalId(event.target.value)}>
            <option value="">Không liên kết</option>{goals.map((goal) =>
              <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></label>
        <label className="savings-field savings-full">Ghi chú (nếu có)
          <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)}
            placeholder="Ví dụ: Chuyển khoản tiết kiệm tháng này" /></label>
        <div className="savings-transfer-preview savings-full" aria-live="polite">
          <span>Có thể chuyển từ tài khoản gửi: <strong>{sourceAccountId ? formatMoney(available) : "Chọn tài khoản gửi"}</strong></span>
          {sourceAccountId && value > 0 && <span>Sau khi chuyển còn có thể dùng: <strong>{formatMoney(Math.max(0, available - value))}</strong></span>}
          <small>Đây là chuyển nội bộ, không tính vào thu hoặc chi. Tiền chuyển sẽ chỉ hiện trong mục Tiết kiệm.</small>
        </div>
        {accounts.length < 2 && <p className="savings-error savings-full" role="status">Cần ít nhất hai tài khoản đang hoạt động. Hãy thêm tài khoản tiết kiệm trong Sổ tài khoản.</p>}
        {error && <p className="savings-error savings-full" role="alert">{error}</p>}
        <div className="savings-form-actions savings-full"><button type="button" className="savings-quiet-button" onClick={onClose}>Hủy</button>
          <button type="submit" className="savings-primary-button" disabled={accounts.length < 2 || !sourceAccountId || !destinationAccountId || value <= 0 || value > available}>
            Xác nhận chuyển tiền</button></div>
      </form>
    </section>
  </div>;
}
