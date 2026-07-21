import { CheckCircle2, Play } from "lucide-react";
import type { DayMarkTask } from "../../types/daymark";
import { formatDuration, taskStatusLabels } from "../../utils/daymarkUtils";
import { CategoryBadge } from "./CategoryBadge";

type NextTaskCardProps = {
  onFocus: (task: DayMarkTask) => void;
  task: DayMarkTask | null;
};

export function NextTaskCard({ onFocus, task }: NextTaskCardProps) {
  if (!task) {
    return (
      <section className="daymark-next-task daymark-next-task-complete">
        <CheckCircle2 aria-hidden="true" size={24} />
        <div>
          <p className="daymark-muted-label">Việc tiếp theo</p>
          <h2 className="mt-1 text-xl font-black">Hôm nay đã gọn rồi</h2>
          <p className="mt-1 text-sm text-[var(--dm-muted)]">
            Không còn nhiệm vụ đang chờ. Bạn có thể nghỉ hoặc thêm lịch mới.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="daymark-next-task">
      <div className="min-w-0">
        <p className="daymark-muted-label">Việc tiếp theo</p>
        <h2 className="mt-1 break-words text-xl font-black">{task.title}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--dm-muted)]">
          <span>
            {task.start_time.slice(0, 5)} - {task.end_time.slice(0, 5)}
          </span>
          <span aria-hidden="true">·</span>
          <span>{formatDuration(task.duration_minutes)}</span>
          <span aria-hidden="true">·</span>
          <span>{taskStatusLabels[task.status]}</span>
        </div>
        <div className="mt-3">
          <CategoryBadge category={task.category} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onFocus(task)}
        className="daymark-primary-action"
      >
        <Play aria-hidden="true" size={18} />
        <span>Bắt đầu tập trung</span>
      </button>
    </section>
  );
}
