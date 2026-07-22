import { CalendarDays, ReceiptText, Save, Utensils } from "lucide-react";
import { OtherExpenseItemsInput } from "../../../../components/OtherExpenseItemsInput";
import { formatMoney, parseMoneyInput } from "../../../../utils/money";
import { getOtherExpenseItemsTotal } from "../../../../utils/otherExpenseForms";
import { FieldShell, MoneyField, SectionHeading } from "./DetailedJournalFields";
import type { ExpenseJournalFormProps } from "./types";

export function ExpenseJournalForm({
  editingExpenseDate,
  form,
  setForm,
  onSubmit,
  onCancelEdit,
  todayString,
}: ExpenseJournalFormProps) {
  const breakfast = parseMoneyInput(form.breakfast);
  const lunch = parseMoneyInput(form.lunch);
  const dinner = parseMoneyInput(form.dinner);
  const mealTotal = breakfast + lunch + dinner;
  const otherTotal = getOtherExpenseItemsTotal(form.otherItems);
  const draftTotal = mealTotal + otherTotal;

  return (
    <form onSubmit={onSubmit} className="detailed-journal-card detailed-expense-form">
      <SectionHeading
        icon={<ReceiptText size={20} />}
        title={editingExpenseDate ? "Sửa chi tiêu" : "Chi tiêu hôm nay"}
        description="Nhập chi phí ăn uống và các khoản phát sinh trong ngày."
      />

      <section className="detailed-journal-subsection detailed-journal-date-section">
        <div className="detailed-journal-subsection__title">
          <CalendarDays size={17} aria-hidden="true" />
          <div><h3>Ngày chi tiêu</h3><p>Ngày được dùng riêng khi lưu bản ghi chi tiêu.</p></div>
        </div>
        <FieldShell htmlFor="detailed-expense-date" label="Chọn ngày chi tiêu">
          <input
            id="detailed-expense-date"
            type="date"
            value={form.date}
            max={todayString}
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
          />
        </FieldShell>
      </section>

      <section className="detailed-journal-subsection">
        <div className="detailed-journal-subsection__title">
          <Utensils size={17} aria-hidden="true" />
          <div><h3>Chi phí ăn uống</h3><p>Ghi riêng từng bữa để xem lại thói quen chi tiêu.</p></div>
        </div>
        <div className="detailed-journal-meals-grid">
          <MoneyField id="expense-breakfast" label="Ăn sáng" value={form.breakfast} placeholder="VD: 30.000" onChange={(breakfast) => setForm((current) => ({ ...current, breakfast }))} />
          <MoneyField id="expense-lunch" label="Ăn trưa" value={form.lunch} placeholder="VD: 50.000" onChange={(lunch) => setForm((current) => ({ ...current, lunch }))} />
          <MoneyField id="expense-dinner" label="Ăn tối" value={form.dinner} placeholder="VD: 40.000" onChange={(dinner) => setForm((current) => ({ ...current, dinner }))} />
        </div>
      </section>

      <section className="detailed-journal-subsection">
        <OtherExpenseItemsInput
          items={form.otherItems}
          onChange={(otherItems) => setForm((current) => ({ ...current, otherItems }))}
        />
      </section>

      <FieldShell
        htmlFor="expense-note"
        label="Ghi chú chi tiêu"
        helper="Ghi ngắn lý do hoặc bối cảnh của các khoản chi trong ngày."
        muted
      >
        <textarea
          id="expense-note"
          rows={3}
          value={form.note}
          onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
          placeholder="VD: Ăn trưa với bạn, mua nước, gửi xe..."
          className="detailed-journal-textarea is-compact"
        />
      </FieldShell>

      <section className="detailed-journal-expense-summary" aria-label="Tổng chi tiêu đang nhập">
        <div><span>Tổng chi tiêu hôm nay</span><strong>{formatMoney(draftTotal)}</strong></div>
        <p>Ăn uống {formatMoney(mealTotal)} · Khoản khác {formatMoney(otherTotal)}</p>
      </section>

      <div className="detailed-journal-form-actions">
        {editingExpenseDate && (
          <button type="button" className="detailed-journal-secondary-action" onClick={onCancelEdit}>Hủy sửa</button>
        )}
        <button type="submit" className="detailed-journal-primary-action">
          <Save size={17} aria-hidden="true" />
          {editingExpenseDate ? "Cập nhật chi tiêu" : "Lưu chi tiêu"}
        </button>
      </div>
    </form>
  );
}
