import { Target } from "lucide-react";
import type { DailyGoalOption } from "../../utils/dashboardSelectors";

type GoalDeadlineOptionProps = {
  option: DailyGoalOption;
};

export function GoalDeadlineOption({ option }: GoalDeadlineOptionProps) {
  const isMainGoal = option.kind === "main";

  return (
    <article
      className={`money-goal-deadline-option ${isMainGoal ? "is-main" : ""}`}
      role="listitem"
      title={option.name}
    >
      <span className="money-goal-deadline-option-heading">
        <span>{isMainGoal ? "Mục tiêu chính" : "Mục tiêu phụ"}</span>
      </span>

      <span className="money-goal-deadline-option-value">
        <Target aria-hidden="true" size={17} />
        <strong>{option.daysLeft}</strong>
        <span>ngày</span>
      </span>

      <span className="money-goal-deadline-option-name">{option.name}</span>
    </article>
  );
}
