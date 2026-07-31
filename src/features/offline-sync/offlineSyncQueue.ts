import type { MoneySyncSnapshot } from "./offlineSyncModel";
import { areMoneySyncSnapshotsEqual } from "./offlineSyncModel";

const OFFLINE_SYNC_QUEUE_KEY = "money_diary_offline_sync_queue_v1";
const OFFLINE_SYNC_BASE_PREFIX = "money_diary_offline_sync_base_v1:";
const MAX_QUEUED_OPERATIONS = 20;

export type OfflineSyncOperation = {
  attempts: number;
  baseRevision: number;
  baseSnapshot: MoneySyncSnapshot;
  createdAt: string;
  id: string;
  snapshot: MoneySyncSnapshot;
  updatedAt: string;
  userId: string;
};

export type OfflineSyncBase = {
  revision: number;
  snapshot: MoneySyncSnapshot;
  syncedAt: string;
};

function createOperationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadQueue() {
  if (typeof localStorage === "undefined") return [];

  try {
    const saved = localStorage.getItem(OFFLINE_SYNC_QUEUE_KEY);
    return saved ? (JSON.parse(saved) as OfflineSyncOperation[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: OfflineSyncOperation[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    OFFLINE_SYNC_QUEUE_KEY,
    JSON.stringify(queue.slice(-MAX_QUEUED_OPERATIONS))
  );
}

export function getOfflineSyncOperations(userId: string) {
  return loadQueue()
    .filter((operation) => operation.userId === userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getOfflineSyncOperationCount(userId: string) {
  return getOfflineSyncOperations(userId).length;
}

export function enqueueOfflineSyncOperation(input: {
  baseRevision: number;
  baseSnapshot: MoneySyncSnapshot;
  snapshot: MoneySyncSnapshot;
  userId: string;
}) {
  const queue = loadQueue();
  const latest = [...queue]
    .reverse()
    .find((operation) => operation.userId === input.userId);

  if (latest && areMoneySyncSnapshotsEqual(latest.snapshot, input.snapshot)) {
    return latest;
  }

  // Khi chưa gửi, nhiều lần sửa liên tiếp được gom vào cùng một snapshot. Nếu
  // thao tác đã bắt đầu gửi thì giữ nguyên operation id đó và tạo thao tác kế
  // tiếp, tránh trường hợp server đã nhận payload cũ nhưng client đổi payload.
  if (latest && latest.attempts === 0) {
    const compacted = {
      ...latest,
      snapshot: input.snapshot,
      updatedAt: new Date().toISOString(),
    };
    saveQueue(
      queue.map((operation) =>
        operation.id === latest.id ? compacted : operation
      )
    );
    return compacted;
  }

  const now = new Date().toISOString();
  const operation: OfflineSyncOperation = {
    attempts: 0,
    baseRevision: input.baseRevision,
    baseSnapshot: input.baseSnapshot,
    createdAt: now,
    id: createOperationId(),
    snapshot: input.snapshot,
    updatedAt: now,
    userId: input.userId,
  };

  saveQueue([...queue, operation]);
  return operation;
}

export function updateOfflineSyncOperation(operation: OfflineSyncOperation) {
  saveQueue(
    loadQueue().map((item) =>
      item.id === operation.id
        ? { ...operation, updatedAt: new Date().toISOString() }
        : item
    )
  );
}

export function markOfflineSyncAttempt(operationId: string) {
  saveQueue(
    loadQueue().map((operation) =>
      operation.id === operationId
        ? {
            ...operation,
            attempts: operation.attempts + 1,
            updatedAt: new Date().toISOString(),
          }
        : operation
    )
  );
}

export function removeOfflineSyncOperation(operationId: string) {
  saveQueue(loadQueue().filter((operation) => operation.id !== operationId));
}

export function loadOfflineSyncBase(userId: string) {
  if (typeof localStorage === "undefined") return null;

  try {
    const saved = localStorage.getItem(`${OFFLINE_SYNC_BASE_PREFIX}${userId}`);
    return saved ? (JSON.parse(saved) as OfflineSyncBase) : null;
  } catch {
    return null;
  }
}

export function saveOfflineSyncBase(
  userId: string,
  revision: number,
  snapshot: MoneySyncSnapshot
) {
  if (typeof localStorage === "undefined") return;

  const value: OfflineSyncBase = {
    revision,
    snapshot,
    syncedAt: new Date().toISOString(),
  };
  localStorage.setItem(
    `${OFFLINE_SYNC_BASE_PREFIX}${userId}`,
    JSON.stringify(value)
  );
}
