import { supabase } from "../../lib/supabase";
import { registerAppServiceWorker } from "../../pwa/appPwa";
import {
  APP_NOTIFICATION_CONFIG,
  DEFAULT_DAYMARK_NOTIFICATION_SETTINGS,
  DEFAULT_MONEY_DIARY_NOTIFICATION_SETTINGS,
} from "./config";
import type {
  AppIdentifier,
  DayMarkNotificationSettings,
  MoneyDiaryNotificationSettings,
  NotificationJobDraft,
  NotificationPermissionState,
} from "./types";

const MONEY_SETTINGS_STORAGE_KEY = "money_diary_notification_settings";
const DAYMARK_SETTINGS_STORAGE_KEY = "daymark_notification_settings";

type MoneySettingsRow = {
  daily_entry_enabled: boolean;
  daily_entry_time: string;
  expense_reminder_enabled: boolean;
  expense_reminder_time: string;
  daily_income_target_enabled: boolean;
  daily_income_check_time: string;
  goal_progress_warning_enabled: boolean;
  goal_deadline_warning_enabled: boolean;
  goal_deadline_days: number[];
  daily_summary_enabled: boolean;
  daily_summary_time: string;
  weekly_summary_enabled: boolean;
  weekly_summary_day: number;
  weekly_summary_time: string;
  monthly_summary_enabled: boolean;
  monthly_summary_time: string;
  balance_warning_enabled: boolean;
  balance_warning_threshold: number | string;
  sync_warning_enabled: boolean;
  backup_reminder_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  timezone: string;
};

type DayMarkSettingsRow = {
  daily_plan_enabled: boolean;
  daily_plan_time: string;
  task_reminder_enabled: boolean;
  task_reminder_minutes: number;
  pomodoro_completed_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  timezone: string;
};

function readStoredSettings<T>(key: string, fallback: T) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? ({ ...fallback, ...JSON.parse(saved) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeTime(value: string | undefined, fallback: string) {
  return value?.slice(0, 5) || fallback;
}

function mapMoneySettingsRow(row: MoneySettingsRow): MoneyDiaryNotificationSettings {
  return {
    dailyEntryEnabled: row.daily_entry_enabled,
    dailyEntryTime: normalizeTime(row.daily_entry_time, "21:00"),
    expenseReminderEnabled: row.expense_reminder_enabled,
    expenseReminderTime: normalizeTime(row.expense_reminder_time, "20:30"),
    dailyIncomeTargetEnabled: row.daily_income_target_enabled,
    dailyIncomeCheckTime: normalizeTime(row.daily_income_check_time, "19:00"),
    goalProgressWarningEnabled: row.goal_progress_warning_enabled,
    goalDeadlineWarningEnabled: row.goal_deadline_warning_enabled,
    goalDeadlineDays: row.goal_deadline_days,
    dailySummaryEnabled: row.daily_summary_enabled,
    dailySummaryTime: normalizeTime(row.daily_summary_time, "22:00"),
    weeklySummaryEnabled: row.weekly_summary_enabled,
    weeklySummaryDay: row.weekly_summary_day,
    weeklySummaryTime: normalizeTime(row.weekly_summary_time, "20:00"),
    monthlySummaryEnabled: row.monthly_summary_enabled,
    monthlySummaryTime: normalizeTime(row.monthly_summary_time, "20:30"),
    balanceWarningEnabled: row.balance_warning_enabled,
    balanceWarningThreshold: Number(row.balance_warning_threshold),
    syncWarningEnabled: row.sync_warning_enabled,
    backupReminderEnabled: row.backup_reminder_enabled,
    soundEnabled: row.sound_enabled,
    vibrationEnabled: row.vibration_enabled,
    timezone: row.timezone,
  };
}

function mapMoneySettingsToRow(
  userId: string,
  settings: MoneyDiaryNotificationSettings
) {
  return {
    user_id: userId,
    daily_entry_enabled: settings.dailyEntryEnabled,
    daily_entry_time: settings.dailyEntryTime,
    expense_reminder_enabled: settings.expenseReminderEnabled,
    expense_reminder_time: settings.expenseReminderTime,
    daily_income_target_enabled: settings.dailyIncomeTargetEnabled,
    daily_income_check_time: settings.dailyIncomeCheckTime,
    goal_progress_warning_enabled: settings.goalProgressWarningEnabled,
    goal_deadline_warning_enabled: settings.goalDeadlineWarningEnabled,
    goal_deadline_days: settings.goalDeadlineDays,
    daily_summary_enabled: settings.dailySummaryEnabled,
    daily_summary_time: settings.dailySummaryTime,
    weekly_summary_enabled: settings.weeklySummaryEnabled,
    weekly_summary_day: settings.weeklySummaryDay,
    weekly_summary_time: settings.weeklySummaryTime,
    monthly_summary_enabled: settings.monthlySummaryEnabled,
    monthly_summary_time: settings.monthlySummaryTime,
    balance_warning_enabled: settings.balanceWarningEnabled,
    balance_warning_threshold: settings.balanceWarningThreshold,
    sync_warning_enabled: settings.syncWarningEnabled,
    backup_reminder_enabled: settings.backupReminderEnabled,
    sound_enabled: settings.soundEnabled,
    vibration_enabled: settings.vibrationEnabled,
    timezone: settings.timezone,
    updated_at: new Date().toISOString(),
  };
}

function mapDayMarkSettingsRow(row: DayMarkSettingsRow): DayMarkNotificationSettings {
  return {
    dailyPlanEnabled: row.daily_plan_enabled,
    dailyPlanTime: normalizeTime(row.daily_plan_time, "07:00"),
    taskReminderEnabled: row.task_reminder_enabled,
    taskReminderMinutes: row.task_reminder_minutes,
    pomodoroCompletedEnabled: row.pomodoro_completed_enabled,
    soundEnabled: row.sound_enabled,
    vibrationEnabled: row.vibration_enabled,
    timezone: row.timezone,
  };
}

export async function loadMoneyDiaryNotificationSettings(userId?: string) {
  const local = readStoredSettings(
    MONEY_SETTINGS_STORAGE_KEY,
    DEFAULT_MONEY_DIARY_NOTIFICATION_SETTINGS
  );

  if (!userId) return local;

  const { data, error } = await supabase
    .from("money_diary_notification_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return local;

  const settings = mapMoneySettingsRow(data as MoneySettingsRow);
  localStorage.setItem(MONEY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  return settings;
}

export async function saveMoneyDiaryNotificationSettings(
  userId: string | undefined,
  settings: MoneyDiaryNotificationSettings
) {
  localStorage.setItem(MONEY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(
    new CustomEvent("app-notification-settings-updated", {
      detail: { appIdentifier: "money_diary" },
    })
  );
  if (!userId) return;

  const { error } = await supabase
    .from("money_diary_notification_settings")
    .upsert(mapMoneySettingsToRow(userId, settings));

  if (error) throw error;
}

export async function loadDayMarkNotificationSettings(userId?: string) {
  const local = readStoredSettings(
    DAYMARK_SETTINGS_STORAGE_KEY,
    DEFAULT_DAYMARK_NOTIFICATION_SETTINGS
  );

  if (!userId) return local;

  const { data, error } = await supabase
    .from("daymark_notification_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return local;

  const settings = mapDayMarkSettingsRow(data as DayMarkSettingsRow);
  localStorage.setItem(DAYMARK_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  return settings;
}

export async function saveDayMarkNotificationSettings(
  userId: string | undefined,
  settings: DayMarkNotificationSettings
) {
  localStorage.setItem(DAYMARK_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(
    new CustomEvent("app-notification-settings-updated", {
      detail: { appIdentifier: "daymark" },
    })
  );
  if (!userId) return;

  const { error } = await supabase.from("daymark_notification_settings").upsert({
    user_id: userId,
    daily_plan_enabled: settings.dailyPlanEnabled,
    daily_plan_time: settings.dailyPlanTime,
    task_reminder_enabled: settings.taskReminderEnabled,
    task_reminder_minutes: settings.taskReminderMinutes,
    pomodoro_completed_enabled: settings.pomodoroCompletedEnabled,
    sound_enabled: settings.soundEnabled,
    vibration_enabled: settings.vibrationEnabled,
    timezone: settings.timezone,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function getDevicePushSubscriptionState(
  appIdentifier: AppIdentifier
) {
  if (!("serviceWorker" in navigator)) return false;

  const registration = await navigator.serviceWorker.getRegistration(
    APP_NOTIFICATION_CONFIG[appIdentifier].scope
  );
  const subscription = await registration?.pushManager.getSubscription();

  return Boolean(subscription);
}

export async function enableNotificationsForDevice(
  appIdentifier: AppIdentifier,
  userId?: string
) {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    throw new Error("Trình duyệt này chưa hỗ trợ thông báo PWA.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Bạn chưa cấp quyền thông báo cho ứng dụng.");
  }

  const registration = await registerAppServiceWorker(appIdentifier);
  if (!registration) throw new Error("Không thể đăng ký service worker.");

  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();

  if (!publicKey) {
    return { permission, registered: false };
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      applicationServerKey: urlBase64ToUint8Array(publicKey),
      userVisibleOnly: true,
    });
  }

  if (userId) {
    const json = subscription.toJSON();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        app_identifier: appIdentifier,
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        is_active: true,
        user_agent: navigator.userAgent,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint,app_identifier" }
    );

    if (error) throw error;
  }

  window.dispatchEvent(
    new CustomEvent("app-notification-settings-updated", {
      detail: { appIdentifier },
    })
  );
  return { permission, registered: true };
}

export async function disableNotificationsForDevice(
  appIdentifier: AppIdentifier,
  userId?: string
) {
  const registration = await navigator.serviceWorker.getRegistration(
    APP_NOTIFICATION_CONFIG[appIdentifier].scope
  );
  const subscription = await registration?.pushManager.getSubscription();

  if (subscription && userId) {
    await supabase
      .from("push_subscriptions")
      .update({ is_active: false, last_seen_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("app_identifier", appIdentifier)
      .eq("endpoint", subscription.endpoint);
  }

  await subscription?.unsubscribe();
  window.dispatchEvent(
    new CustomEvent("app-notification-settings-updated", {
      detail: { appIdentifier },
    })
  );
}

export async function showAppTestNotification(
  appIdentifier: AppIdentifier,
  options: {
    soundEnabled: boolean;
    userId?: string;
    vibrationEnabled: boolean;
  }
) {
  const result = await enableNotificationsForDevice(
    appIdentifier,
    options.userId
  );
  const registration = await registerAppServiceWorker(appIdentifier);

  if (!registration) throw new Error("Không thể mở thông báo thử.");

  const config = APP_NOTIFICATION_CONFIG[appIdentifier];
  const isMoneyDiary = appIdentifier === "money_diary";
  const notificationOptions: NotificationOptions & {
    vibrate?: number[];
  } = {
    badge: config.badge,
    body: isMoneyDiary
      ? "Bạn sẽ nhận được nhắc nhở về nhật ký và mục tiêu tài chính."
      : "Bạn sẽ nhận được nhắc nhở về nhiệm vụ và Pomodoro.",
    data: {
      app: appIdentifier,
      targetUrl: config.startUrl,
      type: isMoneyDiary ? "daily_entry_reminder" : "daily_plan_reminder",
    },
    icon: config.icon,
    silent: !options.soundEnabled,
    tag: `${appIdentifier}-test-notification`,
    vibrate: options.vibrationEnabled ? [120, 60, 120] : [],
  };

  await registration.showNotification(
    isMoneyDiary ? "Money Diary - Thông báo đã hoạt động" : "DayMark - Thông báo đã hoạt động",
    notificationOptions
  );

  return result;
}

export async function showLocalAppNotification(
  appIdentifier: AppIdentifier,
  input: {
    body: string;
    data: Record<string, unknown>;
    soundEnabled: boolean;
    tag: string;
    title?: string;
    vibrationEnabled: boolean;
  }
) {
  if (getNotificationPermission() !== "granted") return false;

  const registration = await registerAppServiceWorker(appIdentifier);
  if (!registration) return false;

  const config = APP_NOTIFICATION_CONFIG[appIdentifier];
  const options: NotificationOptions & { vibrate?: number[] } = {
    badge: config.badge,
    body: input.body,
    data: { ...input.data, app: appIdentifier },
    icon: config.icon,
    silent: !input.soundEnabled,
    tag: input.tag,
    vibrate: input.vibrationEnabled ? [120, 60, 120] : [],
  };

  await registration.showNotification(input.title ?? config.name, options);
  return true;
}

export async function syncNotificationJobs(
  userId: string,
  appIdentifier: AppIdentifier,
  drafts: NotificationJobDraft[]
) {
  const { data: existingRows, error: selectError } = await supabase
    .from("notification_jobs")
    .select("dedupe_key,status")
    .eq("user_id", userId)
    .eq("app_identifier", appIdentifier);

  if (selectError) throw selectError;

  const existing = new Map(
    (existingRows ?? []).map((row) => [row.dedupe_key as string, row.status as string])
  );
  const plannedKeys = drafts.map((draft) => draft.dedupeKey);
  let staleJobDelete = supabase
    .from("notification_jobs")
    .delete()
    .eq("user_id", userId)
    .eq("app_identifier", appIdentifier)
    .in("status", ["pending", "failed", "cancelled"]);

  if (plannedKeys.length > 0) {
    staleJobDelete = staleJobDelete.not(
      "dedupe_key",
      "in",
      `(${plannedKeys
        .map((key) => `"${key.replaceAll('"', '\\"')}"`)
        .join(",")})`
    );
  }

  const { error: deleteError } = await staleJobDelete;
  if (deleteError) throw deleteError;

  const rows = drafts
    .filter((draft) => existing.get(draft.dedupeKey) !== "sent")
    .map((draft) => ({
      user_id: userId,
      app_identifier: draft.appIdentifier,
      notification_type: draft.notificationType,
      dedupe_key: draft.dedupeKey,
      scheduled_for: draft.scheduledFor,
      payload: draft.payload,
      status: "pending",
      attempt_count: 0,
      last_error: null,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return;

  const { error: upsertError } = await supabase
    .from("notification_jobs")
    .upsert(rows, {
      onConflict: "user_id,app_identifier,dedupe_key",
    });

  if (upsertError) throw upsertError;
}
