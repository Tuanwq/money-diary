import type { SyncableDatedItem } from "../types";

export function getSyncTime(item: SyncableDatedItem) {
  return new Date(
    item.updatedAt ?? item.createdAt ?? "1970-01-01T00:00:00.000Z"
  ).getTime();
}

export function mergeByNewestDate<T extends SyncableDatedItem>(
  cloudItems: T[],
  localItems: T[]
) {
  const map = new Map<string, T>();

  [...localItems, ...cloudItems].forEach((item) => {
    const current = map.get(item.date);

    if (!current || getSyncTime(item) >= getSyncTime(current)) {
      map.set(item.date, item);
    }
  });

  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}
