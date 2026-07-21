import type { Goals } from "../../../types";
import { getDaysLeftFromDate } from "../../../utils/date";

export type DailyGoalOption = {
  daysLeft: number;
  id: string;
  kind: "main" | "sub";
  name: string;
};

export function buildDailyGoalOptions(
  goals: Goals,
  selectedDate: string
): DailyGoalOption[] {
  const options: DailyGoalOption[] = [];
  const mainStartDate = goals.bigGoalStartDate || selectedDate;
  const mainEndDate = goals.bigGoalDeadline || selectedDate;

  if (
    goals.bigGoalTarget > 0 &&
    selectedDate >= mainStartDate &&
    selectedDate <= mainEndDate
  ) {
    options.push({
      daysLeft: getDaysLeftFromDate(goals.bigGoalDeadline, selectedDate),
      id: "main",
      kind: "main",
      name: goals.bigGoalName || "Mục tiêu chính",
    });
  }

  for (const goal of goals.subGoals ?? []) {
    if (
      goal.target <= 0 ||
      selectedDate < goal.startDate ||
      selectedDate > goal.deadline
    ) {
      continue;
    }

    options.push({
      daysLeft: getDaysLeftFromDate(goal.deadline, selectedDate),
      id: goal.id,
      kind: "sub",
      name: goal.name,
    });
  }

  return options;
}
