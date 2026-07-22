import { DEFAULT_HUB_SETTINGS } from "../constants/hanoiHub";
import type { HubChangeLog, HubEntry, HubSettings } from "../types/hub";

function getHubSyncTime(item: { createdAt?: string; updatedAt?: string }) {
  return new Date(
    item.updatedAt ?? item.createdAt ?? "1970-01-01T00:00:00.000Z"
  ).getTime();
}

export function mergeHubEntries(
  cloudItems: HubEntry[],
  localItems: HubEntry[]
) {
  const map = new Map<string, HubEntry>();

  [...localItems, ...cloudItems].forEach((item) => {
    const current = map.get(item.id);

    if (!current || getHubSyncTime(item) >= getHubSyncTime(current)) {
      map.set(item.id, item);
    }
  });

  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export function mergeHubChangeLogs(
  cloudItems: HubChangeLog[],
  localItems: HubChangeLog[]
) {
  const map = new Map<string, HubChangeLog>();

  [...localItems, ...cloudItems].forEach((item) => {
    const current = map.get(item.id);

    if (!current || getHubSyncTime(item) >= getHubSyncTime(current)) {
      map.set(item.id, item);
    }
  });

  return Array.from(map.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export function mergeHubSettings(
  cloudSettings: Partial<HubSettings> | null | undefined,
  localSettings: Partial<HubSettings> | null | undefined
): HubSettings {
  const streakRestoredDates = [
    ...(localSettings?.streakRestoredDates ?? []),
    ...(cloudSettings?.streakRestoredDates ?? []),
  ];

  return {
    ...DEFAULT_HUB_SETTINGS,
    ...localSettings,
    ...cloudSettings,
    streakRestoredDates: [...new Set(streakRestoredDates)].sort(),
  };
}
