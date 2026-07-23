import {
  Bell,
  BellOff,
  Check,
  Send,
  Smartphone,
} from "lucide-react";
import { useState } from "react";
import { formatMoneyInput, parseMoneyInput } from "../../../utils/money";
import {
  disableNotificationsForDevice,
  enableNotificationsForDevice,
  showAppTestNotification,
} from "../notificationService";
import { useMoneyDiaryNotificationSettings } from "../useNotificationSettings";
import type { MoneyDiaryNotificationSettings } from "../types";
import {
  NotificationTimeInput,
  NotificationToggleRow,
} from "./NotificationSettingFields";

const deadlineOptions = [30, 14, 7, 3, 1];

export function MoneyNotificationSettingsCard({
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
  } = useMoneyDiaryNotificationSettings(userId);
  const draft = settings;
  const [actionMessage, setActionMessage] = useState("");
  const [isDeviceActionPending, setIsDeviceActionPending] = useState(false);

  function update<K extends keyof MoneyDiaryNotificationSettings>(
    key: K,
    value: MoneyDiaryNotificationSettings[K]
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function runDeviceAction(action: () => Promise<unknown>, message: string) {
    setIsDeviceActionPending(true);
    setActionMessage("");

    try {
      await action();
      await refreshDeviceState();
      setActionMessage(message);
    } catch (actionError) {
      setActionMessage(
        actionError instanceof Error
          ? actionError.message
          : "Không thể cập nhật thông báo trên thiết bị."
      );
    } finally {
      setIsDeviceActionPending(false);
    }
  }

  async function handleSave() {
    const next = {
      ...draft,
      balanceWarningThreshold: draft.balanceWarningThreshold,
    };

    try {
      await save(next);
      setActionMessage("Đã lưu cài đặt thông báo tài chính.");
    } catch {
      // Error is rendered from the hook.
    }
  }

  if (isLoading) {
    return (
      <section className="notification-settings-card" aria-busy="true">
        <p>Đang tải cài đặt thông báo...</p>
      </section>
    );
  }

  const permissionLabel =
    permission === "granted" && deviceSubscribed
      ? "Push đã bật trên thiết bị"
      : permission === "granted"
        ? "Đã cấp quyền, chưa có push"
      : permission === "denied"
        ? "Đã bị chặn trên trình duyệt"
        : permission === "unsupported"
          ? "Thiết bị chưa hỗ trợ"
          : "Chưa bật trên thiết bị này";

  return (
    <section className="notification-settings-card">
      <header className="notification-settings-header">
        <div>
          <span className="notification-settings-eyebrow">
            <Bell aria-hidden="true" size={17} />
            Money Diary
          </span>
          <h2>Thông báo tài chính</h2>
          <p>
            Lịch nhắc được lưu riêng cho tài khoản và subscription được tách theo
            từng thiết bị.
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
          {permissionLabel}
        </span>
      </header>

      <div className="notification-settings-group">
        <h3>Nhắc hằng ngày</h3>
        <NotificationToggleRow
          checked={draft.dailyEntryEnabled}
          label="Nhắc ghi nhật ký mỗi ngày"
          onChange={(value) => update("dailyEntryEnabled", value)}
        >
          <NotificationTimeInput
            label="Thời gian"
            value={draft.dailyEntryTime}
            onChange={(value) => update("dailyEntryTime", value)}
          />
        </NotificationToggleRow>
        <NotificationToggleRow
          checked={draft.expenseReminderEnabled}
          label="Nhắc nhập chi tiêu"
          onChange={(value) => update("expenseReminderEnabled", value)}
        >
          <NotificationTimeInput
            label="Thời gian"
            value={draft.expenseReminderTime}
            onChange={(value) => update("expenseReminderTime", value)}
          />
        </NotificationToggleRow>
        <NotificationToggleRow
          checked={draft.dailyIncomeTargetEnabled}
          description="Chỉ tính tiền làm được và tiền thưởng, không tính tiền nhận."
          label="Nhắc mục tiêu thu nhập trong ngày"
          onChange={(value) => update("dailyIncomeTargetEnabled", value)}
        >
          <NotificationTimeInput
            label="Kiểm tra"
            value={draft.dailyIncomeCheckTime}
            onChange={(value) => update("dailyIncomeCheckTime", value)}
          />
        </NotificationToggleRow>
      </div>

      <div className="notification-settings-group">
        <h3>Mục tiêu</h3>
        <NotificationToggleRow
          checked={draft.goalProgressWarningEnabled}
          label="Cảnh báo chậm tiến độ"
          onChange={(value) => update("goalProgressWarningEnabled", value)}
        />
        <NotificationToggleRow
          checked={draft.goalDeadlineWarningEnabled}
          label="Cảnh báo mục tiêu sắp hết hạn"
          onChange={(value) => update("goalDeadlineWarningEnabled", value)}
        />
        <fieldset className="notification-deadline-options">
          <legend>Mốc cảnh báo trước deadline</legend>
          {deadlineOptions.map((days) => (
            <label key={days}>
              <input
                type="checkbox"
                checked={draft.goalDeadlineDays.includes(days)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...draft.goalDeadlineDays, days]
                    : draft.goalDeadlineDays.filter((value) => value !== days);
                  update(
                    "goalDeadlineDays",
                    [...new Set(next)].sort((a, b) => b - a)
                  );
                }}
              />
              <span>{days} ngày</span>
            </label>
          ))}
        </fieldset>
      </div>

      <div className="notification-settings-group">
        <h3>Tổng kết</h3>
        <NotificationToggleRow
          checked={draft.dailySummaryEnabled}
          label="Tổng kết cuối ngày"
          onChange={(value) => update("dailySummaryEnabled", value)}
        >
          <NotificationTimeInput
            label="Thời gian"
            value={draft.dailySummaryTime}
            onChange={(value) => update("dailySummaryTime", value)}
          />
        </NotificationToggleRow>
        <NotificationToggleRow
          checked={draft.weeklySummaryEnabled}
          label="Tổng kết tuần"
          onChange={(value) => update("weeklySummaryEnabled", value)}
        >
          <label className="notification-inline-field">
            <span>Ngày gửi</span>
            <select
              value={draft.weeklySummaryDay}
              onChange={(event) =>
                update("weeklySummaryDay", Number(event.target.value))
              }
            >
              <option value={0}>Chủ nhật</option>
              <option value={1}>Thứ hai</option>
              <option value={6}>Thứ bảy</option>
            </select>
          </label>
          <NotificationTimeInput
            label="Thời gian"
            value={draft.weeklySummaryTime}
            onChange={(value) => update("weeklySummaryTime", value)}
          />
        </NotificationToggleRow>
        <NotificationToggleRow
          checked={draft.monthlySummaryEnabled}
          label="Tổng kết tháng"
          onChange={(value) => update("monthlySummaryEnabled", value)}
        >
          <NotificationTimeInput
            label="Thời gian"
            value={draft.monthlySummaryTime}
            onChange={(value) => update("monthlySummaryTime", value)}
          />
        </NotificationToggleRow>
      </div>

      <div className="notification-settings-group">
        <h3>An toàn dữ liệu</h3>
        <NotificationToggleRow
          checked={draft.balanceWarningEnabled}
          label="Cảnh báo chênh lệch số dư"
          onChange={(value) => update("balanceWarningEnabled", value)}
        >
          <label className="notification-inline-field notification-money-field">
            <span>Ngưỡng cảnh báo</span>
            <input
              inputMode="numeric"
              value={formatMoneyInput(String(draft.balanceWarningThreshold))}
              onChange={(event) =>
                update(
                  "balanceWarningThreshold",
                  parseMoneyInput(event.target.value)
                )
              }
            />
            <b>đ</b>
          </label>
        </NotificationToggleRow>
        <NotificationToggleRow
          checked={draft.syncWarningEnabled}
          label="Cảnh báo lỗi đồng bộ"
          onChange={(value) => update("syncWarningEnabled", value)}
        />
        <NotificationToggleRow
          checked={draft.backupReminderEnabled}
          label="Nhắc sao lưu báo cáo"
          onChange={(value) => update("backupReminderEnabled", value)}
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
              void runDeviceAction(
                () => enableNotificationsForDevice("money_diary", userId),
                "Đã bật thông báo Money Diary trên thiết bị này."
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
              void runDeviceAction(
                () => disableNotificationsForDevice("money_diary", userId),
                "Đã tắt subscription Money Diary trên thiết bị này."
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
              void runDeviceAction(
                () =>
                  showAppTestNotification("money_diary", {
                    soundEnabled: draft.soundEnabled,
                    userId,
                    vibrationEnabled: draft.vibrationEnabled,
                  }),
                "Đã gửi thông báo thử Money Diary."
              )
            }
          >
            <Send aria-hidden="true" size={18} />
            Gửi thông báo thử
          </button>
        </div>
      </div>

      {(actionMessage || error) && (
        <p className="notification-settings-message" role="status">
          {error || actionMessage}
        </p>
      )}

      <footer className="notification-settings-footer">
        <button
          type="button"
          className="notification-primary-button"
          disabled={isSaving}
          onClick={() => void handleSave()}
        >
          {isSaving ? "Đang lưu..." : "Lưu cài đặt thông báo"}
        </button>
      </footer>
    </section>
  );
}
