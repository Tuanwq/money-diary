import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Flame,
  ShieldCheck,
} from "lucide-react";
import type { HubCalendarDay } from "../work/types";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type ShiftCalendarProps = {
  month: string;
  days: HubCalendarDay[];
  today: string;
  showTodayAction: boolean;
  isDateSelected: (date: string) => boolean;
  onChangeMonth: (amount: number) => void;
  onSelectDate: (date: string) => void;
  onGoToday: () => void;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("vi-VN").format(new Date(`${date}T00:00:00`));
}

function formatMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);

  return new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function ShiftCalendar({
  month,
  days,
  today,
  showTodayAction,
  isDateSelected,
  onChangeMonth,
  onSelectDate,
  onGoToday,
}: ShiftCalendarProps) {
  return (
    <div className="hub-calendar">
      <header className="hub-calendar__header">
        <button type="button" aria-label="Xem tháng trước" onClick={() => onChangeMonth(-1)}>
          <ChevronLeft size={19} aria-hidden="true" />
        </button>
        <h3><CalendarDays size={17} aria-hidden="true" />{formatMonth(month)}</h3>
        <button type="button" aria-label="Xem tháng sau" onClick={() => onChangeMonth(1)}>
          <ChevronRight size={19} aria-hidden="true" />
        </button>
      </header>

      <div className="hub-calendar__weekdays" aria-hidden="true">
        {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className="hub-calendar__days">
        {days.map((day) => {
          const selected = isDateSelected(day.date);
          const isToday = day.date === today;
          const streakLabel = getStreakLabel(day.streakStatus);
          const className = [
            selected ? "is-selected" : "",
            isToday ? "is-today" : "",
            day.isCurrentMonth ? "" : "is-outside",
          ].filter(Boolean).join(" ");
          const label = [
            formatDate(day.date),
            isToday ? "hôm nay" : "",
            streakLabel || (day.hasEntry ? "có ca làm" : ""),
            selected ? "đang được chọn" : "",
          ].filter(Boolean).join(", ");

          return (
            <button
              key={day.date}
              type="button"
              className={className}
              aria-label={label}
              title={streakLabel ? `${formatDate(day.date)} · ${streakLabel}` : day.hasEntry ? `${formatDate(day.date)} · Có ca đã lưu` : formatDate(day.date)}
              onClick={() => onSelectDate(day.date)}
            >
              <span className="hub-calendar__day-number">{day.day}</span>
              {day.streakStatus ? (
                <span className={`hub-calendar__streak-status is-${day.streakStatus}`} aria-hidden="true">
                  {day.streakStatus === "qualified" ? (
                    <Flame size={12} />
                  ) : day.streakStatus === "restored" ? (
                    <ShieldCheck size={12} />
                  ) : (
                    <CircleX size={12} />
                  )}
                </span>
              ) : day.hasEntry ? (
                <span className="hub-calendar__entry-dot" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>

      {showTodayAction && (
        <button type="button" className="hub-calendar__today-action" onClick={onGoToday}>
          <CalendarDays size={16} aria-hidden="true" />Về hôm nay
        </button>
      )}
    </div>
  );
}

function getStreakLabel(status: HubCalendarDay["streakStatus"]) {
  if (status === "qualified") return "đã hoàn thành streak HUB";
  if (status === "restored") return "đã được bảo vệ bằng lượt khôi phục";
  if (status === "missed") return "đã làm đứt streak HUB";
  return "";
}
