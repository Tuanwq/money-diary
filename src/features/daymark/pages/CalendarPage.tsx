import { useMemo, useState } from "react";
import {
  addDaysToDateString,
  getDateString,
  getMonthStart,
  getToday,
  toDate,
} from "../../../utils/date";
import { useDayMarkTaskRange } from "../hooks/useDayMarkTaskRange";
import { useDayMarkStreakSettings } from "../hooks/useDayMarkStreakSettings";
import {
  getDailyTaskStats,
  type DailyTaskStats,
} from "../utils/daymarkStreak";

type CalendarPageProps = {
  onNavigate: (path: string) => void;
  userId?: string;
};

export function CalendarPage({ onNavigate, userId }: CalendarPageProps) {
  const [monthStart, setMonthStart] = useState(getMonthStart());
  const monthEnd = useMemo(() => getMonthEnd(monthStart), [monthStart]);
  const { error, isLoading, tasks } = useDayMarkTaskRange({
    fromDate: monthStart,
    toDate: monthEnd,
    userId,
  });
  const { requiredCompletionRate } = useDayMarkStreakSettings();
  const days = useMemo(() => buildMonthDays(monthStart), [monthStart]);

  function moveMonth(delta: number) {
    const date = toDate(monthStart);
    date.setMonth(date.getMonth() + delta);
    setMonthStart(getDateString(new Date(date.getFullYear(), date.getMonth(), 1)));
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lịch DayMark</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tổng quan nhiệm vụ thật đã lưu trong tháng.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="rounded-2xl border border-slate-200 px-3 py-2 font-bold dark:border-slate-700"
          >
            {"<"}
          </button>
          <button
            type="button"
            onClick={() => setMonthStart(getMonthStart())}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
          >
            Tháng này
          </button>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="rounded-2xl border border-slate-200 px-3 py-2 font-bold dark:border-slate-700"
          >
            {">"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayTasks = tasks.filter((task) => task.task_date === day.date);
          const stats = getDailyTaskStats(
            day.date,
            dayTasks,
            requiredCompletionRate,
            getToday()
          );

          return (
            <button
              type="button"
              key={day.date}
              onClick={() => onNavigate(`/daymark/today?date=${day.date}`)}
              title={getCalendarDayTitle(stats, requiredCompletionRate)}
              aria-label={getCalendarDayTitle(stats, requiredCompletionRate)}
              className={`min-h-24 rounded-2xl border p-2 text-left transition ${getCalendarDayClass(
                day.inMonth,
                stats
              )} ${day.date === getToday() ? "ring-2 ring-emerald-300" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold">{Number(day.date.slice(8, 10))}</p>
                {stats.status !== "empty" && (
                  <span aria-hidden="true" className="text-xs">
                    {getCalendarDayIcon(stats.status)}
                  </span>
                )}
              </div>
              {dayTasks.length > 0 && (
                <div className="mt-2 text-xs">
                  <p className="font-bold">
                    {stats.completedTasks}/{stats.totalTasks} · {stats.completionRate}%
                  </p>
                  <p className="text-current opacity-80">
                    Yêu cầu {requiredCompletionRate}%
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <p className="mt-4 text-sm text-slate-500">Đang tải lịch...</p>
      )}
    </section>
  );
}

function getCalendarDayClass(inMonth: boolean, stats: DailyTaskStats) {
  if (stats.status === "completed") {
    return "border-green-200 bg-green-50 text-green-700 dark:border-green-700 dark:bg-slate-800 dark:text-green-100";
  }

  if (stats.status === "failed") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-slate-800 dark:text-red-100";
  }

  if (stats.status === "in-progress") {
    return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-slate-800 dark:text-amber-100";
  }

  return inMonth
    ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    : "border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-950";
}

function getCalendarDayIcon(status: DailyTaskStats["status"]) {
  if (status === "completed") return "✓";
  if (status === "failed") return "!";
  if (status === "in-progress") return "…";

  return "";
}

function getCalendarDayTitle(
  stats: DailyTaskStats,
  requiredCompletionRate: number
) {
  const statusLabel: Record<DailyTaskStats["status"], string> = {
    completed: "Hoàn thành",
    empty: "Không có nhiệm vụ",
    failed: "Không hoàn thành",
    "in-progress": "Đang thực hiện",
  };

  return [
    `Hoàn thành: ${stats.completedTasks}/${stats.totalTasks} nhiệm vụ`,
    `Tiến độ: ${stats.completionRate}%`,
    `Yêu cầu: ${requiredCompletionRate}%`,
    `Trạng thái: ${statusLabel[stats.status]}`,
  ].join(" · ");
}

function getMonthEnd(monthStart: string) {
  const date = toDate(monthStart);
  return getDateString(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function buildMonthDays(monthStart: string) {
  const firstDay = toDate(monthStart);
  const firstWeekday = firstDay.getDay() === 0 ? 7 : firstDay.getDay();
  let cursor = addDaysToDateString(monthStart, -(firstWeekday - 1));

  return Array.from({ length: 42 }, () => {
    const current = cursor;
    cursor = addDaysToDateString(cursor, 1);

    return {
      date: current,
      inMonth: current.slice(0, 7) === monthStart.slice(0, 7),
    };
  });
}
