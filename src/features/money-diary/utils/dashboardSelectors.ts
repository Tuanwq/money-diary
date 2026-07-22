import type { Goals } from "../../../types";
import { getDaysLeftFromDate } from "../../../utils/date";
import {
  getGoalTimeProgressAtDate,
  getProgress,
  getSubGoalSaved,
  isGoalBehind,
} from "../../../utils/goals";
import { isProgressBehind } from "../../../utils/progressStatus";

export type DailyGoalOption = {
  daysLeft: number;
  id: string;
  kind: "main" | "sub";
  name: string;
  status: "behind" | "onTrack";
};

export function buildDailyGoalOptions(
  goals: Goals,
  selectedDate: string,
  mainGoalSaved = goals.bigGoalSaved
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
      status: isProgressBehind(
        getProgress(mainGoalSaved, goals.bigGoalTarget),
        getGoalTimeProgressAtDate(mainStartDate, mainEndDate, selectedDate)
      )
          ? "behind"
          : "onTrack",
    });
  }

  for (const goal of goals.subGoals ?? []) {
    const currentSaved = getSubGoalSaved(goal);
    const isCompleted = currentSaved >= goal.target;
    const isOverdue = selectedDate > goal.deadline && !isCompleted;

    if (
      goal.target <= 0 ||
      selectedDate < goal.startDate ||
      (selectedDate > goal.deadline && isCompleted)
    ) {
      continue;
    }

    options.push({
      daysLeft: getDaysLeftFromDate(goal.deadline, selectedDate),
      id: goal.id,
      kind: "sub",
      name: goal.name,
      status: isOverdue || isGoalBehind(goal) ? "behind" : "onTrack",
    });
  }

  return options;
}
