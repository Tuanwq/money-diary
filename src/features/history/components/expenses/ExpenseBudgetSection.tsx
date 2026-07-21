import type { Dispatch, SetStateAction } from "react";
import type { ExpenseBudget } from "../../../../types";
import { formatDateShort, getMonthStart, getToday } from "../../../../utils/date";
import { formatMoney, formatMoneyInput } from "../../../../utils/money";
import type { ExpenseBudgetRow } from "../../historySelectors";

type ExpenseBudgetForm = { label: string; monthlyLimit: string };

type ExpenseBudgetSectionProps = {
  budgetRows: ExpenseBudgetRow[];
  cancelEdit: () => void;
  deleteBudget: (id: string) => void;
  editingId: string | null;
  form: ExpenseBudgetForm;
  labelOptions: string[];
  save: () => void;
  setForm: Dispatch<SetStateAction<ExpenseBudgetForm>>;
  startEdit: (budget: ExpenseBudget) => void;
};

export function ExpenseBudgetSection({ budgetRows, cancelEdit, deleteBudget, editingId, form, labelOptions, save, setForm, startEdit }: ExpenseBudgetSectionProps) {
  return (
    <section className="history-budget-section">
      <header><div><h2>Ngân sách theo nhãn</h2><p>Hạn mức tháng hiện tại cho từng nhóm chi tiêu.</p></div><span>{formatDateShort(getMonthStart())} – {formatDateShort(getToday())}</span></header>
      <div className="history-budget-form">
        <label><span>Nhãn ngân sách</span><input list="expense-budget-label-options" value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="Ví dụ: Xăng" /></label>
        <datalist id="expense-budget-label-options">{labelOptions.map((label) => <option key={label} value={label} />)}</datalist>
        <label><span>Hạn mức tháng</span><input inputMode="numeric" value={form.monthlyLimit} onChange={(event) => setForm((current) => ({ ...current, monthlyLimit: formatMoneyInput(event.target.value) }))} placeholder="500.000" /></label>
        <div><button type="button" onClick={save}>{editingId ? "Lưu sửa" : "Thêm"}</button>{editingId && <button type="button" onClick={cancelEdit}>Hủy</button>}</div>
      </div>
      {budgetRows.length > 0 && (
        <div className="history-budget-list">
          {budgetRows.map((budget) => <article key={budget.id}><div><strong>{budget.label}</strong><span>{budget.remaining < 0 ? `Vượt ${formatMoney(Math.abs(budget.remaining))}` : `Còn ${formatMoney(budget.remaining)}`}</span></div><p>Đã chi {formatMoney(budget.spent)} / {formatMoney(budget.monthlyLimit)} · {budget.percent}%</p><i aria-hidden="true"><b style={{ width: `${Math.min(budget.percent, 100)}%` }} /></i><footer><button type="button" onClick={() => startEdit(budget)}>Sửa</button><button type="button" className="is-danger" onClick={() => deleteBudget(budget.id)}>Xóa</button></footer></article>)}
        </div>
      )}
    </section>
  );
}
