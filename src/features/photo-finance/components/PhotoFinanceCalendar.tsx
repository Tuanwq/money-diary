import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { DailyFinancialSummary, CalendarView, PhotoAttachment } from "../types/photoFinance.ts";
import { getCalendarDates, getDailyFinancialSummary, vietnamFinancialDate } from "../services/photoFinanceModel.ts";
import { CalendarPhotoStack } from "./CalendarPhotoStack.tsx";
import { CalendarNetCell } from "./CalendarNetCell.tsx";
import { CalendarViewToggle } from "./CalendarViewToggle.tsx";

const VIEW_KEY = "money-diary-photo-finance-calendar-view";
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function PhotoFinanceCalendar({ attachmentsByDay, days, onCapture,
  onSelectDay, thumbnailUrls }: {
  attachmentsByDay: Map<string, PhotoAttachment[]>;
  days: Map<string, DailyFinancialSummary>;
  onCapture: (date: string) => void;
  onSelectDay: (date: string) => void;
  thumbnailUrls: Record<string, string>;
}) {
  const today = vietnamFinancialDate(new Date());
  const [month, setMonth] = useState(today.slice(0, 7));
  const [view, setView] = useState<CalendarView>(() => {
    try { return localStorage.getItem(VIEW_KEY) === "net" ? "net" : "moments"; }
    catch { return "moments"; }
  });
  const dates = useMemo(() => getCalendarDates(month), [month]);
  const monthLabel = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric",
    timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));

  function shiftMonth(delta: number) {
    const [year, monthNumber] = month.split("-").map(Number);
    setMonth(new Date(Date.UTC(year, monthNumber - 1 + delta, 1)).toISOString().slice(0, 7));
  }
  function chooseView(next: CalendarView) {
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* storage unavailable */ }
  }

  return <section className="photo-finance-calendar" aria-label="Lịch tài chính">
    <div className="photo-finance-calendar-head">
      <div><span>Nhật ký tài chính</span><h2>Lịch khoảnh khắc</h2></div>
      <button className="app-primary-button" onClick={() => onCapture(today)} type="button"><Plus size={17} /> Ghi ảnh</button>
    </div>
    <div className="photo-finance-calendar-toolbar">
      <div className="photo-finance-month-nav">
        <button aria-label="Tháng trước" onClick={() => shiftMonth(-1)} type="button"><ChevronLeft size={18} /></button>
        <strong>{monthLabel}</strong>
        <button aria-label="Tháng sau" onClick={() => shiftMonth(1)} type="button"><ChevronRight size={18} /></button>
      </div>
      <CalendarViewToggle onChange={chooseView} value={view} />
    </div>
    <div className="photo-finance-calendar-grid" role="grid">
      {WEEKDAYS.map((weekday) => <span className="photo-finance-weekday" key={weekday}>{weekday}</span>)}
      {dates.map(({ date, inMonth }) => {
        const images = attachmentsByDay.get(date) ?? [];
        const summary = getDailyFinancialSummary(days, date);
        return <div className={`photo-finance-day ${inMonth ? "" : "is-outside"} ${date === today ? "is-today" : ""}`}
          key={date} role="gridcell">
          <button aria-label={`Câu chuyện ngày ${date}`} className="photo-finance-day-open"
            onClick={() => onSelectDay(date)} type="button">
            <strong className="photo-finance-day-number">{Number(date.slice(-2))}</strong>
            {view === "moments"
              ? <CalendarPhotoStack attachments={images} thumbnailUrls={thumbnailUrls} />
              : <CalendarNetCell summary={summary} />}
          </button>
          {inMonth && <button aria-label={`Ghi ảnh ngày ${date}`} className="photo-finance-day-add"
            onClick={() => onCapture(date)} type="button"><Plus size={13} /></button>}
        </div>;
      })}
    </div>
  </section>;
}
