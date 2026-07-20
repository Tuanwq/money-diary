import { addDaysToDateString } from "../../../utils/date";
import type {
  DayMarkMetrics,
  DayMarkTask,
  DayMarkTaskDraft,
  DayMarkTaskForm,
  ParsedScheduleLine,
  TaskCategory,
  TaskStatus,
} from "../types/daymark";

export const taskCategoryLabels: Record<TaskCategory, string> = {
  work: "Làm việc",
  english: "Tiếng Anh",
  project: "Dự án",
  exercise: "Tập luyện",
  sleep: "Ngủ",
  personal: "Cá nhân",
  other: "Khác",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  pending: "Chưa làm",
  in_progress: "Đang làm",
  completed: "Hoàn thành",
  partial: "Một phần",
  skipped: "Bỏ qua",
};

export const taskPriorityLabels = {
  low: "Thấp",
  medium: "Vừa",
  high: "Cao",
} as const;

export const dayMarkCategories = Object.keys(
  taskCategoryLabels
) as TaskCategory[];

export const dayMarkStatuses = Object.keys(taskStatusLabels) as TaskStatus[];

export const dayMarkPriorities = Object.keys(taskPriorityLabels) as Array<
  keyof typeof taskPriorityLabels
>;

export function createEmptyTaskForm(date: string): DayMarkTaskForm {
  return {
    task_date: date,
    title: "",
    description: "",
    category: "other",
    start_time: "09:00",
    end_time: "10:00",
    priority: "medium",
    status: "pending",
    note: "",
  };
}

export function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function getTaskDurationMinutes(startTime: string, endTime: string) {
  if (!isValidTime(startTime) || !isValidTime(endTime)) return 0;

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;

  if (end <= start) {
    end += 24 * 60;
  }

  return end - start;
}

export function validateTaskForm(form: DayMarkTaskForm) {
  if (!form.title.trim()) return "Tên nhiệm vụ không được để trống.";
  if (!isValidTime(form.start_time)) return "Giờ bắt đầu phải có dạng HH:mm.";
  if (!isValidTime(form.end_time)) return "Giờ kết thúc phải có dạng HH:mm.";
  if (getTaskDurationMinutes(form.start_time, form.end_time) <= 0) {
    return "Thời lượng nhiệm vụ phải lớn hơn 0 phút.";
  }

  return "";
}

export function normalizeTaskInput(form: DayMarkTaskForm): DayMarkTaskForm {
  return {
    ...form,
    description: form.description.trim(),
    note: form.note.trim(),
    title: form.title.trim(),
  };
}

export function getStatusScore(status: TaskStatus) {
  if (status === "completed") return 1;
  if (status === "partial") return 0.5;
  return 0;
}

export function buildDayMarkMetrics(tasks: DayMarkTask[]): DayMarkMetrics {
  const totalScore = tasks.reduce(
    (sum, task) => sum + getStatusScore(task.status),
    0
  );
  const categoryMinutes = dayMarkCategories.reduce(
    (result, category) => ({
      ...result,
      [category]: 0,
    }),
    {} as Record<TaskCategory, number>
  );

  tasks.forEach((task) => {
    categoryMinutes[task.category] += task.duration_minutes;
  });

  return {
    categoryMinutes,
    completedCount: tasks.filter((task) => task.status === "completed").length,
    completionRate:
      tasks.length > 0 ? Math.round((totalScore / tasks.length) * 100) : 0,
    totalMinutes: tasks.reduce((sum, task) => sum + task.duration_minutes, 0),
    totalTasks: tasks.length,
  };
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours <= 0) return `${rest} phút`;
  if (rest === 0) return `${hours} giờ`;

  return `${hours} giờ ${rest} phút`;
}

export function inferTaskCategory(title: string): TaskCategory {
  const normalized = title.toLocaleLowerCase("vi");

  if (normalized.includes("làm việc") || normalized.includes("work")) {
    return "work";
  }

  if (
    normalized.includes("toeic") ||
    normalized.includes("tiếng anh") ||
    normalized.includes("english")
  ) {
    return "english";
  }

  if (
    normalized.includes("dự án") ||
    normalized.includes("project") ||
    normalized.includes("code")
  ) {
    return "project";
  }

  if (
    normalized.includes("tập") ||
    normalized.includes("thể dục") ||
    normalized.includes("exercise")
  ) {
    return "exercise";
  }

  if (normalized.includes("ngủ") || normalized.includes("sleep")) {
    return "sleep";
  }

  return "other";
}

export function parseScheduleText(
  text: string,
  taskDate: string
): ParsedScheduleLine[] {
  return text
    .split(/\r?\n/)
    .map((line, index) => ({
      lineNumber: index + 1,
      sourceLine: line,
    }))
    .filter((line) => line.sourceLine.trim().length > 0)
    .map(({ lineNumber, sourceLine }) => {
      const match = sourceLine
        .trim()
        .match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\s*\|\s*(.+)$/);

      if (!match) {
        return {
          error: "Không đúng mẫu HH:mm-HH:mm | Tên nhiệm vụ.",
          lineNumber,
          sourceLine,
        };
      }

      const [, startTime, endTime, title] = match;

      if (!isValidTime(startTime) || !isValidTime(endTime)) {
        return {
          error: "Giờ phải nằm trong khoảng 00:00 đến 23:59.",
          lineNumber,
          sourceLine,
        };
      }

      if (!title.trim()) {
        return {
          error: "Tên nhiệm vụ không được để trống.",
          lineNumber,
          sourceLine,
        };
      }

      const draft: DayMarkTaskDraft = {
        id: crypto.randomUUID(),
        lineNumber,
        sourceLine,
        removed: false,
        task_date: taskDate,
        title: title.trim(),
        description: "",
        category: inferTaskCategory(title),
        start_time: startTime,
        end_time: endTime,
        priority: "medium",
        status: "pending",
        note: "",
      };

      return {
        draft,
        lineNumber,
        sourceLine,
      };
    });
}

export function sortTasksByTime<T extends { start_time: string; created_at?: string }>(
  tasks: T[]
) {
  return [...tasks].sort((a, b) => {
    const timeCompare = a.start_time.localeCompare(b.start_time);
    if (timeCompare !== 0) return timeCompare;

    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });
}

export function getTomorrow(date: string) {
  return addDaysToDateString(date, 1);
}
