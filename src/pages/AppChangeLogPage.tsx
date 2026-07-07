import type { AppChangeLog, AppDataKey, GoalScreen, Page } from "../types";
import { formatDateShort } from "../utils/date";

type AppChangeLogPageProps = {
  changeLogs: AppChangeLog[];
  navigateTo: (nextPage: Page, nextGoalScreen?: GoalScreen) => void;
  restoreChangeLog: (id: string) => void;
};

const DATA_LABELS: Record<AppDataKey, string> = {
  entries: "Nhật ký / tiền làm",
  expenses: "Chi tiêu",
  balanceChecks: "Kiểm kê",
  goals: "Mục tiêu",
  completedGoals: "Mục tiêu đã hoàn thành",
};

const ACTION_LABELS: Record<AppChangeLog["action"], string> = {
  create: "Thêm",
  update: "Sửa",
  delete: "Xóa",
  complete: "Hoàn thành",
  restore: "Khôi phục",
};

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function AppChangeLogPage({
  changeLogs,
  navigateTo,
  restoreChangeLog,
}: AppChangeLogPageProps) {
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Undo toàn app
          </p>
          <h2 className="text-2xl font-black">Lịch sử thay đổi dữ liệu</h2>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi đã sửa gì, trước đó là gì và khôi phục khi nhập nhầm.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigateTo("home", "menu")}
          className="rounded-xl border bg-white px-4 py-2 text-sm font-bold hover:bg-slate-100"
        >
          Về Home
        </button>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Khi bấm khôi phục, app sẽ đưa các phần liên quan về trạng thái
        <strong> trước thay đổi đó</strong>. Với dữ liệu tiền thật, nên xem kỹ
        mục “Trước đó” và “Sau thay đổi” trước khi khôi phục.
      </div>

      {changeLogs.length === 0 ? (
        <div className="rounded-2xl bg-white p-5 text-slate-500 shadow-sm">
          Chưa có lịch sử thay đổi nào.
        </div>
      ) : (
        <div className="grid gap-3">
          {changeLogs.map((log) => (
            <article
              key={log.id}
              className="rounded-2xl bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {ACTION_LABELS[log.action]}
                    </span>
                    {log.date && (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {formatDateShort(log.date)}
                      </span>
                    )}
                    {log.restoredAt && (
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                        Đã khôi phục
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 break-words text-lg font-black">
                    {log.title}
                  </h3>
                  <p className="mt-1 break-words text-sm text-slate-500">
                    {log.description}
                  </p>
                  <p className="mt-2 text-xs font-medium text-slate-400">
                    {formatTimestamp(log.createdAt)}
                  </p>
                </div>

                {log.action !== "restore" && (
                  <button
                    type="button"
                    onClick={() => restoreChangeLog(log.id)}
                    disabled={Boolean(log.restoredAt)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold ${
                      log.restoredAt
                        ? "cursor-not-allowed bg-slate-100 text-slate-400"
                        : "bg-slate-900 text-white hover:bg-slate-700"
                    }`}
                  >
                    Khôi phục
                  </button>
                )}
              </div>

              <div className="mt-4 grid gap-3">
                {log.patches.map((patch, index) => (
                  <div
                    key={`${log.id}-${patch.key}-${index}`}
                    className="rounded-2xl border p-3"
                  >
                    <p className="text-sm font-black">
                      {DATA_LABELS[patch.key]}
                    </p>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <ChangeSnapshot
                        label="Trước đó"
                        value={patch.beforeSummary}
                      />
                      <ChangeSnapshot
                        label="Sau thay đổi"
                        value={patch.afterSummary}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ChangeSnapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-100 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-line break-words text-sm font-bold">
        {value}
      </p>
    </div>
  );
}
