import { ArrowRight, CalendarDays } from "lucide-react";
import { formatReportDate } from "../../../../utils/date";

type CloseDayHeaderProps = {
  date: string;
  onOpenDetailed: () => void;
};

export function CloseDayHeader({ date, onOpenDetailed }: CloseDayHeaderProps) {
  return (
    <header className="close-day-header">
      <div className="close-day-header__copy">
        <h1>Chốt ngày</h1>
        <p>Ghi lại thu nhập, chi tiêu và tình trạng cuối ngày.</p>
        <span className="close-day-header__date">
          <CalendarDays aria-hidden="true" size={16} />
          {date ? formatReportDate(date) : "Chưa chọn ngày"}
        </span>
      </div>

      <button
        type="button"
        className="close-day-header__detail-button"
        onClick={onOpenDetailed}
      >
        <span>Mở nhập chi tiết</span>
        <ArrowRight aria-hidden="true" size={17} />
      </button>
    </header>
  );
}
