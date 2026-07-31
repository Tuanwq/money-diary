import { STORAGE_APP_CHANGE_LOGS_KEY } from "../constants/storageKeys.ts";
import type { AppChangeLog } from "../types";
import {
  estimateStorageBytes,
  safeRemoveStorageItem,
  safeSetStorageJson,
} from "./safeStorage.ts";

export const APP_CHANGE_LOG_MEMORY_LIMIT = 60;
export const APP_CHANGE_LOG_STORAGE_BUDGET_BYTES = 1_500_000;
export const APP_CHANGE_LOG_ITEM_BUDGET_BYTES = 320_000;
const APP_CHANGE_LOG_RAW_STORAGE_LIMIT = 2_000_000;

function createReadOnlyLog(log: AppChangeLog): AppChangeLog {
  return {
    ...log,
    canRestore: false,
    patches: log.patches.map((patch) => ({
      ...patch,
      after: null,
      before: null,
    })),
  };
}

function normalizeLog(log: AppChangeLog) {
  if (log.canRestore === false) return log;

  return estimateStorageBytes(log) <= APP_CHANGE_LOG_ITEM_BUDGET_BYTES
    ? log
    : createReadOnlyLog(log);
}

export function limitAppChangeLogs(logs: AppChangeLog[]) {
  return logs
    .slice(0, APP_CHANGE_LOG_MEMORY_LIMIT)
    .map(normalizeLog);
}

export function loadAppChangeLogs() {
  try {
    const saved = localStorage.getItem(STORAGE_APP_CHANGE_LOGS_KEY);
    if (!saved) return [];
    if (saved.length > APP_CHANGE_LOG_RAW_STORAGE_LIMIT) {
      safeRemoveStorageItem(STORAGE_APP_CHANGE_LOGS_KEY);
      return [];
    }

    const parsed = JSON.parse(saved) as unknown;
    return Array.isArray(parsed)
      ? limitAppChangeLogs(parsed as AppChangeLog[])
      : [];
  } catch {
    return [];
  }
}

export function selectAppChangeLogsForStorage(logs: AppChangeLog[]) {
  const selected: AppChangeLog[] = [];
  let totalBytes = 2;

  for (const log of limitAppChangeLogs(logs)) {
    const logBytes = estimateStorageBytes(log) + 1;
    if (totalBytes + logBytes > APP_CHANGE_LOG_STORAGE_BUDGET_BYTES) break;

    selected.push(log);
    totalBytes += logBytes;
  }

  return selected;
}

export function saveAppChangeLogs(logs: AppChangeLog[]) {
  let selected = selectAppChangeLogsForStorage(logs);

  while (selected.length > 0) {
    if (safeSetStorageJson(STORAGE_APP_CHANGE_LOGS_KEY, selected)) {
      return selected.length;
    }

    selected = selected.slice(0, Math.floor(selected.length / 2));
  }

  safeRemoveStorageItem(STORAGE_APP_CHANGE_LOGS_KEY);
  return 0;
}
