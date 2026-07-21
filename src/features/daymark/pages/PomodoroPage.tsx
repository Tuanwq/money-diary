import { Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getToday } from "../../../utils/date";
import { recordPomodoroSession } from "../services/daymarkPomodoroService";
import { updateDayMarkTask } from "../services/daymarkTasksService";
import { useDayMarkTasks } from "../hooks/useDayMarkTasks";
import { usePomodoroTimer } from "../hooks/usePomodoroTimer";
import { PageHeader } from "../components/ui/PageHeader";
import type { DayMarkTask, TaskStatus } from "../types/daymark";
import {
  formatDuration,
  taskCategoryLabels,
} from "../utils/daymarkUtils";
import {
  clampPomodoroMinutes,
  formatPomodoroClock,
  getPomodoroModeLabel,
  isPomodoroActive,
} from "../utils/pomodoroUtils";

type PomodoroPageProps = {
  onNavigate: (path: string) => void;
  userId?: string;
};

const focusPresetMinutes = [15, 25, 45, 60];

function getTaskPlannedSeconds(task?: DayMarkTask) {
  return Math.max((task?.duration_minutes ?? 0) * 60, 0);
}

function getTaskCompletionStatus(
  actualSeconds: number,
  plannedSeconds: number
): TaskStatus {
  if (plannedSeconds > 0 && actualSeconds >= plannedSeconds) return "completed";
  if (actualSeconds > 0) return "partial";

  return "pending";
}

function getAutoAlignedFocusMinutes(
  remainingPlannedSeconds: number,
  preferredFocusMinutes: number
) {
  if (remainingPlannedSeconds <= 0) return preferredFocusMinutes;

  const remainingMinutes = Math.ceil(remainingPlannedSeconds / 60);

  return clampPomodoroMinutes(
    Math.min(remainingMinutes, preferredFocusMinutes)
  );
}

function getCompletedTaskSessions(
  actualFocusSeconds: number,
  focusDurationMinutes: number
) {
  const focusDurationSeconds = Math.max(focusDurationMinutes * 60, 1);

  return Math.floor(Math.max(actualFocusSeconds, 0) / focusDurationSeconds);
}

function getTotalTaskSessions(
  completedSessions: number,
  remainingFocusSeconds: number,
  focusDurationMinutes: number
) {
  if (remainingFocusSeconds <= 0) return 0;

  const focusDurationSeconds = Math.max(focusDurationMinutes * 60, 1);

  return (
    completedSessions +
    Math.ceil(Math.max(remainingFocusSeconds, 0) / focusDurationSeconds)
  );
}

export function PomodoroPage({ onNavigate, userId }: PomodoroPageProps) {
  const timer = usePomodoroTimer();
  const initialParams = new URLSearchParams(window.location.search);
  const [taskDate, setTaskDate] = useState(
    initialParams.get("date") || timer.state.taskDate || getToday()
  );
  const [customMinutes, setCustomMinutes] = useState(
    String(timer.state.settings.focusMinutes)
  );
  const { error, isLoading, loadTasks, tasks } = useDayMarkTasks({
    date: taskDate,
    userId,
  });
  const queryHandledRef = useRef(false);
  const autoCompletingRef = useRef(false);
  const [isFocusViewOpen, setIsFocusViewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const selectedTask = tasks.find((task) => task.id === timer.state.taskId);
  const plannedFocusSeconds = getTaskPlannedSeconds(selectedTask);
  const progressPercent =
    timer.state.durationSeconds > 0
      ? Math.round(
          ((timer.state.durationSeconds - timer.remainingSeconds) /
            timer.state.durationSeconds) *
            100
        )
      : 0;
  const actualFocusSeconds =
    (selectedTask?.actual_focus_seconds ?? 0) +
    (selectedTask &&
    timer.state.taskId === selectedTask.id &&
    timer.state.mode === "focus"
      ? timer.elapsedSeconds
      : 0);
  const savedActualFocusSeconds = selectedTask?.actual_focus_seconds ?? 0;
  const remainingPlannedSeconds = selectedTask
    ? Math.max(plannedFocusSeconds - savedActualFocusSeconds, 0)
    : 0;
  const currentPlannedRemainingSeconds = selectedTask
    ? Math.max(plannedFocusSeconds - actualFocusSeconds, 0)
    : 0;
  const plannedSessionCount = selectedTask
    ? getTotalTaskSessions(
        getCompletedTaskSessions(
          savedActualFocusSeconds,
          timer.state.settings.focusMinutes
        ),
        remainingPlannedSeconds,
        timer.state.settings.focusMinutes
      )
    : 0;
  let completedTaskSessions = timer.state.completedFocusSessions;

  if (selectedTask) {
    completedTaskSessions =
      remainingPlannedSeconds > 0
        ? getCompletedTaskSessions(
            savedActualFocusSeconds,
            timer.state.settings.focusMinutes
          )
        : 0;
  }
  const totalSessionCount = selectedTask
    ? plannedSessionCount
    : Math.max(timer.state.settings.longBreakInterval, 1);
  const sessionLabel =
    selectedTask && remainingPlannedSeconds <= 0
      ? "Đã hoàn thành"
      : `${completedTaskSessions}/${totalSessionCount} phiên`;

  useEffect(() => {
    if (queryHandledRef.current || tasks.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("taskId");

    if (!taskId) {
      queryHandledRef.current = true;
      return;
    }

    const targetTask = tasks.find((task) => task.id === taskId);

    if (!targetTask) return;

    timer.selectTask(targetTask.id, targetTask.task_date);
    queryHandledRef.current = true;
  }, [tasks, timer]);

  useEffect(() => {
    if (!selectedTask || timer.state.mode !== "focus" || timer.state.status !== "idle") {
      return;
    }

    const nextFocusMinutes = getAutoAlignedFocusMinutes(
      remainingPlannedSeconds,
      timer.state.settings.focusMinutes
    );

    timer.alignCurrentFocusDuration(nextFocusMinutes);
  }, [remainingPlannedSeconds, selectedTask, timer]);

  useEffect(() => {
    if (
      timer.state.status !== "running" ||
      timer.remainingSeconds > 0 ||
      autoCompletingRef.current
    ) {
      return;
    }

    autoCompletingRef.current = true;
    void finishCurrentMode(true).finally(() => {
      window.setTimeout(() => {
        autoCompletingRef.current = false;
      }, 250);
    });
  });

  async function finishCurrentMode(completed: boolean) {
    const startedAt =
      timer.state.sessionStartedAt ??
      new Date(Date.now() - timer.elapsedSeconds * 1000).toISOString();
    const endedAt = new Date().toISOString();
    const durationSeconds =
      timer.state.status === "running"
        ? timer.elapsedSeconds
        : Math.max(timer.state.durationSeconds - timer.state.remainingSeconds, 0);

    if (userId && durationSeconds > 0) {
      await recordPomodoroSession({
        completed,
        durationSeconds,
        endedAt,
        mode: timer.state.mode,
        startedAt,
        taskDate: timer.state.taskDate,
        taskId: timer.state.taskId,
        userId,
      });

      if (
        timer.state.mode === "focus" &&
        timer.state.taskId &&
        selectedTask
      ) {
        const nextActualSeconds = savedActualFocusSeconds + durationSeconds;
        const nextStatus = getTaskCompletionStatus(
          nextActualSeconds,
          plannedFocusSeconds
        );

        await updateDayMarkTask(timer.state.taskId, { status: nextStatus });
      }

      await loadTasks();
    }

    if (timer.state.mode === "focus") {
      timer.completeFocusSession();
      return;
    }

    timer.completeBreakSession();
  }

  function handleSelectTask(taskId: string) {
    if (isPomodoroActive(timer.state.status)) {
      const confirmed = confirm(
        "Đang có Pomodoro chưa kết thúc. Bạn muốn dừng phiên hiện tại và đổi nhiệm vụ không?"
      );

      if (!confirmed) return;
    }

    if (!taskId) {
      timer.selectFreeSession(taskDate);
      return;
    }

    const task = tasks.find((item) => item.id === taskId);

    if (!task) return;

    timer.selectTask(task.id, task.task_date);
  }

  function handleChangeTaskDate(nextDate: string) {
    if (isPomodoroActive(timer.state.status)) {
      const confirmed = confirm(
        "Đang có Pomodoro chưa kết thúc. Bạn muốn dừng phiên hiện tại và đổi ngày không?"
      );

      if (!confirmed) return;
    }

    setTaskDate(nextDate);
    timer.selectFreeSession(nextDate);
  }

  function handleApplyCustomMinutes() {
    const minutes = clampPomodoroMinutes(Number(customMinutes));

    timer.updateFocusMinutes(minutes);
    setCustomMinutes(String(minutes));
  }

  async function handleStartTimer() {
    if (userId && timer.state.mode === "focus" && timer.state.taskId) {
      try {
        await updateDayMarkTask(timer.state.taskId, { status: "in_progress" });
        await loadTasks();
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "Không thể cập nhật trạng thái đang làm."
        );
        return;
      }
    }

    timer.startTimer();
  }

  return (
    <section className={`grid gap-4 daymark-pomodoro-page daymark-pomodoro-${timer.state.mode}`}>
      <PageHeader
        eyebrow="Pomodoro"
        title="Tập trung"
        subtitle="Chọn nhiệm vụ, bấm bắt đầu và để DayMark ghi lại thời gian thực tế."
        actions={
          <>
          <button
            type="button"
            onClick={() => onNavigate("/daymark/today")}
            className="daymark-secondary-action"
          >
            Quay lại Hôm nay
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen((value) => !value)}
            className="daymark-secondary-action"
            aria-expanded={settingsOpen}
          >
            <Settings2 aria-hidden="true" size={18} />
            Cài đặt
          </button>
          </>
        }
      />

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div
        className={`grid min-w-0 gap-4 ${
          settingsOpen
            ? "xl:grid-cols-[minmax(0,1.45fr)_minmax(0,380px)]"
            : "xl:grid-cols-1"
        }`}
      >
        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <TaskFocusPanel
            actualFocusSeconds={actualFocusSeconds}
            isLoading={isLoading}
            onSelectTask={handleSelectTask}
            onTaskDateChange={handleChangeTaskDate}
            plannedFocusSeconds={plannedFocusSeconds}
            plannedSessionCount={plannedSessionCount}
            remainingPlannedSeconds={currentPlannedRemainingSeconds}
            selectedTask={selectedTask}
            taskDate={taskDate}
            tasks={tasks}
          />

          <div className="mt-6 flex justify-center">
            <PomodoroClock
              progressPercent={progressPercent}
              remainingSeconds={timer.remainingSeconds}
              modeLabel={getPomodoroModeLabel(timer.state.mode)}
              sessionLabel={sessionLabel}
            />
          </div>

          <TimerControls
            mode={timer.state.mode}
            onEnd={() => finishCurrentMode(false)}
            onFocusView={() => setIsFocusViewOpen(true)}
            onPause={timer.pauseTimer}
            onReset={timer.resetTimer}
            onResume={timer.resumeTimer}
            onSkipBreak={() => finishCurrentMode(false)}
            onStart={handleStartTimer}
            status={timer.state.status}
          />
        </section>

        {settingsOpen && (
        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <h2 className="text-xl font-black">Cài đặt nhanh</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Áp dụng cho phiên tập trung tiếp theo. Thời lượng hợp lệ từ 1 đến 180 phút.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {focusPresetMinutes.map((minutes) => (
              <button
                key={minutes}
                type="button"
                disabled={timer.state.status === "running"}
                onClick={() => {
                  timer.updateFocusMinutes(minutes);
                  setCustomMinutes(String(minutes));
                }}
                className={`rounded-2xl border px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  timer.state.settings.focusMinutes === minutes
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                }`}
              >
                {minutes} phút
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-bold">
              <span>Thời lượng tùy chỉnh</span>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={customMinutes}
                  disabled={timer.state.status === "running"}
                  onChange={(event) => setCustomMinutes(event.target.value)}
                  className="app-input rounded-2xl border px-3 py-2"
                />
                <button
                  type="button"
                  disabled={timer.state.status === "running"}
                  onClick={handleApplyCustomMinutes}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Áp dụng
                </button>
              </div>
            </label>

            <SettingNumberInput
              label="Nghỉ ngắn"
              value={timer.state.settings.shortBreakMinutes}
              onChange={(value) => timer.updateSetting("shortBreakMinutes", value)}
            />
            <SettingNumberInput
              label="Nghỉ dài"
              value={timer.state.settings.longBreakMinutes}
              onChange={(value) => timer.updateSetting("longBreakMinutes", value)}
            />
            <SettingNumberInput
              label="Nghỉ dài sau mỗi"
              suffix="phiên"
              value={timer.state.settings.longBreakInterval}
              onChange={(value) => timer.updateSetting("longBreakInterval", value)}
            />

            <SettingCheckbox
              checked={timer.state.settings.autoStartBreak}
              label="Tự động bắt đầu giờ nghỉ"
              onChange={(checked) =>
                timer.updateSetting("autoStartBreak", checked)
              }
            />
            <SettingCheckbox
              checked={timer.state.settings.autoStartFocus}
              label="Tự động bắt đầu phiên tập trung tiếp theo"
              onChange={(checked) =>
                timer.updateSetting("autoStartFocus", checked)
              }
            />
          </div>
        </section>
        )}
      </div>

      {isFocusViewOpen && (
        <FocusFullscreen
          modeLabel={getPomodoroModeLabel(timer.state.mode)}
          onClose={() => setIsFocusViewOpen(false)}
          onEnd={() => finishCurrentMode(false)}
          onPause={timer.pauseTimer}
          onReset={timer.resetTimer}
          onResume={timer.resumeTimer}
          onSkipBreak={() => finishCurrentMode(false)}
          onStart={handleStartTimer}
          progressPercent={progressPercent}
          remainingSeconds={timer.remainingSeconds}
          selectedTask={selectedTask}
          sessionLabel={sessionLabel}
          status={timer.state.status}
          timerMode={timer.state.mode}
        />
      )}
    </section>
  );
}

function TaskFocusPanel({
  actualFocusSeconds,
  isLoading,
  onSelectTask,
  onTaskDateChange,
  plannedFocusSeconds,
  plannedSessionCount,
  remainingPlannedSeconds,
  selectedTask,
  taskDate,
  tasks,
}: {
  actualFocusSeconds: number;
  isLoading: boolean;
  onSelectTask: (taskId: string) => void;
  onTaskDateChange: (date: string) => void;
  plannedFocusSeconds: number;
  plannedSessionCount: number;
  remainingPlannedSeconds: number;
  selectedTask?: DayMarkTask;
  taskDate: string;
  tasks: DayMarkTask[];
}) {
  return (
    <div className="grid min-w-0 gap-4">
      <div className="min-w-0 rounded-3xl bg-slate-50 p-4 dark:bg-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Nhiệm vụ tập trung
        </p>
        <h2 className="mt-1 min-w-0 break-words text-2xl font-black">
          {selectedTask?.title ?? "Phiên tập trung tự do"}
        </h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Category:{" "}
            <strong>
              {selectedTask
                ? taskCategoryLabels[selectedTask.category]
                : "Không gắn nhiệm vụ"}
            </strong>
          </p>
          <p>
            Kế hoạch:{" "}
            <strong>
              {selectedTask
                ? `${selectedTask.start_time.slice(0, 5)} - ${selectedTask.end_time.slice(0, 5)}`
                : "Tự do"}
            </strong>
          </p>
          <p>
            Thực tế đã làm:{" "}
            <strong>{formatDuration(Math.round(actualFocusSeconds / 60))}</strong>
          </p>
          {selectedTask && (
            <>
              <p>
                Tổng thời gian kế hoạch:{" "}
                <strong>
                  {formatDuration(Math.round(plannedFocusSeconds / 60))}
                </strong>
              </p>
              <p>
                Còn cần tập trung:{" "}
                <strong>
                  {formatDuration(Math.round(remainingPlannedSeconds / 60))}
                </strong>
              </p>
              <p>
                Tự chia phiên:{" "}
                <strong>
                  {plannedSessionCount > 0
                    ? `${plannedSessionCount} phiên theo thời lượng hiện tại`
                    : "Đã đủ thời gian kế hoạch"}
                </strong>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <label className="grid min-w-0 gap-1 text-sm font-bold">
          <span>Ngày</span>
          <input
            type="date"
            value={taskDate}
            onChange={(event) => onTaskDateChange(event.target.value)}
            className="app-input box-border w-full min-w-0 max-w-full rounded-2xl border px-3 py-2"
          />
        </label>

        <label className="grid min-w-0 gap-1 overflow-hidden text-sm font-bold">
          <span>Đổi nhiệm vụ</span>
          <select
            value={selectedTask?.id ?? ""}
            onChange={(event) => onSelectTask(event.target.value)}
            className="app-input box-border w-full min-w-0 max-w-full truncate rounded-2xl border px-3 py-2"
          >
            <option value="">Phiên tập trung tự do</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.start_time.slice(0, 5)} · {task.title}
              </option>
            ))}
          </select>
        </label>

        {isLoading && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Đang tải nhiệm vụ...
          </p>
        )}
      </div>
    </div>
  );
}

function PomodoroClock({
  modeLabel,
  progressPercent,
  remainingSeconds,
  sessionLabel,
}: {
  modeLabel: string;
  progressPercent: number;
  remainingSeconds: number;
  sessionLabel: string;
}) {
  return (
    <div className="grid justify-items-center gap-4">
      <div
        className="grid h-72 w-72 place-items-center rounded-full p-4 shadow-inner sm:h-80 sm:w-80"
        style={{
          background: `conic-gradient(var(--primary) ${progressPercent}%, var(--primary-soft) ${progressPercent}% 100%)`,
        }}
      >
        <div className="grid h-full w-full place-items-center rounded-full bg-white text-center dark:bg-slate-900">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
              {modeLabel}
            </p>
            <p className="mt-3 text-6xl font-black tabular-nums">
              {formatPomodoroClock(remainingSeconds)}
            </p>
            <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
              {sessionLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimerControls({
  focusViewLabel = "Phóng to",
  mode,
  onEnd,
  onFocusView,
  onPause,
  onReset,
  onResume,
  onSkipBreak,
  onStart,
  status,
}: {
  focusViewLabel?: string;
  mode: string;
  onEnd: () => void;
  onFocusView: () => void;
  onPause: () => void;
  onReset: () => void;
  onResume: () => void;
  onSkipBreak: () => void;
  onStart: () => void;
  status: string;
}) {
  return (
    <div className="mt-6 flex flex-wrap justify-center gap-2">
      {status === "idle" && (
        <button
          type="button"
          onClick={onStart}
          className="rounded-2xl bg-emerald-700 px-6 py-3 font-black text-white transition hover:bg-emerald-800"
        >
          Bắt đầu
        </button>
      )}

      <button
        type="button"
        onClick={onFocusView}
        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-3 font-black text-emerald-800 transition hover:bg-emerald-100"
      >
        {focusViewLabel}
      </button>

      {status === "running" && (
        <button
          type="button"
          onClick={onPause}
          className="rounded-2xl bg-slate-900 px-6 py-3 font-black text-white transition hover:bg-slate-700"
        >
          Tạm dừng
        </button>
      )}

      {status === "paused" && (
        <button
          type="button"
          onClick={onResume}
          className="rounded-2xl bg-emerald-700 px-6 py-3 font-black text-white transition hover:bg-emerald-800"
        >
          Tiếp tục
        </button>
      )}

      {(status === "running" || status === "paused") && (
        <button
          type="button"
          onClick={onEnd}
          className="rounded-2xl border border-slate-200 px-6 py-3 font-black transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Kết thúc phiên
        </button>
      )}

      {mode !== "focus" && (
        <button
          type="button"
          onClick={onSkipBreak}
          className="rounded-2xl border border-blue-200 bg-blue-50 px-6 py-3 font-black text-blue-700 transition hover:bg-blue-100"
        >
          Bỏ qua phiên nghỉ
        </button>
      )}

      <button
        type="button"
        onClick={onReset}
        className="rounded-2xl border border-red-200 bg-red-50 px-6 py-3 font-black text-red-700 transition hover:bg-red-100"
      >
        Đặt lại
      </button>
    </div>
  );
}

function FocusFullscreen({
  modeLabel,
  onClose,
  onEnd,
  onPause,
  onReset,
  onResume,
  onSkipBreak,
  onStart,
  progressPercent,
  remainingSeconds,
  selectedTask,
  sessionLabel,
  status,
  timerMode,
}: {
  modeLabel: string;
  onClose: () => void;
  onEnd: () => void;
  onPause: () => void;
  onReset: () => void;
  onResume: () => void;
  onSkipBreak: () => void;
  onStart: () => void;
  progressPercent: number;
  remainingSeconds: number;
  selectedTask?: DayMarkTask;
  sessionLabel: string;
  status: string;
  timerMode: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-white p-4 text-slate-950"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <div className="grid w-full max-w-4xl justify-items-center gap-6 text-center">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="min-w-0 text-left">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">
              Đang tập trung
            </p>
            <h2 className="mt-1 truncate text-xl font-black sm:text-2xl">
              {selectedTask?.title ?? "Phiên tập trung tự do"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black transition hover:bg-slate-50"
          >
            Thu nhỏ
          </button>
        </div>

        <div
          className="grid h-[min(78vw,520px)] w-[min(78vw,520px)] place-items-center rounded-full p-4 shadow-2xl"
          style={{
            background: `conic-gradient(var(--primary) ${progressPercent}%, var(--primary-soft) ${progressPercent}% 100%)`,
          }}
        >
          <div className="grid h-full w-full place-items-center rounded-full bg-white text-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-700">
                {modeLabel}
              </p>
              <p className="mt-5 text-[clamp(4rem,16vw,10rem)] font-black leading-none tabular-nums">
                {formatPomodoroClock(remainingSeconds)}
              </p>
              <p className="mt-5 text-sm font-bold text-slate-500">
                {sessionLabel}
              </p>
            </div>
          </div>
        </div>

        <TimerControls
          focusViewLabel="Thu nhỏ"
          mode={timerMode}
          onEnd={onEnd}
          onFocusView={onClose}
          onPause={onPause}
          onReset={onReset}
          onResume={onResume}
          onSkipBreak={onSkipBreak}
          onStart={onStart}
          status={status}
        />
      </div>
    </div>
  );
}

function SettingNumberInput({
  label,
  onChange,
  suffix = "phút",
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  suffix?: string;
  value: number;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      <span>
        {label} ({suffix})
      </span>
      <input
        type="number"
        min={1}
        max={180}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="app-input rounded-2xl border px-3 py-2"
      />
    </label>
  );
}

function SettingCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold dark:bg-slate-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5"
      />
      <span>{label}</span>
    </label>
  );
}
