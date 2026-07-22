import {
  CircleAlert,
  CircleCheck,
  Clock3,
  Flame,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useRef, useState } from "react";
import { formatDateShort } from "../../../utils/date";
import { MoneyStreakDetails } from "./MoneyStreakDetails";
import type { MoneyStreakSummary } from "./moneyStreak";

type MoneyStreakCardProps = {
  isCloudLoading: boolean;
  isRestoring: boolean;
  restoreError: string;
  summary: MoneyStreakSummary;
  onOpenCalendar: () => void;
  onRestore: (date: string) => Promise<boolean>;
};

export function MoneyStreakCard({
  isCloudLoading,
  isRestoring,
  restoreError,
  summary,
  onOpenCalendar,
  onRestore,
}: MoneyStreakCardProps) {
  const cardRef = useRef<HTMLElement | null>(null);
  const [actionError, setActionError] = useState("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsPortalTarget, setDetailsPortalTarget] = useState<Element | null>(
    null
  );
  const protectedDate = summary.restoredDates.at(-1) ?? null;
  const hasCompletedToday = summary.todayStatus === "completed";
  const canRestore = Boolean(summary.eligibleRestoreDate);
  const displayError = actionError || restoreError;
  const statusText = displayError
    ? displayError
    : canRestore
      ? `Đã bỏ lỡ ngày ${formatDateShort(summary.eligibleRestoreDate!)}`
      : hasCompletedToday
        ? "Đã hoàn thành hôm nay"
        : "Chưa có thu nhập từ ca HUB hôm nay";

  async function handleRestore() {
    const date = summary.eligibleRestoreDate;
    if (!date) return;

    const confirmed = window.confirm(
      `Bạn muốn dùng 1 lượt để bảo vệ streak ngày ${formatDateShort(date)}?`
    );
    if (!confirmed) return;

    setActionError("");
    const restored = await onRestore(date);
    if (!restored) {
      setActionError(
        "Ngày này không còn đủ điều kiện khôi phục. Dữ liệu streak đã được tính lại."
      );
    }
  }

  function openDetails() {
    setDetailsPortalTarget(
      cardRef.current?.closest(".money-shell") ?? document.body
    );
    setIsDetailsOpen(true);
  }

  return (
    <>
      <section
        ref={cardRef}
        className={`money-card money-streak-card${
          canRestore ? " is-warning" : hasCompletedToday ? " is-complete" : ""
        }${displayError ? " is-error" : ""}${canRestore ? " has-restore" : ""}`}
        role="button"
        tabIndex={0}
        aria-labelledby="money-streak-title"
        aria-busy={isCloudLoading || isRestoring}
        aria-expanded={isDetailsOpen}
        aria-haspopup="dialog"
        title="Xem chi tiết streak"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          openDetails();
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          openDetails();
        }}
      >
        <header className="money-streak-card__identity">
          <span className="money-streak-card__icon" aria-hidden="true">
            <Flame size={20} />
          </span>
          <h2 id="money-streak-title">Streak {summary.currentStreak} ngày</h2>
          {isCloudLoading && (
            <LoaderCircle
              className="money-streak-card__loader"
              size={16}
              aria-label="Đang đồng bộ streak"
            />
          )}
        </header>

        <div
          className="money-streak-card__status"
          aria-live="polite"
        >
          <span aria-hidden="true">
            {displayError ? (
              <CircleAlert size={18} />
            ) : canRestore ? (
              <ShieldCheck size={19} />
            ) : hasCompletedToday ? (
              <CircleCheck size={19} />
            ) : (
              <Clock3 size={19} />
            )}
          </span>
          <div>
            <strong>{statusText}</strong>
            {protectedDate && !displayError && (
              <span className="money-streak-card__protected">
                <ShieldCheck size={13} aria-hidden="true" />
                Đã bảo vệ ngày {formatDateShort(protectedDate)}
              </span>
            )}
          </div>
        </div>

        <dl className="money-streak-card__metrics">
          <div>
            <dt>Kỷ lục:</dt>
            <dd>{summary.longestStreak} ngày</dd>
          </div>
          <div>
            <dt>Khôi phục:</dt>
            <dd>{summary.restoreCredits}/{summary.restoreLimit}</dd>
          </div>
        </dl>

        {canRestore && (
          <button
            type="button"
            className="money-streak-card__restore"
            disabled={isRestoring}
            onClick={(event) => {
              event.stopPropagation();
              void handleRestore();
            }}
          >
            {isRestoring ? (
              <LoaderCircle className="money-streak-card__loader" size={17} aria-hidden="true" />
            ) : (
              <ShieldCheck size={17} aria-hidden="true" />
            )}
            {isRestoring
              ? "Đang khôi phục"
              : "Khôi phục"}
          </button>
        )}
      </section>

      {isDetailsOpen && detailsPortalTarget && (
        <MoneyStreakDetails
          anchorRef={cardRef}
          isOpen
          isRestoring={isRestoring}
          portalTarget={detailsPortalTarget}
          summary={summary}
          onClose={() => setIsDetailsOpen(false)}
          onOpenCalendar={() => {
            setIsDetailsOpen(false);
            onOpenCalendar();
          }}
          onRestore={() => void handleRestore()}
        />
      )}
    </>
  );
}
