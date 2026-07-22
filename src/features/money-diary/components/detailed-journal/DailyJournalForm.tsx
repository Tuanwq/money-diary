import { BookOpenText, CalendarDays, Save } from "lucide-react";
import type { Mood } from "../../../../types";
import { formatMoney, parseMoneyInput } from "../../../../utils/money";
import { FieldShell, MoneyField, NumberField, SectionHeading } from "./DetailedJournalFields";
import type { DailyJournalFormProps } from "./types";

const MOOD_LABEL: Record<Mood, string> = {
  good: "Vui",
  normal: "Bình thường",
  tired: "Mệt",
  bad: "Tệ",
};

export function DailyJournalForm({
  editingDate,
  form,
  setForm,
  onSubmit,
  onCancelEdit,
}: DailyJournalFormProps) {
  const hasSummary = Boolean(
    parseMoneyInput(form.income) ||
      parseMoneyInput(form.receivedMoney) ||
      parseMoneyInput(form.bonusMoney) ||
      Number(form.orderCount) ||
      Number(form.workHours) ||
      form.diary.trim() ||
      form.note.trim()
  );

  return (
    <form onSubmit={onSubmit} className="detailed-journal-card detailed-diary-form">
      <SectionHeading
        icon={<BookOpenText size={20} />}
        title={editingDate ? "Sửa nhật ký hôm nay" : "Nhật ký hôm nay"}
        description="Ghi lại tiền, số đơn, giờ làm và cảm nhận trong ngày."
      />

      <section className="detailed-journal-subsection detailed-journal-date-section">
        <div className="detailed-journal-subsection__title">
          <CalendarDays size={17} aria-hidden="true" />
          <div><h3>Ngày nhật ký</h3><p>Ngày được dùng riêng khi lưu nội dung và chỉ số công việc.</p></div>
        </div>
        <FieldShell htmlFor="detailed-journal-date" label="Chọn ngày nhật ký">
          <input
            id="detailed-journal-date"
            type="date"
            value={form.date}
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
          />
        </FieldShell>
      </section>

      <section className="detailed-journal-subsection">
        <div className="detailed-journal-subsection__title">
          <BookOpenText size={17} aria-hidden="true" />
          <div><h3>Chỉ số trong ngày</h3><p>Các số liệu này được giữ nguyên trong công thức và báo cáo hiện tại.</p></div>
        </div>
        <div className="detailed-journal-metrics-grid">
          <FieldShell htmlFor="journal-mood" label="Tâm trạng">
            <select id="journal-mood" value={form.mood} onChange={(event) => setForm((current) => ({ ...current, mood: event.target.value as Mood }))}>
              <option value="good">Vui</option>
              <option value="normal">Bình thường</option>
              <option value="tired">Mệt</option>
              <option value="bad">Tệ</option>
            </select>
          </FieldShell>
          <MoneyField id="journal-income" label="Tiền kiếm được" value={form.income} placeholder="VD: 250.000" onChange={(income) => setForm((current) => ({ ...current, income }))} />
          <MoneyField id="journal-received" label="Tiền nhận được" value={form.receivedMoney} placeholder="VD: 800.000" onChange={(receivedMoney) => setForm((current) => ({ ...current, receivedMoney }))} />
          <MoneyField id="journal-bonus" label="Tiền thưởng" value={form.bonusMoney} placeholder="VD: 100.000" onChange={(bonusMoney) => setForm((current) => ({ ...current, bonusMoney }))} />
          <NumberField id="journal-orders" label="Số lượng đơn" value={form.orderCount} placeholder="VD: 12" suffix="đơn" onChange={(orderCount) => setForm((current) => ({ ...current, orderCount }))} />
          <NumberField id="journal-hours" label="Số giờ làm việc" value={form.workHours} placeholder="VD: 4" suffix="giờ" decimal onChange={(workHours) => setForm((current) => ({ ...current, workHours }))} />
        </div>
      </section>

      <section className="detailed-journal-reflection">
        <FieldShell htmlFor="journal-diary" label="Hôm nay mình đã làm gì?" helper="Nội dung chính của nhật ký hôm nay.">
          <textarea
            id="journal-diary"
            rows={5}
            value={form.diary}
            onChange={(event) => setForm((current) => ({ ...current, diary: event.target.value }))}
            placeholder="Ghi lại công việc và điều đáng nhớ..."
            className="detailed-journal-textarea is-primary"
          />
        </FieldShell>
        <FieldShell htmlFor="journal-note" label="Ghi chú thêm" helper="Điều cần nhớ hoặc chuẩn bị cho ngày tiếp theo." muted>
          <textarea
            id="journal-note"
            rows={3}
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            placeholder="VD: Mai cần dậy sớm hơn..."
            className="detailed-journal-textarea is-compact"
          />
        </FieldShell>
      </section>

      {hasSummary && (
        <section className="detailed-journal-day-summary" aria-label="Tóm tắt nhật ký đang nhập">
          <h3>Tóm tắt ngày</h3>
          <dl>
            <div><dt>Thu nhập</dt><dd>{formatMoney(parseMoneyInput(form.income))}</dd></div>
            <div><dt>Giờ làm</dt><dd>{Number(form.workHours) || 0} giờ</dd></div>
            <div><dt>Số đơn</dt><dd>{Number(form.orderCount) || 0} đơn</dd></div>
            <div><dt>Tâm trạng</dt><dd>{MOOD_LABEL[form.mood]}</dd></div>
          </dl>
        </section>
      )}

      <div className="detailed-journal-form-actions">
        {editingDate && (
          <button type="button" className="detailed-journal-secondary-action" onClick={onCancelEdit}>Hủy sửa</button>
        )}
        <button type="submit" className="detailed-journal-primary-action">
          <Save size={17} aria-hidden="true" />
          {editingDate ? "Cập nhật nhật ký" : "Lưu nhật ký"}
        </button>
      </div>
    </form>
  );
}
