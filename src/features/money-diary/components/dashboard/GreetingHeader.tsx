import { formatReportDate } from "../../../../utils/date";
import { DashboardDateToolbar } from "./DashboardDateToolbar";

type GreetingHeaderProps = {
  isSelectedToday: boolean;
  onDateChange: (date: string) => void;
  onNextDay: () => void;
  onPreviousDay: () => void;
  onToday: () => void;
  selectedDate: string;
  today: string;
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function GreetingHeader({
  isSelectedToday,
  onDateChange,
  onNextDay,
  onPreviousDay,
  onToday,
  selectedDate,
  today,
}: GreetingHeaderProps) {
  return (
    <header className="money-overview-header">
      <div className="money-overview-heading">
        <p>{getGreeting()}</p>
        <h1>{isSelectedToday ? "Tổng quan hôm nay" : "Tổng quan ngày đã chọn"}</h1>
        <span>{formatReportDate(selectedDate)}</span>
      </div>

      <DashboardDateToolbar
        isSelectedToday={isSelectedToday}
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
        onToday={onToday}
        selectedDate={selectedDate}
        today={today}
      />
    </header>
  );
}
