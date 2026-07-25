import { useEffect, useRef } from "react";
import {
  createBackupRecord,
  createBackupSnapshot,
  type BackupSourceData,
} from "./backupModel";
import {
  enforceBackupRetention,
  saveBackupRecord,
} from "./backupStorage";

export const STORAGE_LAST_CLOUD_SYNC_AT_KEY =
  "money_diary_last_cloud_sync_at";

type AutomaticBackupParams = {
  source: BackupSourceData;
  syncStatus: string;
  userId?: string;
};

function isSynced(syncStatus: string) {
  return syncStatus.trim().toLocaleLowerCase("vi-VN") === "đã đồng bộ";
}

export function useAutomaticBackups({
  source,
  syncStatus,
  userId,
}: AutomaticBackupParams) {
  const runningRef = useRef(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!isSynced(syncStatus)) return;
    localStorage.setItem(
      STORAGE_LAST_CLOUD_SYNC_AT_KEY,
      new Date().toISOString()
    );
  }, [syncStatus]);

  useEffect(() => {
    if (!userId || !isSynced(syncStatus)) return;

    const timeout = window.setTimeout(async () => {
      if (runningRef.current) {
        pendingRef.current = true;
        return;
      }

      runningRef.current = true;

      try {
        const now = new Date();
        const snapshot = createBackupSnapshot(source, now);
        const records = (["daily", "weekly", "monthly"] as const).map((kind) =>
          createBackupRecord({ kind, ownerId: userId, snapshot })
        );

        await Promise.all(records.map((record) => saveBackupRecord(record)));
        await enforceBackupRetention(userId);
      } catch (error) {
        console.error("Không thể tạo backup tự động.", error);
      } finally {
        runningRef.current = false;

        if (pendingRef.current) {
          pendingRef.current = false;
        }
      }
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [source, syncStatus, userId]);
}
