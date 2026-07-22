import { CalendarDays } from "lucide-react";

type HubWorkHeaderProps = {
  date: string;
  isEditing: boolean;
};

function formatDate(date: string) {
  if (!date) return "Chưa chọn ngày";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function HubWorkHeader({ date, isEditing }: HubWorkHeaderProps) {
  return (
    <header className="hub-work-header">
      <div className="hub-work-header__accent" aria-hidden="true" />
      <div className="hub-work-header__copy">
        <p className="hub-work-header__eyebrow">
          {isEditing ? "Đang chỉnh sửa ca" : "Quản lý ca làm"}
        </p>
        <h1>Hub / Ca làm</h1>
        <p>Quản lý ca, tính thu nhập và theo dõi hiệu suất làm việc.</p>
      </div>
      <div className="hub-work-header__date" aria-label={`Ngày làm việc ${formatDate(date)}`}>
        <CalendarDays size={18} aria-hidden="true" />
        <span>{formatDate(date)}</span>
      </div>
    </header>
  );
}
