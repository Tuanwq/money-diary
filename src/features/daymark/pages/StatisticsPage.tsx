import { useMemo, useState } from "react";
import {
  addDaysToDateString,
  getMonthStart,
  getToday,
} from "../../../utils/date";
import { useDayMarkTaskRange } from "../hooks/useDayMarkTaskRange";
import {
  buildDayMarkMetrics,
  dayMarkCategories,
  formatDuration,
  taskCategoryLabels,
} from "../utils/daymarkUtils";
import { PageHeader } from "../components/ui/PageHeader";

type StatisticsPageProps = {
  userId?: string;
};

export function StatisticsPage({ userId }: StatisticsPageProps) {
  const [range, setRange] = useState<7 | 14 | 30 | "month">("month");
  const today = getToday();
  const fromDate = range === "month" ? getMonthStart() : addDaysToDateString(today, -(range - 1));
  const { error, isLoading, tasks } = useDayMarkTaskRange({
    fromDate,
    toDate: today,
    userId,
  });
  const rangeMetrics = useMemo(() => buildDayMarkMetrics(tasks), [tasks]);

  return (
    <section className="grid gap-4">
      <PageHeader
        eyebrow="Thống kê"
        title="Nhìn lại nhẹ nhàng"
        subtitle="Chỉ giữ các chỉ số cần đọc để biết nhịp ngày của bạn."
        actions={
          <div className="flex flex-wrap gap-2">
            {[
              { label: "7 ngày", value: 7 },
              { label: "14 ngày", value: 14 },
              { label: "30 ngày", value: 30 },
              { label: "Tháng này", value: "month" },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setRange(item.value as 7 | 14 | 30 | "month")}
                className={`daymark-secondary-action ${
                  range === item.value ? "bg-[var(--dm-primary-soft)]" : ""
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      />

      {error && (
        <p className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricTile label="Hoàn thành" value={`${rangeMetrics.completionRate}%`} />
        <MetricTile label="Nhiệm vụ" value={`${rangeMetrics.completedCount}/${rangeMetrics.totalTasks}`} />
        <MetricTile label="Tổng thời gian" value={formatDuration(rangeMetrics.totalMinutes)} />
      </div>

      <section className="daymark-section">
        <h2 className="text-xl font-bold">Thời gian theo loại</h2>

        {tasks.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            Chưa có dữ liệu tháng này.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {dayMarkCategories.map((category) => {
              const minutes = rangeMetrics.categoryMinutes[category];
              const percent =
                rangeMetrics.totalMinutes > 0
                  ? Math.round((minutes / rangeMetrics.totalMinutes) * 100)
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
                      className="h-full rounded-full bg-[var(--dm-primary)]"
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

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="daymark-side-panel">
      <p className="text-sm font-bold text-[var(--dm-muted)]">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </article>
  );
}
