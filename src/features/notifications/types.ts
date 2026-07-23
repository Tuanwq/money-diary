export type AppIdentifier = "daymark" | "money_diary";

export type MoneyDiaryNotificationType =
  | "daily_entry_reminder"
  | "income_target_reminder"
  | "expense_entry_reminder"
  | "goal_progress_warning"
  | "goal_deadline_warning"
  | "goal_completed"
  | "daily_financial_summary"
  | "weekly_financial_summary"
  | "monthly_financial_summary"
  | "balance_difference_warning"
  | "sync_failed"
  | "backup_reminder";

export type DayMarkNotificationType =
  | "daily_plan_reminder"
  | "task_start_reminder"
  | "pomodoro_completed";

export type AppNotificationType =
  | MoneyDiaryNotificationType
  | DayMarkNotificationType;

export type MoneyDiaryNotificationData = {
  app: "money_diary";
  type: MoneyDiaryNotificationType;
  targetUrl: string;
  date?: string;
  goalId?: string;
  entryId?: string;
};

export type DayMarkNotificationData = {
  app: "daymark";
  type: DayMarkNotificationType;
  targetUrl: string;
  date?: string;
  taskId?: string;
};

export type AppNotificationPayload = {
  app: AppIdentifier;
  title: string;
  body: string;
  icon: string;
  badge: string;
  tag: string;
  data: MoneyDiaryNotificationData | DayMarkNotificationData;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
};

export type NotificationJobDraft = {
  appIdentifier: AppIdentifier;
  dedupeKey: string;
  notificationType: AppNotificationType;
  payload: AppNotificationPayload;
  scheduledFor: string;
};

export type MoneyDiaryNotificationSettings = {
  dailyEntryEnabled: boolean;
  dailyEntryTime: string;
  expenseReminderEnabled: boolean;
  expenseReminderTime: string;
  dailyIncomeTargetEnabled: boolean;
  dailyIncomeCheckTime: string;
  goalProgressWarningEnabled: boolean;
  goalDeadlineWarningEnabled: boolean;
  goalDeadlineDays: number[];
  dailySummaryEnabled: boolean;
  dailySummaryTime: string;
  weeklySummaryEnabled: boolean;
  weeklySummaryDay: number;
  weeklySummaryTime: string;
  monthlySummaryEnabled: boolean;
  monthlySummaryTime: string;
  balanceWarningEnabled: boolean;
  balanceWarningThreshold: number;
  syncWarningEnabled: boolean;
  backupReminderEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  timezone: string;
};

export type DayMarkNotificationSettings = {
  dailyPlanEnabled: boolean;
  dailyPlanTime: string;
  taskReminderEnabled: boolean;
  taskReminderMinutes: number;
  pomodoroCompletedEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  timezone: string;
};

export type NotificationPermissionState =
  | NotificationPermission
  | "unsupported";

