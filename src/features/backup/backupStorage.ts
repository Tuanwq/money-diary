import { supabase } from "../../lib/supabase";
import type { BackupKind, BackupRecord } from "./backupModel";
import {
  getExpiredBackupIds,
  mergeBackupRecords,
  type BackupListItem,
} from "./backupModel";

const BACKUP_DB_NAME = "money-diary-backups";
const BACKUP_DB_VERSION = 1;
const BACKUP_STORE_NAME = "backups";
const FALLBACK_STORAGE_KEY = "money_diary_backup_records";

export type BackupCloudResult = {
  cloudAvailable: boolean;
  cloudError: string;
};

export type BackupLoadResult = BackupCloudResult & {
  records: BackupListItem[];
};

function readFallbackRecords(): BackupRecord[] {
  try {
    const saved = localStorage.getItem(FALLBACK_STORAGE_KEY);
    const parsed = saved ? (JSON.parse(saved) as BackupRecord[]) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFallbackRecords(records: BackupRecord[]) {
  localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(records));
}

function openBackupDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(BACKUP_DB_NAME, BACKUP_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(BACKUP_STORE_NAME)) {
        const store = database.createObjectStore(BACKUP_STORE_NAME, {
          keyPath: "id",
        });
        store.createIndex("ownerId", "ownerId", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
) {
  const database = await openBackupDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(BACKUP_STORE_NAME, mode);
    const request = operation(transaction.objectStore(BACKUP_STORE_NAME));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

async function listDeviceRecords(ownerId: string) {
  if (!("indexedDB" in window)) {
    return readFallbackRecords().filter((record) => record.ownerId === ownerId);
  }

  try {
    const records = await withStore<BackupRecord[]>("readonly", (store) =>
      store.getAll()
    );

    return records.filter((record) => record.ownerId === ownerId);
  } catch {
    return readFallbackRecords().filter((record) => record.ownerId === ownerId);
  }
}

async function putDeviceRecord(record: BackupRecord) {
  if (!("indexedDB" in window)) {
    const records = readFallbackRecords().filter(
      (item) => item.id !== record.id
    );
    writeFallbackRecords([...records, record]);
    return;
  }

  try {
    await withStore<IDBValidKey>("readwrite", (store) => store.put(record));
  } catch {
    const records = readFallbackRecords().filter(
      (item) => item.id !== record.id
    );
    writeFallbackRecords([...records, record]);
  }
}

async function deleteDeviceRecords(ids: string[]) {
  if (ids.length === 0) return;

  if (!("indexedDB" in window)) {
    writeFallbackRecords(
      readFallbackRecords().filter((record) => !ids.includes(record.id))
    );
    return;
  }

  try {
    const database = await openBackupDb();

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(BACKUP_STORE_NAME, "readwrite");
      const store = transaction.objectStore(BACKUP_STORE_NAME);

      ids.forEach((id) => store.delete(id));
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error);
      };
    });
  } catch {
    writeFallbackRecords(
      readFallbackRecords().filter((record) => !ids.includes(record.id))
    );
  }
}

function mapCloudRecord(value: Record<string, unknown>): BackupRecord {
  return {
    createdAt: String(value.created_at),
    id: String(value.id),
    kind: value.backup_kind as BackupKind,
    label: String(value.label),
    ownerId: String(value.user_id),
    periodKey:
      typeof value.period_key === "string" ? value.period_key : null,
    snapshot: value.payload as BackupRecord["snapshot"],
    summary: value.summary as BackupRecord["summary"],
    updatedAt: String(value.updated_at),
  };
}

async function listCloudRecords(ownerId: string) {
  const { data, error } = await supabase
    .from("money_diary_backups")
    .select(
      "id, user_id, backup_kind, period_key, label, summary, payload, created_at, updated_at"
    )
    .eq("user_id", ownerId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((record) =>
    mapCloudRecord(record as Record<string, unknown>)
  );
}

async function putCloudRecord(record: BackupRecord) {
  const { error } = await supabase.from("money_diary_backups").upsert({
    backup_kind: record.kind,
    created_at: record.createdAt,
    id: record.id,
    label: record.label,
    payload: record.snapshot,
    period_key: record.periodKey,
    summary: record.summary,
    updated_at: record.updatedAt,
    user_id: record.ownerId,
  });

  if (error) throw error;
}

async function deleteCloudRecords(ownerId: string, ids: string[]) {
  if (ids.length === 0) return;

  const { error } = await supabase
    .from("money_diary_backups")
    .delete()
    .eq("user_id", ownerId)
    .in("id", ids);

  if (error) throw error;
}

function getCloudErrorMessage(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";

  if (
    message.includes("money_diary_backups") ||
    message.includes("schema cache")
  ) {
    return "Chưa tạo bảng backup trên Supabase. Bản sao vẫn được lưu an toàn trên thiết bị.";
  }

  return "Chưa thể lưu backup lên cloud. Bản sao vẫn được giữ trên thiết bị.";
}

export async function loadBackupRecords(
  ownerId: string
): Promise<BackupLoadResult> {
  const deviceRecords = await listDeviceRecords(ownerId);

  try {
    const cloudRecords = await listCloudRecords(ownerId);

    return {
      cloudAvailable: true,
      cloudError: "",
      records: mergeBackupRecords(deviceRecords, cloudRecords),
    };
  } catch (error) {
    return {
      cloudAvailable: false,
      cloudError: getCloudErrorMessage(error),
      records: mergeBackupRecords(deviceRecords, []),
    };
  }
}

export async function saveBackupRecord(
  record: BackupRecord
): Promise<BackupCloudResult> {
  await putDeviceRecord(record);

  try {
    await putCloudRecord(record);
    return { cloudAvailable: true, cloudError: "" };
  } catch (error) {
    return {
      cloudAvailable: false,
      cloudError: getCloudErrorMessage(error),
    };
  }
}

export async function deleteBackupRecord(
  ownerId: string,
  id: string
): Promise<BackupCloudResult> {
  await deleteDeviceRecords([id]);

  try {
    await deleteCloudRecords(ownerId, [id]);
    return { cloudAvailable: true, cloudError: "" };
  } catch (error) {
    return {
      cloudAvailable: false,
      cloudError: getCloudErrorMessage(error),
    };
  }
}

export async function enforceBackupRetention(
  ownerId: string
): Promise<BackupCloudResult> {
  const deviceRecords = await listDeviceRecords(ownerId);
  const deviceExpiredIds = getExpiredBackupIds(deviceRecords);
  await deleteDeviceRecords(deviceExpiredIds);

  try {
    const cloudRecords = await listCloudRecords(ownerId);
    const cloudExpiredIds = getExpiredBackupIds(cloudRecords);
    await deleteCloudRecords(ownerId, cloudExpiredIds);
    return { cloudAvailable: true, cloudError: "" };
  } catch (error) {
    return {
      cloudAvailable: false,
      cloudError: getCloudErrorMessage(error),
    };
  }
}
