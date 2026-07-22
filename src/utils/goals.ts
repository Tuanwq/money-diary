import type { GoalProgressSnapshot, SubGoal } from "../types";
import { getDateString, getDaysLeft, getToday, toDate } from "./date";
import { isProgressBehind } from "./progressStatus";

export function getProgress(current: number, target: number) {
  if (target <= 0) return 0;

  const progress = Math.round((current / target) * 100);

  return Math.min(Math.max(progress, 0), 100);
}

export function getSubGoalSaved(goal: SubGoal) {
  const contributed = goal.contributions.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  return goal.saved + contributed;
}

export function getDailyNeedForGoal(
  target: number,
  currentSaved: number,
  deadline: string
) {
  const remaining = Math.max(target - currentSaved, 0);
  const days = getDaysLeft(deadline);

  if (days <= 0) return remaining;

  return Math.ceil(remaining / days);
}

export function getGoalTimeProgress(startDate: string, deadline: string) {
  return getGoalTimeProgressAtDate(startDate, deadline, getToday());
}

export function getGoalTimeProgressAtDate(
  startDate: string,
  deadline: string,
  currentDate: string
) {
  const start = toDate(startDate);
  const end = toDate(deadline);
  const today = toDate(currentDate);

  const totalDays = Math.max(
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
    1
  );

  const elapsedDays = Math.min(
    Math.max(
      Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
      0
    ),
    totalDays
  );

  return Math.round((elapsedDays / totalDays) * 100);
}

export function isGoalBehind(goal: SubGoal) {
  const moneyProgress = getProgress(getSubGoalSaved(goal), goal.target);
  const timeProgress = getGoalTimeProgress(goal.startDate, goal.deadline);

  return isProgressBehind(moneyProgress, timeProgress);
}

export function buildSubGoalProgressData(
  goal: SubGoal
): GoalProgressSnapshot[] {
  const result: GoalProgressSnapshot[] = [];

  const currentDate = toDate(goal.startDate);
  const lastDate = toDate(getToday());

  let runningSaved = goal.saved;

  while (currentDate <= lastDate) {
    const dateString = getDateString(currentDate);

    const dayContributed = goal.contributions
      .filter((item) => item.date === dateString)
      .reduce((sum, item) => sum + item.amount, 0);

    runningSaved += dayContributed;

    result.push({
      date: dateString,
      saved: runningSaved,
      contributed: dayContributed,
      progress: getProgress(runningSaved, goal.target),
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}
