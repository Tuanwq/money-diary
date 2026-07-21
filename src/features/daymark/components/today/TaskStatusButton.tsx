import { Check, Circle, CircleDot, MinusCircle, PauseCircle } from "lucide-react";
import { useState } from "react";
import type { TaskStatus } from "../../types/daymark";
import { dayMarkStatuses, taskStatusLabels } from "../../utils/daymarkUtils";

const statusIconMap = {
  completed: Check,
  in_progress: CircleDot,
  partial: PauseCircle,
  pending: Circle,
  skipped: MinusCircle,
} satisfies Record<TaskStatus, typeof Check>;

export function TaskStatusButton({
  onChange,
  status,
}: {
  onChange: (status: TaskStatus) => void;
  status: TaskStatus;
}) {
  const [open, setOpen] = useState(false);
  const Icon = statusIconMap[status];

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Trạng thái: ${taskStatusLabels[status]}`}
        onClick={() => setOpen((value) => !value)}
        className={`daymark-status-button daymark-status-${status}`}
      >
        <Icon aria-hidden="true" size={18} />
        <span className="sr-only">{taskStatusLabels[status]}</span>
      </button>

      {open && (
        <div className="daymark-popover" role="menu">
          {dayMarkStatuses.map((item) => (
            <button
              key={item}
              type="button"
              role="menuitem"
              onClick={() => {
                onChange(item);
                setOpen(false);
              }}
              className="daymark-menu-item"
            >
              {taskStatusLabels[item]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
