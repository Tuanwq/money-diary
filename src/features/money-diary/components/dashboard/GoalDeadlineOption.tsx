import { Target } from "lucide-react";
import type { DailyGoalOption } from "../../utils/dashboardSelectors";

type GoalDeadlineOptionProps = {
  option: DailyGoalOption;
};

export function GoalDeadlineOption({ option }: GoalDeadlineOptionProps) {
  const isMainGoal = option.kind === "main";
  const statusLabel = option.status === "behind" ? "Trễ tiến độ" : "Đúng tiến độ";

  return (
    <article
      className={`money-goal-deadline-option ${
        isMainGoal
          ? "is-main"
          : `is-sub ${option.status === "behind" ? "is-behind" : "is-on-track"}`
      }`}
      role="listitem"
      title={option.name}
      aria-label={`${isMainGoal ? "Mục tiêu chính" : "Mục tiêu phụ"}: ${option.name}, ${option.daysLeft} ngày${isMainGoal ? "" : `, ${statusLabel}`}`}
    >
      <span className="money-goal-deadline-option-heading">
        <span>{isMainGoal ? "Mục tiêu chính" : "Phụ"}</span>
      </span>

      <span className="money-goal-deadline-option-value">
        <Target aria-hidden="true" size={isMainGoal ? 17 : 15} />
        <strong>{option.daysLeft}</strong>
        <span>ngày</span>
      </span>

    </article>
  );
}
