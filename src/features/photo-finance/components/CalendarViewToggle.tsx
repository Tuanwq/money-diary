import type { CalendarView } from "../types/photoFinance.ts";

export function CalendarViewToggle({ value, onChange }: {
  value: CalendarView; onChange: (value: CalendarView) => void;
}) {
  return <div aria-label="Chế độ xem lịch" className="photo-finance-view-toggle" role="group">
    <button aria-pressed={value === "moments"} className={value === "moments" ? "is-active" : ""}
      onClick={() => onChange("moments")} type="button">Khoảnh khắc</button>
    <button aria-pressed={value === "net"} className={value === "net" ? "is-active" : ""}
      onClick={() => onChange("net")} type="button">Thực nhận</button>
  </div>;
}
