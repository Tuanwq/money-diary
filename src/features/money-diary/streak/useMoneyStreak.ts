import { useCallback, useEffect, useMemo, useState } from "react";
import {
  STORAGE_HUB_ENTRIES_KEY,
  STORAGE_HUB_SETTINGS_KEY,
} from "../../../constants/hanoiHub";
import { supabase } from "../../../lib/supabase";
import type { HubEntry, HubSettings } from "../../../types/hub";
import { mergeHubEntries, mergeHubSettings } from "../../../utils/hubSync";
import {
  calculateMoneyStreak,
  restoreMoneyStreakDate,
} from "./moneyStreak";

export const MONEY_STREAK_DATA_CHANGED_EVENT =
  "money-diary-streak-data-changed";

type HubStreakSource = {
  entries: HubEntry[];
  settings: HubSettings;
};

function loadJson<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;

  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

function readLocalHubStreakSource(): HubStreakSource {
  return {
    entries: loadJson<HubEntry[]>(STORAGE_HUB_ENTRIES_KEY, []),
    settings: mergeHubSettings(
      null,
      loadJson<Partial<HubSettings>>(STORAGE_HUB_SETTINGS_KEY, {})
    ),
  };
}

function writeLocalHubStreakSource(source: HubStreakSource) {
  localStorage.setItem(STORAGE_HUB_ENTRIES_KEY, JSON.stringify(source.entries));
  localStorage.setItem(
    STORAGE_HUB_SETTINGS_KEY,
    JSON.stringify(source.settings)
  );
}

export function useMoneyStreak() {
  const [source, setSource] = useState<HubStreakSource>(() =>
    readLocalHubStreakSource()
  );
  const [now, setNow] = useState(() => new Date());
  const [isCloudLoading, setIsCloudLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const summary = useMemo(
    () => calculateMoneyStreak(source.entries, source.settings, now),
    [now, source]
  );

  const reloadLocalData = useCallback(() => {
    setSource(readLocalHubStreakSource());
    setNow(new Date());
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === STORAGE_HUB_ENTRIES_KEY ||
        event.key === STORAGE_HUB_SETTINGS_KEY
      ) {
        reloadLocalData();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(MONEY_STREAK_DATA_CHANGED_EVENT, reloadLocalData);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        MONEY_STREAK_DATA_CHANGED_EVENT,
        reloadLocalData
      );
    };
  }, [reloadLocalData]);

  useEffect(() => {
    let active = true;

    async function loadCloudHubData() {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (!active || !userId) {
        if (active) setIsCloudLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("money_diary_state")
        .select("hub_entries, hub_settings")
        .eq("user_id", userId)
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.error(error);
        setIsCloudLoading(false);
        return;
      }

      const localSource = readLocalHubStreakSource();
      const cloudEntries = (data?.hub_entries ?? []) as unknown as HubEntry[];
      const cloudSettings = (data?.hub_settings ?? {}) as unknown as Partial<HubSettings>;
      const mergedSource = {
        entries: mergeHubEntries(cloudEntries, localSource.entries),
        settings: mergeHubSettings(cloudSettings, localSource.settings),
      };

      writeLocalHubStreakSource(mergedSource);
      setSource(mergedSource);
      setIsCloudLoading(false);
    }

    void loadCloudHubData();

    return () => {
      active = false;
    };
  }, []);

  const restoreDate = useCallback(
    async (date: string) => {
      const nextSettings = restoreMoneyStreakDate(
        source.entries,
        source.settings,
        date,
        new Date()
      );

      if (!nextSettings) return false;

      const nextSource = { ...source, settings: nextSettings };
      writeLocalHubStreakSource(nextSource);
      setSource(nextSource);
      setNow(new Date());
      setRestoreError("");
      window.dispatchEvent(new Event(MONEY_STREAK_DATA_CHANGED_EVENT));
      setIsRestoring(true);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;

        if (userId) {
          const { error } = await supabase.from("money_diary_state").upsert({
            user_id: userId,
            hub_settings: nextSettings,
            updated_at: new Date().toISOString(),
          });

          if (error) throw error;
        }

        return true;
      } catch (error) {
        console.error(error);
        setRestoreError(
          "Đã lưu khôi phục trên thiết bị nhưng chưa đồng bộ được lên cloud."
        );
        return true;
      } finally {
        setIsRestoring(false);
      }
    },
    [source]
  );

  return {
    isCloudLoading,
    isRestoring,
    restoreDate,
    restoreError,
    summary,
  };
}
