import { ArrowLeft, CalendarDays } from "lucide-react";

type DetailedJournalHeaderProps = {
  expenseDate: string;
  journalDate: string;
  onReturnToQuickEntry?: () => void;
};

function formatDate(date: string) {
  if (!date) return "Chưa chọn";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function DetailedJournalHeader({
  expenseDate,
  journalDate,
  onReturnToQuickEntry,
}: DetailedJournalHeaderProps) {
  const sameDate = expenseDate === journalDate;

  return (
    <header className="detailed-journal-header">
      <div className="detailed-journal-header__copy">
        <h1>Ghi nhật ký chi tiết</h1>
        <p>Ghi lại chi tiêu, thu nhập, giờ làm và cảm nhận trong ngày.</p>
      </div>

      <div className="detailed-journal-header__meta">
        <div className="detailed-journal-header__dates">
          <CalendarDays size={18} aria-hidden="true" />
          {sameDate ? (
            <span>Ngày đang ghi: <strong>{formatDate(journalDate)}</strong></span>
          ) : (
            <span>
              Chi tiêu: <strong>{formatDate(expenseDate)}</strong>
              <span aria-hidden="true"> · </span>
              Nhật ký: <strong>{formatDate(journalDate)}</strong>
            </span>
          )}
        </div>

        {onReturnToQuickEntry && (
          <button
            type="button"
            className="detailed-journal-header__back"
            onClick={onReturnToQuickEntry}
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Quay lại nhập nhanh
          </button>
        )}
      </div>
    </header>
  );
}
