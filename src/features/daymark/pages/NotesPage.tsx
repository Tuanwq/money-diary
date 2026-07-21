import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { addDaysToDateString, getToday } from "../../../utils/date";
import { useDayMarkTaskRange } from "../hooks/useDayMarkTaskRange";
import { PageHeader } from "../components/ui/PageHeader";

type NotesPageProps = {
  userId?: string;
};

export function NotesPage({ userId }: NotesPageProps) {
  const [query, setQuery] = useState("");
  const today = getToday();
  const { error, isLoading, tasks } = useDayMarkTaskRange({
    fromDate: addDaysToDateString(today, -29),
    toDate: today,
    userId,
  });
  const notedTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.note?.trim())
        .filter((task) => {
          const normalizedQuery = query.trim().toLocaleLowerCase("vi");

          if (!normalizedQuery) return true;

          return `${task.title} ${task.note ?? ""} ${task.task_date}`
            .toLocaleLowerCase("vi")
            .includes(normalizedQuery);
        }),
    [query, tasks]
  );

  return (
    <section className="grid gap-4">
      <PageHeader
        eyebrow="Ghi chú"
        title="Nhật ký theo ngày"
        subtitle="Tìm lại những ghi chú kết quả trong 30 ngày gần nhất."
      />

      <label className="daymark-section flex items-center gap-3">
        <Search aria-hidden="true" size={18} />
        <span className="sr-only">Tìm ghi chú</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm theo ngày, nhiệm vụ hoặc nội dung..."
          className="min-w-0 flex-1 bg-transparent outline-none"
        />
      </label>

      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {notedTasks.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          Chưa có ghi chú nào. Khi bạn ghi chú kết quả trong nhiệm vụ, dữ liệu sẽ hiện ở đây.
        </p>
      ) : (
        <div className="grid gap-3">
          {notedTasks.map((task) => (
            <article
              key={task.id}
              className="daymark-section"
            >
              <p className="text-sm font-bold text-[var(--dm-muted)]">{task.task_date}</p>
              <h2 className="mt-1 font-bold">{task.title}</h2>
              <p className="mt-2 text-sm text-[var(--dm-muted)]">
                {task.note}
              </p>
            </article>
          ))}
        </div>
      )}

      {isLoading && <p className="mt-4 text-sm text-slate-500">Đang tải...</p>}
    </section>
  );
}
