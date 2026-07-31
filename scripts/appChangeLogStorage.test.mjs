import assert from "node:assert/strict";
import {
  APP_CHANGE_LOG_MEMORY_LIMIT,
  APP_CHANGE_LOG_STORAGE_BUDGET_BYTES,
  limitAppChangeLogs,
  selectAppChangeLogsForStorage,
} from "../src/utils/appChangeLogStorage.ts";
import {
  estimateStorageBytes,
  safeSetStorageJson,
} from "../src/utils/safeStorage.ts";

function createLog(index, payloadSize = 32) {
  return {
    id: `log-${index}`,
    action: "update",
    title: `Thay đổi ${index}`,
    description: "Kiểm tra giới hạn lịch sử thay đổi.",
    createdAt: new Date(2026, 6, 31, 10, index).toISOString(),
    patches: [
      {
        key: "entries",
        before: [{ note: "x".repeat(payloadSize) }],
        after: [{ note: "y".repeat(payloadSize) }],
        beforeSummary: "Trước",
        afterSummary: "Sau",
      },
    ],
  };
}

const limited = limitAppChangeLogs(
  Array.from({ length: 100 }, (_, index) => createLog(index))
);
assert.equal(limited.length, APP_CHANGE_LOG_MEMORY_LIMIT);

const oversized = limitAppChangeLogs([createLog(1, 400_000)])[0];
assert.equal(oversized.canRestore, false);
assert.equal(oversized.patches[0].before, null);
assert.equal(oversized.patches[0].after, null);
assert.equal(oversized.patches[0].beforeSummary, "Trước");

const selected = selectAppChangeLogsForStorage(
  Array.from({ length: 60 }, (_, index) => createLog(index, 40_000))
);
assert.ok(selected.length > 0);
assert.ok(
  estimateStorageBytes(selected) <= APP_CHANGE_LOG_STORAGE_BUDGET_BYTES
);

const storage = new Map([
  ["money_diary_app_change_logs", "oversized-history"],
]);
const warnings = [];
globalThis.localStorage = {
  getItem(key) {
    return storage.get(key) ?? null;
  },
  removeItem(key) {
    storage.delete(key);
  },
  setItem(key, value) {
    if (
      key === "money_diary_entries" &&
      storage.has("money_diary_app_change_logs")
    ) {
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    }

    storage.set(key, value);
  },
};
globalThis.window = {
  dispatchEvent(event) {
    warnings.push(event.detail);
    return true;
  },
};

assert.equal(safeSetStorageJson("money_diary_entries", [{ income: 10 }]), true);
assert.equal(storage.has("money_diary_app_change_logs"), false);
assert.equal(JSON.parse(storage.get("money_diary_entries"))[0].income, 10);
assert.equal(warnings.length, 1);

console.log("App change log storage limits passed.");
