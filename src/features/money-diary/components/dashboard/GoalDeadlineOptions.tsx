import { CalendarRange, Goal } from "lucide-react";
import { useMemo } from "react";
import type { Goals } from "../../../../types";
import { buildDailyGoalOptions } from "../../utils/dashboardSelectors";
import { GoalDeadlineOption } from "./GoalDeadlineOption";

type GoalDeadlineOptionsProps = {
  goals: Goals;
  onOpenGoals: () => void;
  selectedDate: string;
};

export function GoalDeadlineOptions({
  goals,
  onOpenGoals,
  selectedDate,
}: GoalDeadlineOptionsProps) {
  const options = useMemo(
    () => buildDailyGoalOptions(goals, selectedDate),
    [goals, selectedDate]
  );

  return (
    <div className="money-goal-deadlines" aria-labelledby="goal-deadlines-title">
      <div className="money-goal-deadlines-heading">
        <CalendarRange aria-hidden="true" size={16} />
        <h3 id="goal-deadlines-title">Thời hạn đang theo dõi</h3>
      </div>

      {options.length === 0 ? (
        <div className="money-goal-deadlines-empty">
          <Goal aria-hidden="true" size={19} />
          <span>Chưa có thời hạn mục tiêu cho ngày đang xem.</span>
          <button type="button" className="money-text-action" onClick={onOpenGoals}>
            Thiết lập mục tiêu
          </button>
        </div>
      ) : (
        <div
          className="money-goal-deadline-options"
          role="list"
          aria-label="Các thời hạn mục tiêu đang theo dõi"
        >
          {options.map((option) => (
            <GoalDeadlineOption key={option.id} option={option} />
          ))}
        </div>
      )}
    </div>
  );
}
