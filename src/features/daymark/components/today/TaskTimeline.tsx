import { Clock, Play } from "lucide-react";
import type { DayMarkTask, TaskStatus } from "../../types/daymark";
import {
  formatDuration,
  taskPriorityLabels,
  taskStatusLabels,
} from "../../utils/daymarkUtils";
import { EmptyState } from "../ui/EmptyState";
import { CategoryBadge } from "./CategoryBadge";
import { TaskActionMenu } from "./TaskActionMenu";
import { TaskStatusButton } from "./TaskStatusButton";

type TaskTimelineProps = {
  focusingTaskId?: string | null;
  onDelete: (task: DayMarkTask) => void;
  onEdit: (task: DayMarkTask) => void;
  onFocus: (task: DayMarkTask) => void;
  onMoveTomorrow: (task: DayMarkTask) => void;
  onStatusChange: (task: DayMarkTask, status: TaskStatus) => void;
  onAddTask: () => void;
  tasks: DayMarkTask[];
};

export function TaskTimeline({
  focusingTaskId,
  onAddTask,
  onDelete,
  onEdit,
  onFocus,
  onMoveTomorrow,
  onStatusChange,
  tasks,
}: TaskTimelineProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Chưa có lịch cho ngày này"
        message="Thêm một vài việc theo khung giờ để DayMark nhắc bạn tập trung đúng lúc."
        action={
          <button type="button" onClick={onAddTask} className="daymark-primary-action mt-4">
            Thêm lịch
          </button>
        }
      />
    );
  }

  return (
    <div className="daymark-timeline" aria-label="Nhiệm vụ theo timeline">
      {tasks.map((task) => (
        <TaskTimelineItem
          key={task.id}
          isFocusing={focusingTaskId === task.id}
          onDelete={() => onDelete(task)}
          onEdit={() => onEdit(task)}
          onFocus={() => onFocus(task)}
          onMoveTomorrow={() => onMoveTomorrow(task)}
          onStatusChange={(status) => onStatusChange(task, status)}
          task={task}
        />
      ))}
    </div>
  );
}

function TaskTimelineItem({
  isFocusing,
  onDelete,
  onEdit,
  onFocus,
  onMoveTomorrow,
  onStatusChange,
  task,
}: {
  isFocusing: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onFocus: () => void;
  onMoveTomorrow: () => void;
  onStatusChange: (status: TaskStatus) => void;
  task: DayMarkTask;
}) {
  const isCompleted = task.status === "completed";

  return (
    <article className={`daymark-timeline-item ${isCompleted ? "is-completed" : ""}`}>
      <time className="daymark-timeline-time">{task.start_time.slice(0, 5)}</time>
      <div className="daymark-timeline-line">
        <TaskStatusButton status={task.status} onChange={onStatusChange} />
      </div>

      <div className="daymark-task-surface">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-base font-bold">
              {task.title}
            </h3>
            {task.priority === "high" && (
              <span className="daymark-priority-high">Ưu tiên cao</span>
            )}
          </div>

          <p className="mt-1 text-sm text-[var(--dm-muted)]">
            {task.start_time.slice(0, 5)} - {task.end_time.slice(0, 5)} ·{" "}
            {formatDuration(task.duration_minutes)} · {taskStatusLabels[task.status]}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CategoryBadge category={task.category} />
            <span className="text-xs font-bold text-[var(--dm-muted)]">
              {taskPriorityLabels[task.priority]}
            </span>
          </div>

          {task.note && (
            <p className="mt-3 rounded-2xl bg-[var(--dm-soft)] p-3 text-sm text-[var(--dm-muted)]">
              {task.note}
            </p>
          )}
        </div>

        <div className="daymark-task-actions">
          <button
            type="button"
            onClick={onFocus}
            aria-label={isFocusing ? "Đang tập trung" : "Tập trung nhiệm vụ"}
            className={`daymark-focus-button ${isFocusing ? "is-active" : ""}`}
          >
            <Play aria-hidden="true" size={16} />
            <span>{isFocusing ? "Đang tập trung" : "Tập trung"}</span>
          </button>

          <TaskActionMenu
            onDelete={onDelete}
            onEdit={onEdit}
            onMoveTomorrow={onMoveTomorrow}
          />
        </div>
      </div>
    </article>
  );
}
