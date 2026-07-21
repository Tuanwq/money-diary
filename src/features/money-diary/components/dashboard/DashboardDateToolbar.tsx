import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateShort } from "../../../../utils/date";

type DashboardDateToolbarProps = {
  isSelectedToday: boolean;
  onDateChange: (date: string) => void;
  onNextDay: () => void;
  onPreviousDay: () => void;
  onToday: () => void;
  selectedDate: string;
  today: string;
};

export function DashboardDateToolbar({
  isSelectedToday,
  onDateChange,
  onNextDay,
  onPreviousDay,
  onToday,
  selectedDate,
  today,
}: DashboardDateToolbarProps) {
  return (
    <nav
      className={`money-date-controls ${isSelectedToday ? "is-today" : ""}`}
      aria-label="Điều hướng ngày tổng quan"
    >
      <button
        type="button"
        className="money-icon-button money-date-previous"
        onClick={onPreviousDay}
        aria-label="Xem ngày trước"
      >
        <ChevronLeft aria-hidden="true" size={20} />
      </button>

      <div className="money-date-center">
        <button
          type="button"
          className="money-date-today-button"
          onClick={onToday}
          disabled={isSelectedToday}
          aria-current={isSelectedToday ? "date" : undefined}
        >
          Hôm nay
        </button>

        <label className="money-date-picker">
          <span className="money-visually-hidden">Chọn ngày xem dữ liệu</span>
          <span className="money-date-picker-label" aria-hidden="true">
            {isSelectedToday ? "Hôm nay" : formatDateShort(selectedDate)}
          </span>
          <input
            type="date"
            value={selectedDate}
            max={today}
            aria-label="Chọn ngày xem dữ liệu"
            onChange={(event) => onDateChange(event.target.value)}
          />
        </label>
      </div>

      <button
        type="button"
        className="money-icon-button money-date-next"
        onClick={onNextDay}
        disabled={isSelectedToday}
        aria-label="Xem ngày sau"
      >
        <ChevronRight aria-hidden="true" size={20} />
      </button>
    </nav>
  );
}
