import {
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleX,
  Clock3,
  Flame,
  LoaderCircle,
  Minus,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { formatDateShort, toDate } from "../../../utils/date";
import {
  getMoneyStreakWeek,
  type MoneyStreakSummary,
  type MoneyStreakWeekDay,
} from "./moneyStreak";

type MoneyStreakDetailsProps = {
  anchorRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  isRestoring: boolean;
  onClose: () => void;
  onOpenCalendar: () => void;
  onRestore: () => void;
  portalTarget: Element;
  summary: MoneyStreakSummary;
};

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function MoneyStreakDetails({
  anchorRef,
  isOpen,
  isRestoring,
  onClose,
  onOpenCalendar,
  onRestore,
  portalTarget,
  summary,
}: MoneyStreakDetailsProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [weekOffset, setWeekOffset] = useState(0);
  const week = useMemo(
    () => getMoneyStreakWeek(summary, weekOffset),
    [summary, weekOffset]
  );
  const hasCompletedToday = summary.todayStatus === "completed";
  const canRestore = Boolean(summary.eligibleRestoreDate);
  const todayStatus = canRestore
    ? `Đã bỏ lỡ ngày ${formatDateShort(summary.eligibleRestoreDate!)}`
    : hasCompletedToday
      ? "Đã hoàn thành hôm nay"
      : "Chưa có ca HUB hôm nay";

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const returnFocusElement = document.activeElement as HTMLElement | null;
    const isMobile = window.matchMedia("(max-width: 700px)").matches;
    const previousOverflow = document.body.style.overflow;
    if (isMobile) document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])"
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusElement?.focus();
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      if (window.matchMedia("(max-width: 700px)").matches) {
        setPanelStyle({});
        return;
      }

      const anchor = anchorRef.current?.getBoundingClientRect();
      const panel = panelRef.current;
      if (!anchor || !panel) return;

      const viewportPadding = 16;
      const width = Math.min(660, window.innerWidth - viewportPadding * 2);
      const left = Math.min(
        Math.max(anchor.left, viewportPadding),
        window.innerWidth - width - viewportPadding
      );
      const panelHeight = panel.offsetHeight;
      const spaceBelow = window.innerHeight - anchor.bottom - viewportPadding;
      const top =
        spaceBelow >= panelHeight || anchor.top < panelHeight + viewportPadding
          ? Math.min(anchor.bottom + 8, window.innerHeight - panelHeight - viewportPadding)
          : anchor.top - panelHeight - 8;

      setPanelStyle({ left, top: Math.max(viewportPadding, top), width });
    }

    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, isOpen, isRestoring, summary.eligibleRestoreDate, weekOffset]);

  if (!isOpen) return null;

  return createPortal(
    <div className="money-streak-detail" role="presentation">
      <button
        type="button"
        className="money-streak-detail__backdrop"
        aria-label="Đóng chi tiết streak"
        onClick={onClose}
      />
      <section
        ref={panelRef}
        className="money-streak-detail__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={panelStyle}
      >
        <div className="money-streak-detail__handle" aria-hidden="true" />
        <header className="money-streak-detail__header">
          <div>
            <span>Chuỗi ca HUB</span>
            <h2 id={titleId}>Chi tiết streak</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className="money-streak-detail__summary">
          <div className="money-streak-detail__streak">
            <Flame size={22} aria-hidden="true" />
            <span>Hiện tại<strong>{summary.currentStreak} ngày</strong></span>
          </div>
          <div>
            <span>Kỷ lục<strong>{summary.longestStreak} ngày</strong></span>
          </div>
          <div
            className={`money-streak-detail__today${
              canRestore ? " is-warning" : hasCompletedToday ? " is-complete" : ""
            }`}
          >
            {canRestore ? (
              <CircleX size={17} aria-hidden="true" />
            ) : hasCompletedToday ? (
              <CircleCheck size={17} aria-hidden="true" />
            ) : (
              <Clock3 size={17} aria-hidden="true" />
            )}
            <strong>{todayStatus}</strong>
          </div>
        </div>

        <div className="money-streak-detail__week-header">
          <button
            type="button"
            aria-label="Xem tuần trước"
            onClick={() => setWeekOffset((value) => value - 1)}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <div aria-live="polite">
            <strong>{weekOffset === 0 ? "Tuần này" : "7 ngày đang xem"}</strong>
            <span>{formatDateShort(week.startDate)} - {formatDateShort(week.endDate)}</span>
          </div>
          <button
            type="button"
            aria-label="Xem tuần sau"
            onClick={() => setWeekOffset((value) => value + 1)}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>

        <ol className="money-streak-detail__days" aria-label="Trạng thái streak trong 7 ngày">
          {week.days.map((day) => (
            <StreakDay key={day.date} day={day} />
          ))}
        </ol>

        <footer className="money-streak-detail__actions">
          <button
            type="button"
            className="money-streak-detail__calendar"
            onClick={onOpenCalendar}
          >
            Xem toàn bộ lịch streak
            <ChevronRight size={17} aria-hidden="true" />
          </button>
          {canRestore && (
            <button
              type="button"
              className="money-streak-detail__restore"
              disabled={isRestoring}
              onClick={onRestore}
            >
              {isRestoring ? (
                <LoaderCircle className="money-streak-card__loader" size={17} aria-hidden="true" />
              ) : (
                <ShieldCheck size={17} aria-hidden="true" />
              )}
              {isRestoring
                ? "Đang khôi phục"
                : `Khôi phục ngày ${formatDateShort(summary.eligibleRestoreDate!)}`}
            </button>
          )}
        </footer>
      </section>
    </div>,
    portalTarget
  );
}

function StreakDay({ day }: { day: MoneyStreakWeekDay }) {
  const date = toDate(day.date);
  const dayLabel = WEEKDAY_LABELS[date.getDay()];
  const statusLabel = getStatusLabel(day);

  return (
    <li
      className={`money-streak-detail__day is-${day.status}${day.isToday ? " is-today" : ""}`}
      aria-label={`${dayLabel}, ${formatDateShort(day.date)}, ${statusLabel}`}
      title={statusLabel}
    >
      <span>{dayLabel}</span>
      <strong>{date.getDate()}/{date.getMonth() + 1}</strong>
      <span className="money-streak-detail__day-icon" aria-hidden="true">
        {day.status === "qualified" ? (
          <Flame size={16} />
        ) : day.status === "restored" ? (
          <ShieldCheck size={16} />
        ) : day.status === "missed" ? (
          <CircleX size={16} />
        ) : day.status === "incomplete" ? (
          <Clock3 size={16} />
        ) : day.status === "future" ? (
          <Circle size={13} />
        ) : (
          <Minus size={15} />
        )}
      </span>
    </li>
  );
}

function getStatusLabel(day: MoneyStreakWeekDay) {
  if (day.status === "qualified") return "Đã hoàn thành ca HUB";
  if (day.status === "restored") return "Đã được khôi phục";
  if (day.status === "missed") return "Đã bỏ lỡ";
  if (day.status === "incomplete") return "Hôm nay chưa có ca HUB";
  if (day.status === "future") return "Ngày tương lai";
  return "Không có ca HUB";
}
