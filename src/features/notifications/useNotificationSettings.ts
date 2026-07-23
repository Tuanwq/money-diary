import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_DAYMARK_NOTIFICATION_SETTINGS,
  DEFAULT_MONEY_DIARY_NOTIFICATION_SETTINGS,
} from "./config";
import {
  getDevicePushSubscriptionState,
  getNotificationPermission,
  loadDayMarkNotificationSettings,
  loadMoneyDiaryNotificationSettings,
  saveDayMarkNotificationSettings,
  saveMoneyDiaryNotificationSettings,
} from "./notificationService";
import type {
  DayMarkNotificationSettings,
  MoneyDiaryNotificationSettings,
  NotificationPermissionState,
} from "./types";

export function useMoneyDiaryNotificationSettings(userId?: string) {
  const [settings, setSettings] = useState(
    DEFAULT_MONEY_DIARY_NOTIFICATION_SETTINGS
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [permission, setPermission] = useState<NotificationPermissionState>(
    getNotificationPermission()
  );
  const [deviceSubscribed, setDeviceSubscribed] = useState(false);

  useEffect(() => {
    let active = true;

    void loadMoneyDiaryNotificationSettings(userId).then((loaded) => {
      if (!active) return;
      setSettings(loaded);
      setIsLoading(false);
    });
    void getDevicePushSubscriptionState("money_diary").then((subscribed) => {
      if (active) setDeviceSubscribed(subscribed);
    });

    return () => {
      active = false;
    };
  }, [userId]);

  const save = useCallback(
    async (next: MoneyDiaryNotificationSettings) => {
      setIsSaving(true);
      setError("");
      setSettings(next);

      try {
        await saveMoneyDiaryNotificationSettings(userId, next);
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Không thể lưu cài đặt thông báo."
        );
        throw saveError;
      } finally {
        setIsSaving(false);
      }
    },
    [userId]
  );

  const refreshDeviceState = useCallback(async () => {
    setPermission(getNotificationPermission());
    setDeviceSubscribed(
      await getDevicePushSubscriptionState("money_diary")
    );
  }, []);

  return {
    deviceSubscribed,
    error,
    isLoading,
    isSaving,
    permission,
    refreshDeviceState,
    save,
    setSettings,
    settings,
  };
}

export function useDayMarkNotificationSettings(userId?: string) {
  const [settings, setSettings] = useState(
    DEFAULT_DAYMARK_NOTIFICATION_SETTINGS
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [permission, setPermission] = useState<NotificationPermissionState>(
    getNotificationPermission()
  );
  const [deviceSubscribed, setDeviceSubscribed] = useState(false);

  useEffect(() => {
    let active = true;

    void loadDayMarkNotificationSettings(userId).then((loaded) => {
      if (!active) return;
      setSettings(loaded);
      setIsLoading(false);
    });
    void getDevicePushSubscriptionState("daymark").then((subscribed) => {
      if (active) setDeviceSubscribed(subscribed);
    });

    return () => {
      active = false;
    };
  }, [userId]);

  const save = useCallback(
    async (next: DayMarkNotificationSettings) => {
      setIsSaving(true);
      setError("");
      setSettings(next);

      try {
        await saveDayMarkNotificationSettings(userId, next);
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Không thể lưu cài đặt thông báo."
        );
        throw saveError;
      } finally {
        setIsSaving(false);
      }
    },
    [userId]
  );

  const refreshDeviceState = useCallback(async () => {
    setPermission(getNotificationPermission());
    setDeviceSubscribed(await getDevicePushSubscriptionState("daymark"));
  }, []);

  return {
    deviceSubscribed,
    error,
    isLoading,
    isSaving,
    permission,
    refreshDeviceState,
    save,
    setSettings,
    settings,
  };
}
