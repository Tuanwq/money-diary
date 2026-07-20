import { addDaysToDateString, getToday } from "../../../utils/date";
import { useDayMarkTaskRange } from "../hooks/useDayMarkTaskRange";

type NotesPageProps = {
  userId?: string;
};

export function NotesPage({ userId }: NotesPageProps) {
  const today = getToday();
  const { error, isLoading, tasks } = useDayMarkTaskRange({
    fromDate: addDaysToDateString(today, -29),
    toDate: today,
    userId,
  });
  const notedTasks = tasks.filter((task) => task.note?.trim());

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <h1 className="text-2xl font-black">Ghi chú DayMark</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Tổng hợp ghi chú kết quả từ nhiệm vụ trong 30 ngày gần nhất.
      </p>

      {error && (
        <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {notedTasks.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          Chưa có ghi chú nào. Khi bạn ghi chú kết quả trong nhiệm vụ, dữ liệu sẽ hiện ở đây.
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {notedTasks.map((task) => (
            <article
              key={task.id}
              className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800"
            >
              <p className="text-sm font-bold text-slate-500">{task.task_date}</p>
              <h2 className="mt-1 font-black">{task.title}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
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
