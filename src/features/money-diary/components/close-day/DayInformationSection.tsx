import { CalendarDays, TriangleAlert } from "lucide-react";
import { useId } from "react";
import type { Mood } from "../../../../types";
import { CloseDaySectionHeading } from "./CloseDaySectionHeading";
import type { CloseDayFormSetter } from "./types";

type DayInformationSectionProps = {
  date: string;
  hasExistingData: boolean;
  maxDate: string;
  mood: Mood;
  onDateChange: (date: string) => void;
  setForm: CloseDayFormSetter;
};

export function DayInformationSection({
  date,
  hasExistingData,
  maxDate,
  mood,
  onDateChange,
  setForm,
}: DayInformationSectionProps) {
  const dateId = useId();
  const moodId = useId();

  return (
    <section className="close-day-section close-day-information">
      <CloseDaySectionHeading
        description="Chọn ngày và tình trạng của bạn."
        icon={CalendarDays}
        title="Thông tin ngày"
      />

      <div className="close-day-information__fields">
        <div className="close-day-field">
          <label htmlFor={dateId}>Ngày</label>
          <input
            id={dateId}
            type="date"
            value={date}
            max={maxDate}
            onChange={(event) => onDateChange(event.target.value)}
          />
        </div>

        <div className="close-day-field">
          <label htmlFor={moodId}>Tâm trạng</label>
          <select
            id={moodId}
            value={mood}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                mood: event.target.value as Mood,
              }))
            }
          >
            <option value="good">Vui</option>
            <option value="normal">Bình thường</option>
            <option value="tired">Mệt</option>
            <option value="bad">Tệ</option>
          </select>
        </div>
      </div>

      {hasExistingData && (
        <p className="close-day-information__warning" role="status">
          <TriangleAlert aria-hidden="true" size={17} />
          Ngày này đã có dữ liệu. Nội dung chỉ được cập nhật khi bạn bấm lưu.
        </p>
      )}
    </section>
  );
}
