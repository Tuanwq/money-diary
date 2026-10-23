import { useState, type FormEvent } from "react";
import type { FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import type { SubGoal } from "../../../types.ts";
import { formatMoneyInput, parseMoneyInput } from "../../../utils/money.ts";
import type { SavingsRule } from "../domain/savingsModel.ts";

type Props = {
  accounts: FinancialAccount[];
  goals: SubGoal[];
  initial?: SavingsRule;
  today: string;
  onClose: () => void;
  onSave: (rule: SavingsRule) => void;
};

export function SavingsRuleForm({ accounts, goals, initial, today, onClose, onSave }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [mode, setMode] = useState<SavingsRule["mode"]>(initial?.mode ?? "percentage");
  const [value, setValue] = useState(String(initial?.value ?? 20));
  const [minimum, setMinimum] = useState(String(initial?.minimum ?? 0));
  const [maximum, setMaximum] = useState(String(initial?.maximum ?? 0));
  const [cadence, setCadence] = useState<SavingsRule["cadence"]>(initial?.cadence ?? "end_of_day");
  const [basis, setBasis] = useState<SavingsRule["basis"]>(initial?.basis ?? "gross");
  const [dailyCap, setDailyCap] = useState(initial?.dailyCap ? formatMoneyInput(String(initial.dailyCap)) : "");
  const [minimumRemaining, setMinimumRemaining] = useState(formatMoneyInput(String(initial?.minimumRemaining ?? 0)));
  const [sourceAccountId, setSourceAccountId] = useState(initial?.sourceAccountId ?? "");
  const [destinationKind, setDestinationKind] = useState<SavingsRule["destination"]["kind"]>(initial?.destination.kind ?? "allocation");
  const [destinationAccountId, setDestinationAccountId] = useState(
    initial?.destination.kind === "transfer" ? initial.destination.accountId : "");
  const [goalId, setGoalId] = useState(initial?.destination.goalId ?? "");
  const [execution, setExecution] = useState<SavingsRule["execution"]>(initial?.execution ?? "suggest");
  const [error, setError] = useState("");
  const random = mode === "random_amount" || mode === "random_percentage";
  const percent = mode === "percentage" || mode === "random_percentage";

  function submit(event: FormEvent) {
    event.preventDefault();
    const now = new Date().toISOString();
    const rule: SavingsRule = {
      id: initial?.id ?? crypto.randomUUID(), name: name.trim(), mode,
      value: percent ? Number(value) : parseMoneyInput(value), minimum: random ? (percent ? Number(minimum) : parseMoneyInput(minimum)) : undefined,
      maximum: random ? (percent ? Number(maximum) : parseMoneyInput(maximum)) : undefined,
      cadence, basis, dailyCap: dailyCap ? parseMoneyInput(dailyCap) : undefined,
      minimumRemaining: parseMoneyInput(minimumRemaining), sourceAccountId,
      destination: destinationKind === "transfer"
        ? { kind: "transfer", accountId: destinationAccountId, goalId: goalId || undefined }
        : { kind: "allocation", goalId: goalId || undefined },
      execution, paused: initial?.paused ?? false, startDate: initial?.startDate ?? today,
      createdAt: initial?.createdAt ?? now, updatedAt: now,
    };
    try { onSave(rule); } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa lưu được quy tắc."); }
  }

  return <div className="savings-dialog-backdrop" onClick={onClose}>
    <section className="savings-dialog" role="dialog" aria-modal="true" aria-labelledby="savings-form-title"
      onClick={(event) => event.stopPropagation()}>
      <div className="savings-dialog-head"><div><small>TIẾT KIỆM TỰ ĐỘNG</small>
        <h2 id="savings-form-title">{initial ? "Sửa quy tắc" : "Tạo quy tắc"}</h2></div>
        <button type="button" className="savings-quiet-button" onClick={onClose} aria-label="Đóng">✕</button></div>
      <form onSubmit={submit} className="savings-rule-form">
        <label className="savings-field savings-full">Tên quy tắc
          <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Dành 20% thu nhập" /></label>
        <label className="savings-field">Cách tính
          <select value={mode} onChange={(event) => setMode(event.target.value as SavingsRule["mode"])}>
            <option value="percentage">Theo phần trăm</option><option value="fixed">Số tiền cố định</option>
            <option value="random_amount">Ngẫu nhiên theo tiền</option>
            <option value="random_percentage">Ngẫu nhiên theo phần trăm</option></select></label>
        {random ? <div className="savings-range savings-full">
          <label className="savings-field">Từ {percent ? "(%)" : "(₫)"}<input required inputMode="decimal" value={minimum}
            onChange={(event) => setMinimum(percent ? event.target.value : formatMoneyInput(event.target.value))} /></label>
          <label className="savings-field">Đến {percent ? "(%)" : "(₫)"}<input required inputMode="decimal" value={maximum}
            onChange={(event) => setMaximum(percent ? event.target.value : formatMoneyInput(event.target.value))} /></label></div>
          : <label className="savings-field">{percent ? "Tỷ lệ (%)" : "Số tiền (₫)"}
            <input required inputMode="decimal" value={value}
              onChange={(event) => setValue(percent ? event.target.value : formatMoneyInput(event.target.value))} /></label>}
        <label className="savings-field">Thời điểm tính
          <select value={cadence} onChange={(event) => setCadence(event.target.value as SavingsRule["cadence"])}>
            <option value="end_of_day">Một lần cuối ngày</option><option value="per_income">Sau khoản thu đầu tiên trong ngày</option></select></label>
        <label className="savings-field">Dựa trên
          <select value={basis} onChange={(event) => setBasis(event.target.value as SavingsRule["basis"])}>
            <option value="gross">Tổng thu nhập</option><option value="net_work">Thu nhập trừ chi phí công việc đã đánh dấu</option></select></label>
        <label className="savings-field">Tối đa mỗi ngày (₫)
          <input inputMode="numeric" value={dailyCap} onChange={(event) => setDailyCap(formatMoneyInput(event.target.value))} placeholder="Không giới hạn" /></label>
        <label className="savings-field">Tối thiểu giữ lại (₫)
          <input inputMode="numeric" value={minimumRemaining} onChange={(event) => setMinimumRemaining(formatMoneyInput(event.target.value))} /></label>
        <label className="savings-field">Tài khoản nguồn
          <select required value={sourceAccountId} onChange={(event) => setSourceAccountId(event.target.value)}>
            <option value="">Chọn tài khoản nguồn</option>{accounts.filter((item) => !item.archivedAt).map((item) =>
              <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="savings-field">Cách giữ tiền
          <select value={destinationKind} onChange={(event) => setDestinationKind(event.target.value as "allocation" | "transfer")}>
            <option value="allocation">Dành riêng trong tài khoản</option><option value="transfer">Chuyển sang tài khoản tiết kiệm</option></select></label>
        {destinationKind === "transfer" && <label className="savings-field">Tài khoản nhận
          <select required value={destinationAccountId} onChange={(event) => setDestinationAccountId(event.target.value)}>
            <option value="">Chọn tài khoản nhận</option>{accounts.filter((item) => !item.archivedAt && item.id !== sourceAccountId).map((item) =>
              <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        <label className="savings-field">Mục tiêu liên kết (nếu có)
          <select value={goalId} onChange={(event) => setGoalId(event.target.value)}><option value="">Không liên kết</option>
            {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></label>
        <label className="savings-field">Thực hiện
          <select value={execution} onChange={(event) => setExecution(event.target.value as SavingsRule["execution"])}>
            <option value="suggest">Đề xuất để xác nhận</option><option value="automatic">Tự động khi đến thời điểm</option></select></label>
        {error && <p className="savings-error savings-full" role="alert">{error}</p>}
        <div className="savings-form-actions savings-full"><button type="button" className="savings-quiet-button" onClick={onClose}>Hủy</button>
          <button type="submit" className="savings-primary-button">Lưu quy tắc</button></div>
      </form>
    </section>
  </div>;
}
