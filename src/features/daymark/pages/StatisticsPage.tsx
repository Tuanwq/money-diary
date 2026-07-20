import { useMemo } from "react";
import {
  addDaysToDateString,
  getMonthStart,
  getToday,
} from "../../../utils/date";
import type { DayMarkTask } from "../types/daymark";
import { useDayMarkTaskRange } from "../hooks/useDayMarkTaskRange";
import {
  buildDayMarkMetrics,
  dayMarkCategories,
  formatDuration,
  taskCategoryLabels,
} from "../utils/daymarkUtils";

type StatisticsPageProps = {
  userId?: string;
};

export function StatisticsPage({ userId }: StatisticsPageProps) {
  const today = getToday();
  const fromDate = addDaysToDateString(today, -29);
  const { error, isLoading, tasks } = useDayMarkTaskRange({
    fromDate,
    toDate: today,
    userId,
  });
  const todayTasks = tasks.filter((task) => task.task_date === today);
  const weekStart = addDaysToDateString(today, -6);
  const weekTasks = tasks.filter((task) => task.task_date >= weekStart);
  const monthTasks = tasks.filter((task) => task.task_date >= getMonthStart());
  const monthMetrics = useMemo(
    () => buildDayMarkMetrics(monthTasks),
    [monthTasks]
  );

  return (
    <section className="grid gap-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <h1 className="text-2xl font-black">Thống kê DayMark</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Dựa trên nhiệm vụ thật đã lưu trong 30 ngày gần nhất.
        </p>
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Hôm nay" tasks={todayTasks} />
        <StatCard title="7 ngày" tasks={weekTasks} />
        <StatCard title="Tháng này" tasks={monthTasks} />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <h2 className="text-xl font-black">Thời gian theo loại trong tháng</h2>

        {monthTasks.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            Chưa có dữ liệu tháng này.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {dayMarkCategories.map((category) => {
              const minutes = monthMetrics.categoryMinutes[category];
              const percent =
                monthMetrics.totalMinutes > 0
                  ? Math.round((minutes / monthMetrics.totalMinutes) * 100)
                  : 0;

              return (
                <div key={category}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold">
                      {taskCategoryLabels[category]}
                    </span>
                    <span className="text-slate-500">
                      {formatDuration(minutes)} · {percent}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-700"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isLoading && (
          <p className="mt-4 text-sm text-slate-500">Đang tải thống kê...</p>
        )}
      </section>
    </section>
  );
}

function StatCard({ tasks, title }: { tasks: DayMarkTask[]; title: string }) {
  const metrics = buildDayMarkMetrics(tasks);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-1 text-3xl font-black">{metrics.completionRate}%</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {metrics.completedCount}/{metrics.totalTasks} hoàn thành ·{" "}
        {formatDuration(metrics.totalMinutes)}
      </p>
    </article>
  );
}
