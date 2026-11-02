import { useEffect, useRef, useState } from "react";
import { safeSetStorageItem } from "../../utils/safeStorage";
import { getDateString } from "../../utils/date.ts";
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
  const lastSavedRef = useRef<{ ownerId: string; day: string; signature: string } | null>(null);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    if (!isSynced(syncStatus)) return;
    safeSetStorageItem(
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
        const day = getDateString(now);
        const signature = JSON.stringify(source);
        if (lastSavedRef.current?.ownerId === userId && lastSavedRef.current.day === day &&
          lastSavedRef.current.signature === signature) return;
        const snapshot = createBackupSnapshot(source, now);
        const records = (["daily", "weekly", "monthly"] as const).map((kind) =>
          createBackupRecord({ kind, ownerId: userId, snapshot })
        );

        const results = await Promise.all(records.map((record) => saveBackupRecord(record)));
        await enforceBackupRetention(userId);
        if (results.every((result) => result.cloudAvailable))
          lastSavedRef.current = { ownerId: userId, day, signature };
      } catch (error) {
        console.error("Không thể tạo backup tự động.", error);
      } finally {
        runningRef.current = false;

        if (pendingRef.current) {
          pendingRef.current = false;
          setGeneration((value) => value + 1);
        }
      }
    // Keep the full-size backup writes away from the interactive sync burst.
    // A new edit restarts this timer so only a settled snapshot is uploaded.
    }, 15_000);

    return () => window.clearTimeout(timeout);
  }, [generation, source, syncStatus, userId]);
}
