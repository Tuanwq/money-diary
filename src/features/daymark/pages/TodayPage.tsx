import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDaysToDateString,
  formatDateShort,
  getToday,
} from "../../../utils/date";
import type {
  DayMarkTask,
  DayMarkTaskDraft,
  DayMarkTaskForm,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from "../types/daymark";
import { NextTaskCard } from "../components/today/NextTaskCard";
import { ProgressSummary } from "../components/today/ProgressSummary";
import { TaskTimeline } from "../components/today/TaskTimeline";
import { PageHeader } from "../components/ui/PageHeader";
import { useDayMarkTaskRange } from "../hooks/useDayMarkTaskRange";
import { useDayMarkTasks } from "../hooks/useDayMarkTasks";
import { useDayMarkStreakSettings } from "../hooks/useDayMarkStreakSettings";
import {
  buildDayMarkMetrics,
  createEmptyTaskForm,
  dayMarkCategories,
  dayMarkPriorities,
  dayMarkStatuses,
  formatDuration,
  getTomorrow,
  parseScheduleText,
  taskCategoryLabels,
  taskPriorityLabels,
  taskStatusLabels,
  validateTaskForm,
} from "../utils/daymarkUtils";
import { getGreeting, getNextTask } from "../utils/daymarkSelectors";
import {
  buildDailyTaskStatsMap,
  calculateCurrentStreak,
  calculateLongestStreak,
  getDailyTaskStats,
} from "../utils/daymarkStreak";
import {
  isPomodoroActive,
  readStoredPomodoroState,
} from "../utils/pomodoroUtils";

type TodayPageProps = {
  initialDate?: string;
  onNavigate: (path: string) => void;
  userId?: string;
};

export function TodayPage({
  initialDate = getToday(),
  onNavigate,
  userId,
}: TodayPageProps) {
  const initialParams = new URLSearchParams(window.location.search);
  const initialSelectedDate = initialParams.get("date") || initialDate;
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [form, setForm] = useState<DayMarkTaskForm>(() =>
    createEmptyTaskForm(initialSelectedDate)
  );
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [importText, setImportText] = useState("");
  const [importDrafts, setImportDrafts] = useState<DayMarkTaskDraft[]>([]);
  const [importErrors, setImportErrors] = useState<
    Array<{ lineNumber: number; message: string; sourceLine: string }>
  >([]);
  const [pomodoroSnapshot, setPomodoroSnapshot] = useState(
    readStoredPomodoroState
  );
  const {
    createTask,
    createTasks,
    deleteTask,
    error,
    isLoading,
    tasks,
    updateTask,
    updateTaskStatus,
  } = useDayMarkTasks({ date: selectedDate, userId });
  const { tasks: streakHistoryTasks } = useDayMarkTaskRange({
    fromDate: "2000-01-01",
    toDate: getToday(),
    userId,
  });
  const { requiredCompletionRate } = useDayMarkStreakSettings();
  const metrics = useMemo(() => buildDayMarkMetrics(tasks), [tasks]);
  const streakTasks = useMemo(
    () => [
      ...streakHistoryTasks.filter((task) => task.task_date !== selectedDate),
      ...tasks,
    ],
    [selectedDate, streakHistoryTasks, tasks]
  );
  const todayStats = useMemo(
    () =>
      getDailyTaskStats(
        getToday(),
        streakTasks,
        requiredCompletionRate,
        getToday()
      ),
    [requiredCompletionRate, streakTasks]
  );
  const streakStatsMap = useMemo(
    () =>
      buildDailyTaskStatsMap(
        streakTasks,
        requiredCompletionRate,
        getToday()
      ),
    [requiredCompletionRate, streakTasks]
  );
  const currentStreak = useMemo(
    () => calculateCurrentStreak(streakStatsMap, getToday()),
    [streakStatsMap]
  );
  const longestStreak = useMemo(
    () => calculateLongestStreak(streakStatsMap, getToday()),
    [streakStatsMap]
  );
  const nextTask = useMemo(() => getNextTask(tasks), [tasks]);
  const focusingTaskId =
    pomodoroSnapshot.status === "running" ? pomodoroSnapshot.taskId : null;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPomodoroSnapshot(readStoredPomodoroState());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  function updateSelectedDate(nextDate: string) {
    setSelectedDate(nextDate);
    setEditingTaskId(null);
    setForm(createEmptyTaskForm(nextDate));
    setFormError("");
    setImportDrafts([]);
    setImportErrors([]);
    setIsScheduleModalOpen(false);
  }

  function openScheduleModal() {
    setEditingTaskId(null);
    setForm(createEmptyTaskForm(selectedDate));
    setFormError("");
    setIsScheduleModalOpen(true);
  }

  function startEditTask(task: DayMarkTask) {
    setEditingTaskId(task.id);
    setForm({
      task_date: task.task_date,
      title: task.title,
      description: task.description ?? "",
      category: task.category,
      start_time: task.start_time.slice(0, 5),
      end_time: task.end_time.slice(0, 5),
      priority: task.priority,
      status: task.status,
      note: task.note ?? "",
    });
    setFormError("");
    setIsScheduleModalOpen(true);
    alert(`Đã mở chế độ sửa nhiệm vụ "${task.title}".`);
  }

  function cancelEdit() {
    setEditingTaskId(null);
    setForm(createEmptyTaskForm(selectedDate));
    setFormError("");
  }

  function closeScheduleModal() {
    setIsScheduleModalOpen(false);
    cancelEdit();
    setImportText("");
    setImportDrafts([]);
    setImportErrors([]);
  }

  async function handleSaveTask(event: React.FormEvent) {
    event.preventDefault();

    const nextForm = {
      ...form,
      task_date: selectedDate,
    };
    const validationError = validateTaskForm(nextForm);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const wasEditing = Boolean(editingTaskId);
    const savedTitle = nextForm.title.trim();
    const success = editingTaskId
      ? await updateTask(editingTaskId, nextForm)
      : await createTask(nextForm);

    if (!success) return;

    setIsScheduleModalOpen(false);
    cancelEdit();

    if (wasEditing) {
      alert(`Đã lưu sửa nhiệm vụ "${savedTitle}".`);
    }
  }

  async function handleMoveTaskTomorrow(task: DayMarkTask) {
    const success = await updateTask(task.id, {
      task_date: getTomorrow(task.task_date),
      status: "pending",
    });

    if (success) {
      alert(`Đã chuyển nhiệm vụ "${task.title}" sang ngày mai.`);
    }
  }

  async function handleDeleteTask(task: DayMarkTask) {
    const confirmed = confirm(
      `Bạn có chắc muốn xóa nhiệm vụ "${task.title}" không?`
    );

    if (!confirmed) return;

    const success = await deleteTask(task.id);

    if (success) {
      alert(`Đã xóa nhiệm vụ "${task.title}".`);
    }
  }

  function openTaskPomodoro(task: DayMarkTask) {
    const snapshot = readStoredPomodoroState();
    const isAnotherTaskActive =
      isPomodoroActive(snapshot.status) &&
      snapshot.taskId &&
      snapshot.taskId !== task.id;

    if (isAnotherTaskActive) {
      const confirmed = confirm(
        "Đang có nhiệm vụ khác trong Pomodoro. Bạn muốn dừng phiên hiện tại và chuyển sang nhiệm vụ này không?"
      );

      if (!confirmed) return;
    }

    onNavigate(
      `/daymark/pomodoro?taskId=${encodeURIComponent(
        task.id
      )}&date=${encodeURIComponent(task.task_date)}${
        isAnotherTaskActive ? "&switch=1" : ""
      }`
    );
  }

  function buildImportPreview() {
    const parsedLines = parseScheduleText(importText, selectedDate);

    setImportDrafts(parsedLines.flatMap((line) => (line.draft ? [line.draft] : [])));
    setImportErrors(
      parsedLines.flatMap((line) =>
        line.error
          ? [
              {
                lineNumber: line.lineNumber,
                message: line.error,
                sourceLine: line.sourceLine,
              },
            ]
          : []
      )
    );
  }

  async function confirmImport() {
    const validDrafts = importDrafts.filter((draft) => !draft.removed);

    if (validDrafts.length === 0) {
      setImportErrors([
        {
          lineNumber: 0,
          message: "Không có dòng hợp lệ nào để lưu.",
          sourceLine: "",
        },
      ]);
      return;
    }

    const success = await createTasks(
      validDrafts.map((draft) => ({
        task_date: draft.task_date,
        title: draft.title,
        description: draft.description,
        category: draft.category,
        start_time: draft.start_time,
        end_time: draft.end_time,
        priority: draft.priority,
        status: draft.status,
        note: draft.note,
      }))
    );

    if (!success) return;

    setImportText("");
    setImportDrafts([]);
    setImportErrors([]);
    setIsScheduleModalOpen(false);
    alert(`Đã nhập ${validDrafts.length} nhiệm vụ từ văn bản.`);
  }

  return (
    <>
      <PageHeader
        eyebrow={getGreeting()}
        title={formatDateShort(selectedDate)}
        subtitle="Một ngày gọn gàng bắt đầu từ việc tiếp theo."
        actions={
          <div className="daymark-date-actions">
            <button
              type="button"
              onClick={() => updateSelectedDate(addDaysToDateString(selectedDate, -1))}
              className="daymark-icon-button"
              aria-label="Ngày trước"
            >
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
            <button
              type="button"
              onClick={() => updateSelectedDate(addDaysToDateString(selectedDate, 1))}
              className="daymark-icon-button"
              aria-label="Ngày sau"
            >
              <ChevronRight aria-hidden="true" size={18} />
            </button>
            <button
              type="button"
              onClick={() => updateSelectedDate(getToday())}
              className="daymark-secondary-action"
            >
              Hôm nay
            </button>
          </div>
        }
      />

      <div className="daymark-today-grid">
        <div className="grid gap-4">
          <ProgressSummary
            completedCount={metrics.completedCount}
            completionRate={metrics.completionRate}
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            requiredCompletionRate={requiredCompletionRate}
            totalTasks={metrics.totalTasks}
          />

          <NextTaskCard task={nextTask} onFocus={openTaskPomodoro} />
        </div>
        <aside className="daymark-side-panel">
          <p className="daymark-muted-label">Tổng kết nhẹ</p>
          <div className="mt-3 grid gap-3">
            <SideMetric label="Tổng thời gian" value={formatDuration(metrics.totalMinutes)} />
            <SideMetric label="Số nhiệm vụ" value={isLoading ? "Đang tải..." : String(metrics.totalTasks)} />
            <SideMetric
              label="Hôm nay"
              value={`${todayStats.completedTasks}/${todayStats.totalTasks} · ${todayStats.completionRate}%`}
            />
          </div>
        </aside>
      </div>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <section className="daymark-section">
        <div className="daymark-section-heading">
          <div>
            <h2>Timeline hôm nay</h2>
            <p>Chạm vào vòng trạng thái để đổi nhanh tiến độ.</p>
          </div>
          <button
            type="button"
            onClick={openScheduleModal}
            className="daymark-secondary-action"
          >
            <CalendarPlus aria-hidden="true" size={16} />
            Thêm lịch
          </button>
        </div>

        <TaskTimeline
          focusingTaskId={focusingTaskId}
          onAddTask={openScheduleModal}
          onDelete={handleDeleteTask}
          onEdit={startEditTask}
          onFocus={openTaskPomodoro}
          onMoveTomorrow={handleMoveTaskTomorrow}
          onStatusChange={(task, status) => updateTaskStatus(task.id, status)}
          tasks={tasks}
        />
      </section>

      {isScheduleModalOpen && (
        <ScheduleModal
          editing={Boolean(editingTaskId)}
          onClose={closeScheduleModal}
        >
          <div
            className={`grid gap-4 ${
              editingTaskId ? "lg:grid-cols-1" : "lg:grid-cols-[1fr_1.1fr]"
            }`}
          >
            <TaskFormCard
              editing={Boolean(editingTaskId)}
              error={formError}
              form={form}
              onCancel={closeScheduleModal}
              onChange={setForm}
              onSubmit={handleSaveTask}
            />

            {!editingTaskId && (
              <ImportScheduleCard
                drafts={importDrafts}
                errors={importErrors}
                importText={importText}
                onBuildPreview={buildImportPreview}
                onConfirmImport={confirmImport}
                onDraftChange={setImportDrafts}
                onImportTextChange={setImportText}
              />
            )}
          </div>
        </ScheduleModal>
      )}
    </>
  );
}

function ScheduleModal({
  children,
  editing,
  onClose,
}: {
  children: React.ReactNode;
  editing: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/50 px-3 py-4 backdrop-blur-sm sm:px-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="daymark-schedule-modal-title"
        className="mx-auto flex max-h-[92dvh] max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              DayMark
            </p>
            <h2
              id="daymark-schedule-modal-title"
              className="text-xl font-black"
            >
              {editing ? "Sửa nhiệm vụ" : "Thêm lịch"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Đóng
          </button>
        </header>

        <div className="overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

function SideMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-[var(--dm-soft)] p-4">
      <p className="text-sm font-bold text-[var(--dm-muted)]">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function TaskFormCard({
  editing,
  error,
  form,
  onCancel,
  onChange,
  onSubmit,
}: {
  editing: boolean;
  error: string;
  form: DayMarkTaskForm;
  onCancel: () => void;
  onChange: (form: DayMarkTaskForm) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <h2 className="text-xl font-black">
        {editing ? "Sửa nhiệm vụ" : "Thêm nhiệm vụ"}
      </h2>

      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <Field label="Tên nhiệm vụ">
          <input
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            className="app-input w-full rounded-2xl border px-3 py-2"
            placeholder="VD: TOEIC Reading"
          />
        </Field>

        <Field label="Mô tả">
          <input
            value={form.description}
            onChange={(event) =>
              onChange({ ...form, description: event.target.value })
            }
            className="app-input w-full rounded-2xl border px-3 py-2"
            placeholder="Mô tả ngắn"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Bắt đầu">
            <input
              type="time"
              value={form.start_time}
              onChange={(event) =>
                onChange({ ...form, start_time: event.target.value })
              }
              className="app-input w-full rounded-2xl border px-3 py-2"
            />
          </Field>

          <Field label="Kết thúc">
            <input
              type="time"
              value={form.end_time}
              onChange={(event) =>
                onChange({ ...form, end_time: event.target.value })
              }
              className="app-input w-full rounded-2xl border px-3 py-2"
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Category">
            <select
              value={form.category}
              onChange={(event) =>
                onChange({
                  ...form,
                  category: event.target.value as TaskCategory,
                })
              }
              className="app-input w-full rounded-2xl border px-3 py-2"
            >
              {dayMarkCategories.map((category) => (
                <option key={category} value={category}>
                  {taskCategoryLabels[category]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Ưu tiên">
            <select
              value={form.priority}
              onChange={(event) =>
                onChange({
                  ...form,
                  priority: event.target.value as TaskPriority,
                })
              }
              className="app-input w-full rounded-2xl border px-3 py-2"
            >
              {dayMarkPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {taskPriorityLabels[priority]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Trạng thái">
            <select
              value={form.status}
              onChange={(event) =>
                onChange({
                  ...form,
                  status: event.target.value as TaskStatus,
                })
              }
              className="app-input w-full rounded-2xl border px-3 py-2"
            >
              {dayMarkStatuses.map((status) => (
                <option key={status} value={status}>
                  {taskStatusLabels[status]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Ghi chú kết quả">
          <textarea
            value={form.note}
            onChange={(event) => onChange({ ...form, note: event.target.value })}
            className="app-input min-h-36 w-full resize-y rounded-2xl border px-3 py-2"
            placeholder="Kết quả, lý do chưa hoàn thành..."
          />
        </Field>

        {error && (
          <p className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-2xl bg-slate-900 px-5 py-2 font-bold text-white transition hover:bg-emerald-700"
          >
            {editing ? "Lưu sửa" : "Thêm nhiệm vụ"}
          </button>

          {editing && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl border border-slate-200 px-5 py-2 font-bold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function ImportScheduleCard({
  drafts,
  errors,
  importText,
  onBuildPreview,
  onConfirmImport,
  onDraftChange,
  onImportTextChange,
}: {
  drafts: DayMarkTaskDraft[];
  errors: Array<{ lineNumber: number; message: string; sourceLine: string }>;
  importText: string;
  onBuildPreview: () => void;
  onConfirmImport: () => void;
  onDraftChange: (drafts: DayMarkTaskDraft[]) => void;
  onImportTextChange: (value: string) => void;
}) {
  return (
    <section className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <h2 className="text-xl font-black">Nhập lịch từ văn bản</h2>
      <textarea
        value={importText}
        onChange={(event) => onImportTextChange(event.target.value)}
        className="app-input mt-4 min-h-72 w-full flex-1 resize-y rounded-2xl border px-3 py-2 font-mono text-sm lg:min-h-[360px]"
        placeholder={"03:00-10:00 | Ngủ\n10:00-13:00 | Làm việc\n14:00-15:30 | TOEIC Reading"}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onBuildPreview}
          className="rounded-2xl bg-slate-900 px-5 py-2 font-bold text-white transition hover:bg-emerald-700"
        >
          Xem trước
        </button>
        {drafts.length > 0 && (
          <button
            type="button"
            onClick={onConfirmImport}
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-2 font-bold text-emerald-800 transition hover:bg-emerald-100"
          >
            Lưu các dòng hợp lệ
          </button>
        )}
      </div>

      {errors.length > 0 && (
        <div className="mt-3 grid gap-2">
          {errors.map((error) => (
            <p
              key={`${error.lineNumber}-${error.sourceLine}`}
              className="rounded-2xl bg-red-50 p-3 text-sm text-red-700"
            >
              Dòng {error.lineNumber || "?"}: {error.message}
            </p>
          ))}
        </div>
      )}

      {drafts.length > 0 && (
        <div className="mt-4 grid max-h-[420px] gap-2 overflow-y-auto pr-1">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className={`rounded-2xl border p-3 ${
                draft.removed
                  ? "border-slate-200 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-800"
                  : "border-emerald-100 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20"
              }`}
            >
              <div className="grid gap-2 sm:grid-cols-[96px_96px_1fr]">
                <input
                  type="time"
                  value={draft.start_time}
                  disabled={draft.removed}
                  onChange={(event) =>
                    onDraftChange(
                      drafts.map((item) =>
                        item.id === draft.id
                          ? { ...item, start_time: event.target.value }
                          : item
                      )
                    )
                  }
                  className="app-input rounded-xl border px-3 py-2"
                />
                <input
                  type="time"
                  value={draft.end_time}
                  disabled={draft.removed}
                  onChange={(event) =>
                    onDraftChange(
                      drafts.map((item) =>
                        item.id === draft.id
                          ? { ...item, end_time: event.target.value }
                          : item
                      )
                    )
                  }
                  className="app-input rounded-xl border px-3 py-2"
                />
                <input
                  value={draft.title}
                  disabled={draft.removed}
                  onChange={(event) =>
                    onDraftChange(
                      drafts.map((item) =>
                        item.id === draft.id
                          ? { ...item, title: event.target.value }
                          : item
                      )
                    )
                  }
                  className="app-input rounded-xl border px-3 py-2"
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={draft.category}
                  disabled={draft.removed}
                  onChange={(event) =>
                    onDraftChange(
                      drafts.map((item) =>
                        item.id === draft.id
                          ? {
                              ...item,
                              category: event.target.value as TaskCategory,
                            }
                          : item
                      )
                    )
                  }
                  className="app-input rounded-xl border px-3 py-2 text-sm"
                >
                  {dayMarkCategories.map((category) => (
                    <option key={category} value={category}>
                      {taskCategoryLabels[category]}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    onDraftChange(
                      drafts.map((item) =>
                        item.id === draft.id
                          ? { ...item, removed: !item.removed }
                          : item
                      )
                    )
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold transition hover:bg-white dark:border-slate-700"
                >
                  {draft.removed ? "Khôi phục" : "Loại bỏ"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      <span>{label}</span>
      {children}
    </label>
  );
}
