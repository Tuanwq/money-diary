import { NotebookPen } from "lucide-react";
import { formatMoneyInput } from "../../../../utils/money";
import { HubSectionHeading } from "./HubSectionHeading";
import type { HubForm, HubFormSetter } from "./types";

type DailyJournalSectionProps = {
  form: HubForm;
  setForm: HubFormSetter;
  isEditing: boolean;
};

function resizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

export function DailyJournalSection({
  form,
  setForm,
  isEditing,
}: DailyJournalSectionProps) {
  return (
    <section className="hub-form-section hub-daily-journal-section">
      <HubSectionHeading
        icon={NotebookPen}
        title={isEditing ? "Ghi chú ca Hub" : "Nhật ký trong ngày"}
        description={
          isEditing
            ? "Cập nhật ghi chú riêng của ca đang chọn."
            : "Bổ sung tiền nhận, tâm trạng và diễn biến đáng nhớ trong ca."
        }
      />

      {!isEditing && (
        <>
          <div className="hub-form-grid hub-form-grid--two">
            <label className="hub-field">
              <span>Tiền thực nhận</span>
              <span className="hub-money-input">
                <input
                  inputMode="numeric"
                  value={form.receivedMoney}
                  placeholder="VD: 500.000"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      receivedMoney: formatMoneyInput(event.target.value),
                    }))
                  }
                />
                <span>đ</span>
              </span>
            </label>
            <label className="hub-field">
              <span>Tiền thưởng</span>
              <span className="hub-money-input">
                <input
                  inputMode="numeric"
                  value={form.bonusMoney}
                  placeholder="VD: 100.000"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      bonusMoney: formatMoneyInput(event.target.value),
                    }))
                  }
                />
                <span>đ</span>
              </span>
            </label>
          </div>

          <label className="hub-field">
            <span>Tâm trạng</span>
            <select
              value={form.mood}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  mood: event.target.value as HubForm["mood"],
                }))
              }
            >
              <option value="good">Vui</option>
              <option value="normal">Bình thường</option>
              <option value="tired">Mệt</option>
              <option value="bad">Tệ</option>
            </select>
          </label>

          <label className="hub-field">
            <span>Hôm nay mình đã làm gì?</span>
            <textarea
              rows={3}
              value={form.diary}
              placeholder="VD: Chạy ca tối, nhiều đơn ghép, đường đông..."
              onInput={(event) => resizeTextarea(event.currentTarget)}
              onChange={(event) =>
                setForm((current) => ({ ...current, diary: event.target.value }))
              }
            />
          </label>
        </>
      )}

      <label className="hub-field">
        <span>Ghi chú thêm</span>
        <textarea
          rows={3}
          value={form.note}
          placeholder="VD: Mưa, app lỗi, cần tối ưu khung giờ..."
          onInput={(event) => resizeTextarea(event.currentTarget)}
          onChange={(event) =>
            setForm((current) => ({ ...current, note: event.target.value }))
          }
        />
      </label>
    </section>
  );
}
