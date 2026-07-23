import { Bell, BellOff, Check, Send, Smartphone } from "lucide-react";
import { useState } from "react";
import {
  disableNotificationsForDevice,
  enableNotificationsForDevice,
  showAppTestNotification,
} from "../notificationService";
import type { DayMarkNotificationSettings } from "../types";
import { useDayMarkNotificationSettings } from "../useNotificationSettings";
import {
  NotificationTimeInput,
  NotificationToggleRow,
} from "./NotificationSettingFields";

export function DayMarkNotificationSettingsCard({
  userId,
}: {
  userId?: string;
}) {
  const {
    deviceSubscribed,
    error,
    isLoading,
    isSaving,
    permission,
    refreshDeviceState,
    save,
    setSettings: setDraft,
    settings,
  } = useDayMarkNotificationSettings(userId);
  const draft = settings;
  const [message, setMessage] = useState("");
  const [isDeviceActionPending, setIsDeviceActionPending] = useState(false);

  function update<K extends keyof DayMarkNotificationSettings>(
    key: K,
    value: DayMarkNotificationSettings[K]
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function run(action: () => Promise<unknown>, successMessage: string) {
    setIsDeviceActionPending(true);
    setMessage("");

    try {
      await action();
      await refreshDeviceState();
      setMessage(successMessage);
    } catch (actionError) {
      setMessage(
        actionError instanceof Error
          ? actionError.message
          : "Không thể cập nhật thông báo DayMark."
      );
    } finally {
      setIsDeviceActionPending(false);
    }
  }

  if (isLoading) {
    return (
      <section className="notification-settings-card" aria-busy="true">
        Đang tải cài đặt thông báo...
      </section>
    );
  }

  return (
    <section className="notification-settings-card">
      <header className="notification-settings-header">
        <div>
          <span className="notification-settings-eyebrow">
            <Bell aria-hidden="true" size={17} />
            DayMark
          </span>
          <h2>Thông báo nhiệm vụ</h2>
          <p>
            DayMark dùng subscription, icon và lịch nhắc riêng, không dùng chung
            với Money Diary.
          </p>
        </div>
        <span
          className={`notification-permission-badge ${
            permission === "granted" && deviceSubscribed ? "is-enabled" : ""
          }`}
        >
          {permission === "granted" && deviceSubscribed ? (
            <Check aria-hidden="true" size={15} />
          ) : (
            <BellOff aria-hidden="true" size={15} />
          )}
          {permission === "granted" && deviceSubscribed
            ? "Push đã bật"
            : permission === "granted"
              ? "Đã cấp quyền, chưa có push"
              : "Chưa bật"}
        </span>
      </header>

      <div className="notification-settings-group">
        <h3>Lịch nhắc DayMark</h3>
        <NotificationToggleRow
          checked={draft.dailyPlanEnabled}
          label="Nhắc mở kế hoạch ngày"
          onChange={(value) => update("dailyPlanEnabled", value)}
        >
          <NotificationTimeInput
            label="Thời gian"
            value={draft.dailyPlanTime}
            onChange={(value) => update("dailyPlanTime", value)}
          />
        </NotificationToggleRow>
        <NotificationToggleRow
          checked={draft.taskReminderEnabled}
          label="Nhắc trước giờ bắt đầu nhiệm vụ"
          onChange={(value) => update("taskReminderEnabled", value)}
        >
          <label className="notification-inline-field">
            <span>Nhắc trước</span>
            <select
              value={draft.taskReminderMinutes}
              onChange={(event) =>
                update("taskReminderMinutes", Number(event.target.value))
              }
            >
              <option value={0}>Đúng giờ</option>
              <option value={5}>5 phút</option>
              <option value={10}>10 phút</option>
              <option value={15}>15 phút</option>
              <option value={30}>30 phút</option>
            </select>
          </label>
        </NotificationToggleRow>
        <NotificationToggleRow
          checked={draft.pomodoroCompletedEnabled}
          label="Báo khi hoàn thành Pomodoro"
          onChange={(value) => update("pomodoroCompletedEnabled", value)}
        />
      </div>

      <div className="notification-settings-group">
        <h3>Thiết bị</h3>
        <NotificationToggleRow
          checked={draft.soundEnabled}
          label="Âm thanh"
          onChange={(value) => update("soundEnabled", value)}
        />
        <NotificationToggleRow
          checked={draft.vibrationEnabled}
          label="Rung"
          onChange={(value) => update("vibrationEnabled", value)}
        />
        <div className="notification-device-actions">
          <button
            type="button"
            className="notification-secondary-button"
            disabled={isDeviceActionPending}
            onClick={() =>
              void run(
                () => enableNotificationsForDevice("daymark", userId),
                "Đã bật thông báo DayMark trên thiết bị này."
              )
            }
          >
            <Smartphone aria-hidden="true" size={18} />
            Bật trên thiết bị này
          </button>
          <button
            type="button"
            className="notification-secondary-button"
            disabled={isDeviceActionPending}
            onClick={() =>
              void run(
                () => disableNotificationsForDevice("daymark", userId),
                "Đã tắt subscription DayMark trên thiết bị này."
              )
            }
          >
            <BellOff aria-hidden="true" size={18} />
            Tắt trên thiết bị này
          </button>
          <button
            type="button"
            className="notification-secondary-button"
            disabled={isDeviceActionPending}
            onClick={() =>
              void run(
                () =>
                  showAppTestNotification("daymark", {
                    soundEnabled: draft.soundEnabled,
                    userId,
                    vibrationEnabled: draft.vibrationEnabled,
                  }),
                "Đã gửi thông báo thử DayMark."
              )
            }
          >
            <Send aria-hidden="true" size={18} />
            Gửi thông báo thử
          </button>
        </div>
      </div>

      {(message || error) && (
        <p className="notification-settings-message" role="status">
          {error || message}
        </p>
      )}

      <footer className="notification-settings-footer">
        <button
          type="button"
          className="notification-primary-button"
          disabled={isSaving}
          onClick={() =>
            void save(draft)
              .then(() => setMessage("Đã lưu cài đặt thông báo DayMark."))
              .catch(() => undefined)
          }
        >
          {isSaving ? "Đang lưu..." : "Lưu cài đặt thông báo"}
        </button>
      </footer>
    </section>
  );
}
