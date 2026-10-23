import { useState } from "react";
import { ArrowLeft, PiggyBank, Plus, Settings2 } from "lucide-react";
import type { AccountLedgerData } from "../../account-ledger/accountLedgerModel.ts";
import type { SubGoal } from "../../../types.ts";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "../../../utils/money.ts";
import { filterSavingsHistory, getSavingsIncome, isSavedSavingsResult, type SavingsRule,
  type SavingsHistoryFilters } from "../domain/savingsModel.ts";
import type { SavingsCommand } from "../services/savingsService.ts";
import { SavingsRuleForm } from "../components/SavingsRuleForm.tsx";
import "./SavingsPage.css";

type Props = {
  ledger: AccountLedgerData;
  goals: SubGoal[];
  today: string;
  onBack: () => void;
  onCommand: (command: SavingsCommand) => void;
  schemaReady: boolean;
};

const STATUS: Record<string, string> = {
  proposed: "Chờ xác nhận", allocated: "Đã dành riêng", transferred: "Đã chuyển",
  skipped: "Đã bỏ qua", needs_recalculation: "Cần tính lại",
};
export function SavingsPage({ ledger, goals, today, onBack, onCommand, schemaReady }: Props) {
  const [editing, setEditing] = useState<SavingsRule | "new" | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<SavingsHistoryFilters>({});
  const activeRules = (ledger.savingsRules ?? []).filter((item) => !item.deletedAt);
  const history = [...(ledger.savingsAllocations ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  const visibleHistory = filterSavingsHistory(history, filters);
  const accountsById = new Map(ledger.accounts.map((account) => [account.id, account.name]));
  const summary = (() => {
    const completed = history.filter(isSavedSavingsResult);
    return { total: completed.reduce((sum, item) => sum + item.amount, 0),
      month: completed.filter((item) => item.date.startsWith(today.slice(0, 7)))
        .reduce((sum, item) => sum + item.amount, 0) };
  })();
  const linkedGoal = goals.map((goal) => ({ goal, saved: history.filter((item) =>
    isSavedSavingsResult(item) &&
    ledger.savingsRules?.find((rule) => rule.id === item.ruleId)?.destination.goalId === goal.id)
    .reduce((sum, item) => sum + item.amount, 0) }))
    .sort((left, right) => (left.goal.deadline || "9999-12-31").localeCompare(right.goal.deadline || "9999-12-31"))
    .find((item) => item.saved < item.goal.target);

  function issue(command: SavingsCommand) {
    try { setError(""); onCommand(command); } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chưa xử lý được tiết kiệm.");
    }
  }

  return <div className="savings-page">
    <header className="savings-page-header"><button type="button" className="savings-back" onClick={onBack} aria-label="Quay lại"><ArrowLeft size={20} /></button>
      <div><small>MONEY DIARY</small><h1>Tiết kiệm</h1><p>Dành tiền từ khoản thu đã ghi vào sổ.</p></div>
      <button type="button" className="savings-primary-button" onClick={() => setEditing("new")} disabled={!schemaReady}><Plus size={17} /> Tạo quy tắc</button></header>
    {!schemaReady && <p className="savings-error" role="alert">Tiết kiệm chưa đồng bộ. Cần áp dụng migration Supabase trước khi tạo quy tắc.</p>}
    {error && <p className="savings-error" role="alert">{error}</p>}
    <div className="savings-summary-grid"><section><small>Đã đưa vào tiết kiệm</small><strong>{formatMoney(summary.total)}</strong></section>
      <section><small>Tháng này</small><strong>{formatMoney(summary.month)}</strong></section>
      <section><small>Mục tiêu liên kết gần nhất</small>{linkedGoal ? <><strong>{linkedGoal.goal.name}</strong>
        <span>{formatMoney(linkedGoal.saved)} / {formatMoney(linkedGoal.goal.target)}</span>
        <progress value={Math.min(linkedGoal.saved, linkedGoal.goal.target)} max={linkedGoal.goal.target} /></>
        : <span>Chưa có mục tiêu liên kết đang theo dõi.</span>}</section></div>
    <section className="savings-panel"><div className="savings-section-heading"><h2><Settings2 size={19} /> Quy tắc đang dùng</h2><span>{activeRules.filter((item) => !item.paused).length} hoạt động</span></div>
      {activeRules.length === 0 ? <p className="savings-empty">Chưa có quy tắc. Chọn tài khoản nguồn và cách dành tiền để bắt đầu.</p>
        : <div className="savings-rule-list">{activeRules.map((rule) => <article className="savings-rule-row" key={rule.id}>
          <div><strong>{rule.name}</strong><small>{rule.mode === "percentage" ? `${rule.value}%` : rule.mode === "fixed"
            ? formatMoney(rule.value) : `Ngẫu nhiên ${rule.minimum}–${rule.maximum}${rule.mode === "random_percentage" ? "%" : " ₫"}`}
            · {rule.cadence === "end_of_day" ? "Cuối ngày" : "Sau khoản thu"} · {rule.paused ? "Đang tạm dừng" : "Đang chạy"}</small></div>
          <div className="savings-row-actions"><button type="button" className="savings-quiet-button" onClick={() => setEditing(rule)}>Sửa</button>
            <button type="button" className="savings-quiet-button" onClick={() => issue({ type: "pause_rule", ruleId: rule.id, paused: !rule.paused })}>{rule.paused ? "Tiếp tục" : "Tạm dừng"}</button>
            <button type="button" className="savings-text-button" onClick={() => { if (window.confirm("Xóa quy tắc? Lịch sử tiết kiệm sẽ được giữ lại.")) issue({ type: "delete_rule", ruleId: rule.id }); }}>Xóa</button></div>
        </article>)}</div>}</section>
    <section className="savings-panel"><div className="savings-section-heading"><h2><PiggyBank size={19} /> Lịch sử tiết kiệm</h2><span>{visibleHistory.length}/{history.length} khoản</span></div>
      <div className="savings-history-filters" aria-label="Bộ lọc lịch sử tiết kiệm">
        <label>Thời gian<select value={filters.month ?? ""} onChange={(event) => setFilters((old) => ({ ...old, month: event.target.value || undefined }))}>
          <option value="">Tất cả</option><option value={today.slice(0, 7)}>Tháng này</option>
          {[...new Set(history.map((item) => item.date.slice(0, 7)))].filter((month) => month !== today.slice(0, 7))
            .map((month) => <option value={month} key={month}>{month}</option>)}
        </select></label>
        <label>Trạng thái<select value={filters.status ?? ""} onChange={(event) => setFilters((old) => ({ ...old,
          status: event.target.value as SavingsHistoryFilters["status"] || undefined }))}>
          <option value="">Tất cả</option><option value="saved">Đã tiết kiệm</option><option value="proposed">Chờ xác nhận</option>
          <option value="needs_recalculation">Cần tính lại</option><option value="skipped">Đã bỏ qua</option>
        </select></label>
        <label>Quy tắc<select value={filters.ruleId ?? ""} onChange={(event) => setFilters((old) => ({ ...old, ruleId: event.target.value || undefined }))}>
          <option value="">Tất cả</option>{(ledger.savingsRules ?? []).map((rule) => <option value={rule.id} key={rule.id}>{rule.name}</option>)}
        </select></label>
        <label>Cách tiết kiệm<select value={filters.destination ?? ""} onChange={(event) => setFilters((old) => ({ ...old,
          destination: event.target.value as SavingsHistoryFilters["destination"] || undefined }))}>
          <option value="">Tất cả</option><option value="allocation">Dành riêng</option><option value="transfer">Chuyển tài khoản</option>
        </select></label>
      </div>
      {history.length === 0 ? <p className="savings-empty">Chưa có khoản tiết kiệm. Ngày không có thu nhập sẽ không tạo đề xuất.</p>
        : visibleHistory.length === 0 ? <p className="savings-empty">Không có khoản tiết kiệm phù hợp bộ lọc.</p>
        : <div className="savings-history-list">{visibleHistory.map((item) => {
          const rule = ledger.savingsRules?.find((candidate) => candidate.id === item.ruleId);
          const income = rule ? getSavingsIncome(ledger, rule, item.date) : null;
          const incomeAmount = item.incomeAmount ?? income?.income ?? 0;
          const workCosts = item.workCostsAmount ?? income?.workCosts ?? 0;
          const basis = item.basisAmount ?? income?.base ?? 0;
          const percent = basis > 0 ? Math.round(item.amount / basis * 100) : 0;
          const rate = item.ruleMode === "percentage" || item.ruleMode === "random_percentage"
            ? `${item.ruleValue ?? item.sampledValue ?? rule?.value ?? 0}%` : null;
          return <article className="savings-history-row" key={item.id}><div className="savings-history-main">
            <div><small>{item.date} · {STATUS[item.status]}</small><strong>{item.ruleName ?? rule?.name ?? "Quy tắc đã xóa"}</strong>
              <small>{item.destination.kind === "transfer" ? "Chuyển tài khoản" : "Dành riêng"} · {percent}% của tiền tính theo quy tắc</small></div>
            <strong className="savings-history-amount">{formatMoney(item.amount)}</strong></div>
            <details className="savings-history-details"><summary>Xem chi tiết tính toán</summary>
              <dl><div><dt>Thu nhập đã xác nhận</dt><dd>{formatMoney(incomeAmount)}</dd></div>
                {(item.basisKind ?? rule?.basis) === "net_work" && <div><dt>Chi phí công việc</dt><dd>−{formatMoney(workCosts)}</dd></div>}
                <div><dt>Tiền làm căn cứ</dt><dd>{formatMoney(basis)}</dd></div>
                <div><dt>Quy tắc áp dụng</dt><dd>{rate ?? "Số tiền cố định/ngẫu nhiên"}</dd></div>
                <div><dt>Tỷ lệ thực tế</dt><dd>{percent}%</dd></div>
                <div><dt>Tài khoản nguồn</dt><dd>{accountsById.get(item.sourceAccountId) ?? "Tài khoản đã xóa"}</dd></div>
                <div><dt>Đích</dt><dd>{item.destination.kind === "transfer"
                  ? accountsById.get(item.destination.accountId) ?? "Tài khoản đã xóa" : "Tiền dành riêng"}</dd></div>
              </dl></details>
            {item.status === "proposed" && <div className="savings-row-actions">
              <input aria-label="Điều chỉnh số tiền tiết kiệm" inputMode="numeric" value={amounts[item.id] ?? formatMoneyInput(String(item.amount))}
                onChange={(event) => setAmounts((previous) => ({ ...previous, [item.id]: formatMoneyInput(event.target.value) }))} />
              <button type="button" className="savings-primary-button" onClick={() => issue({ type: "confirm", resultId: item.id,
                amount: parseMoneyInput(amounts[item.id] ?? String(item.amount)) })}>Đưa vào tiết kiệm</button>
              <button type="button" className="savings-quiet-button" onClick={() => issue({ type: "skip", resultId: item.id })}>Bỏ qua</button></div>}
            {item.status === "needs_recalculation" && <div className="savings-row-actions"><span>Thu nhập đã sửa hoặc xóa. Khoản cũ chưa tự thay đổi.</span>
              <button type="button" className="savings-quiet-button" onClick={() => issue({ type: "recalculate", resultId: item.id })}>Tính lại</button></div>}
            {item.status === "allocated" && <div className="savings-row-actions"><button type="button" className="savings-quiet-button"
              onClick={() => issue({ type: "release", resultId: item.id })}>Giải phóng tiền</button></div>}
          </article>;
        })}</div>}</section>
    {editing && <SavingsRuleForm accounts={ledger.accounts} goals={goals} today={today}
      initial={editing === "new" ? undefined : editing} onClose={() => setEditing(null)}
      onSave={(rule) => { onCommand({ type: "save_rule", rule }); setEditing(null); }} />}
  </div>;
}
