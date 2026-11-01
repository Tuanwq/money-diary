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
  onSave: (command: Extract<SavingsCommand, { type: "manual_transfer" | "manual_allocate" }>) => void;
};

export function SavingsTransferForm({ ledger, goals, today, onClose, onSave }: Props) {
  const [id] = useState(() => crypto.randomUUID());
  const [mode, setMode] = useState<"allocation" | "transfer">("allocation");
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
      const common = { id, sourceAccountId, amount: value, date, goalId: goalId || undefined, note };
      if (mode === "allocation") onSave({ type: "manual_allocate", ...common });
      else onSave({ type: "manual_transfer", destinationAccountId, ...common });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chưa đưa được tiền vào tiết kiệm.");
    }
  }

  return <div className="savings-dialog-backdrop" onClick={onClose}>
    <section className="savings-dialog" role="dialog" aria-modal="true" aria-labelledby="savings-transfer-title"
      onClick={(event) => event.stopPropagation()}>
      <div className="savings-dialog-head"><div><small>TIẾT KIỆM</small>
        <h2 id="savings-transfer-title">Đưa tiền vào tiết kiệm</h2>
        <p>Chọn dành riêng tiền trong tài khoản hiện tại hoặc chuyển sang tài khoản khác.</p></div>
        <button type="button" className="savings-quiet-button" onClick={onClose} aria-label="Đóng">✕</button></div>
      <form onSubmit={submit} className="savings-rule-form">
        <fieldset className="savings-save-modes savings-full"><legend>Cách tiết kiệm</legend>
          <label className={mode === "allocation" ? "is-selected" : ""}>
            <input type="radio" name="manual-savings-mode" checked={mode === "allocation"}
              onChange={() => setMode("allocation")} />
            <span><strong>Dành riêng trong tài khoản</strong><small>Giảm tiền có thể dùng, không ghi giao dịch chuyển tiền.</small></span>
          </label>
          <label className={mode === "transfer" ? "is-selected" : ""}>
            <input type="radio" name="manual-savings-mode" checked={mode === "transfer"}
              onChange={() => setMode("transfer")} />
            <span><strong>Chuyển sang tài khoản tiết kiệm</strong><small>Tự ghi chuyển nội bộ giữa hai tài khoản.</small></span>
          </label>
        </fieldset>
        <label className={`savings-field${mode === "allocation" ? " savings-full" : ""}`}>
          {mode === "allocation" ? "Tài khoản giữ tiền" : "Tài khoản gửi"}
          <select required value={sourceAccountId} onChange={(event) => {
            setSourceAccountId(event.target.value);
            if (event.target.value === destinationAccountId) setDestinationAccountId("");
          }}><option value="">Chọn tài khoản</option>{accounts.map((item) =>
            <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {mode === "transfer" && <label className="savings-field">Tài khoản tiết kiệm nhận
          <select required value={destinationAccountId} onChange={(event) => setDestinationAccountId(event.target.value)}>
            <option value="">Chọn tài khoản nhận</option>{accounts.filter((item) => item.id !== sourceAccountId).map((item) =>
              <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        <label className="savings-field">Số tiền {mode === "allocation" ? "dành riêng" : "chuyển"} (₫)
          <input required inputMode="numeric" value={amount} onChange={(event) => setAmount(formatMoneyInput(event.target.value))}
            placeholder="Ví dụ: 100.000" /></label>
        <label className="savings-field">Ngày {mode === "allocation" ? "dành riêng" : "chuyển"}
          <input required type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="savings-field savings-full">Mục tiêu liên kết (nếu có)
          <select value={goalId} onChange={(event) => setGoalId(event.target.value)}>
            <option value="">Không liên kết</option>{goals.map((goal) =>
              <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></label>
        <label className="savings-field savings-full">Ghi chú (nếu có)
          <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)}
            placeholder="Ví dụ: Tiết kiệm tháng này" /></label>
        <div className="savings-transfer-preview savings-full" aria-live="polite">
          <span>Có thể đưa vào tiết kiệm: <strong>{sourceAccountId ? formatMoney(available) : "Chọn tài khoản"}</strong></span>
          {sourceAccountId && value > 0 && <span>Sau khi tiết kiệm còn có thể dùng: <strong>{formatMoney(Math.max(0, available - value))}</strong></span>}
          <small>{mode === "allocation"
            ? "Tiền vẫn ở tài khoản này nhưng được dành riêng. Bạn có thể giải phóng tiền trong lịch sử Tiết kiệm."
            : "App ghi giao dịch chuyển nội bộ trong Sổ tài khoản; khoản này không tính vào thu hoặc chi."}</small>
        </div>
        {accounts.length < (mode === "transfer" ? 2 : 1) && <p className="savings-error savings-full" role="status">
          {mode === "transfer" ? "Cần ít nhất hai tài khoản đang hoạt động để chuyển tiền." : "Hãy thêm tài khoản trong Sổ tài khoản trước khi dành riêng tiền."}</p>}
        {error && <p className="savings-error savings-full" role="alert">{error}</p>}
        <div className="savings-form-actions savings-full"><button type="button" className="savings-quiet-button" onClick={onClose}>Hủy</button>
          <button type="submit" className="savings-primary-button" disabled={accounts.length < (mode === "transfer" ? 2 : 1) ||
            !sourceAccountId || (mode === "transfer" && !destinationAccountId) || value <= 0 || value > available}>
            {mode === "allocation" ? "Dành riêng tiền" : "Xác nhận chuyển tiền"}</button></div>
      </form>
    </section>
  </div>;
}
