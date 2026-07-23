import type {
  AppIdentifier,
  DayMarkNotificationSettings,
  MoneyDiaryNotificationSettings,
} from "./types";

export const APP_NOTIFICATION_CONFIG = {
  daymark: {
    appIdentifier: "daymark",
    badge: "/icons/daymark-badge-96.png",
    icon: "/icons/daymark-192.png",
    manifest: "/daymark.webmanifest",
    name: "DayMark",
    scope: "/daymark",
    startUrl: "/daymark/today",
    serviceWorker: "/daymark-sw.js",
  },
  money_diary: {
    appIdentifier: "money_diary",
    badge: "/icons/money-diary-badge-v2-96.png",
    icon: "/icons/money-diary-v2-192.png",
    manifest: "/money-diary.webmanifest",
    name: "Money Diary",
    scope: "/money",
    startUrl: "/money",
    serviceWorker: "/money-diary-sw.js",
  },
} as const satisfies Record<
  AppIdentifier,
  {
    appIdentifier: AppIdentifier;
    badge: string;
    icon: string;
    manifest: string;
    name: string;
    scope: string;
    startUrl: string;
    serviceWorker: string;
  }
>;

export const DEFAULT_MONEY_DIARY_NOTIFICATION_SETTINGS: MoneyDiaryNotificationSettings =
  {
    dailyEntryEnabled: true,
    dailyEntryTime: "21:00",
    expenseReminderEnabled: true,
    expenseReminderTime: "20:30",
    dailyIncomeTargetEnabled: true,
    dailyIncomeCheckTime: "19:00",
    goalProgressWarningEnabled: true,
    goalDeadlineWarningEnabled: true,
    goalDeadlineDays: [30, 14, 7, 3, 1],
    dailySummaryEnabled: true,
    dailySummaryTime: "22:00",
    weeklySummaryEnabled: true,
    weeklySummaryDay: 0,
    weeklySummaryTime: "20:00",
    monthlySummaryEnabled: true,
    monthlySummaryTime: "20:30",
    balanceWarningEnabled: true,
    balanceWarningThreshold: 100_000,
    syncWarningEnabled: true,
    backupReminderEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    timezone: "Asia/Ho_Chi_Minh",
  };

export const DEFAULT_DAYMARK_NOTIFICATION_SETTINGS: DayMarkNotificationSettings =
  {
    dailyPlanEnabled: true,
    dailyPlanTime: "07:00",
    taskReminderEnabled: true,
    taskReminderMinutes: 10,
    pomodoroCompletedEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    timezone: "Asia/Ho_Chi_Minh",
  };
