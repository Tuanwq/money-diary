import type { DayMarkTask } from "../daymark/types/daymark";
import { addDaysToDateString, getDateString } from "../../utils/date";
import { APP_NOTIFICATION_CONFIG } from "./config";
import type {
  DayMarkNotificationSettings,
  NotificationJobDraft,
} from "./types";

type BuildDayMarkNotificationPlanInput = {
  now?: Date;
  settings: DayMarkNotificationSettings;
  tasks: DayMarkTask[];
  userId: string;
};

const dayMarkConfig = APP_NOTIFICATION_CONFIG.daymark;
const DAILY_PLAN_HORIZON_DAYS = 31;

function createDayMarkJob(
  job: Omit<NotificationJobDraft, "appIdentifier" | "payload"> & {
    body: string;
    data: NotificationJobDraft["payload"]["data"];
  },
  settings: DayMarkNotificationSettings
): NotificationJobDraft {
  return {
    appIdentifier: "daymark",
    dedupeKey: job.dedupeKey,
    notificationType: job.notificationType,
    scheduledFor: job.scheduledFor,
    payload: {
      app: "daymark",
      badge: dayMarkConfig.badge,
      body: job.body,
      data: job.data,
      icon: dayMarkConfig.icon,
      soundEnabled: settings.soundEnabled,
      tag: job.dedupeKey,
      title: "DayMark",
      vibrationEnabled: settings.vibrationEnabled,
    },
  };
}

export function buildDayMarkNotificationPlan({
  now = new Date(),
  settings,
  tasks,
  userId,
}: BuildDayMarkNotificationPlanInput) {
  const today = getDateString(now);
  const jobs: NotificationJobDraft[] = [];

  if (settings.dailyPlanEnabled) {
    for (let offset = 0; offset < DAILY_PLAN_HORIZON_DAYS; offset += 1) {
      const planDate = addDaysToDateString(today, offset);
      const dailyPlanTime = new Date(
        `${planDate}T${settings.dailyPlanTime}:00+07:00`
      );

      if (dailyPlanTime.getTime() <= now.getTime()) continue;

      jobs.push(
        createDayMarkJob(
          {
            body: "Mở kế hoạch hôm nay và chọn việc quan trọng nhất cần hoàn thành.",
            data: {
              app: "daymark",
              date: planDate,
              targetUrl: `/daymark/today?date=${planDate}`,
              type: "daily_plan_reminder",
            },
            dedupeKey: `daymark-daily-plan-${userId}-${planDate}`,
            notificationType: "daily_plan_reminder",
            scheduledFor: dailyPlanTime.toISOString(),
          },
          settings
        )
      );
    }
  }

  if (settings.taskReminderEnabled) {
    for (const task of tasks) {
      if (
        task.status === "completed" ||
        task.status === "skipped" ||
        task.task_date < today
      ) {
        continue;
      }

      const taskStart = new Date(
        `${task.task_date}T${task.start_time.slice(0, 5)}:00+07:00`
      );
      const scheduledFor = new Date(
        taskStart.getTime() - settings.taskReminderMinutes * 60_000
      );

      if (scheduledFor.getTime() <= now.getTime()) continue;

      jobs.push(
        createDayMarkJob(
          {
            body: `“${task.title}” bắt đầu lúc ${task.start_time.slice(0, 5)}.`,
            data: {
              app: "daymark",
              date: task.task_date,
              targetUrl: `/daymark/today?date=${task.task_date}&taskId=${task.id}`,
              taskId: task.id,
              type: "task_start_reminder",
            },
            dedupeKey: `daymark-task-start-${task.id}-${task.updated_at}`,
            notificationType: "task_start_reminder",
            scheduledFor: scheduledFor.toISOString(),
          },
          settings
        )
      );
    }
  }

  return jobs;
}
