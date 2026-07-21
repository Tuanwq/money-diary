import type { DayMarkTask } from "../types/daymark";

const incompleteStatuses = new Set(["pending", "in_progress", "partial"]);

export function getNextTask(tasks: DayMarkTask[]) {
  return (
    tasks.find((task) => incompleteStatuses.has(task.status)) ??
    tasks.find((task) => task.status !== "skipped") ??
    null
  );
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";

  return "Chào buổi tối";
}
