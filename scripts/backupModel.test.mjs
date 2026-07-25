import assert from "node:assert/strict";
import {
  getBackupPeriodKey,
  getExpiredBackupIds,
  mergeBackupRecords,
} from "../src/features/backup/backupModel.ts";

function record(kind, index) {
  const date = new Date(Date.UTC(2026, 6, index + 1));
  const id = `${kind}-${index}`;

  return {
    createdAt: date.toISOString(),
    id,
    kind,
    label: kind,
    ownerId: "user-1",
    periodKey: `${kind}-${index}`,
    snapshot: {},
    summary: {},
    updatedAt: date.toISOString(),
  };
}

assert.equal(
  getBackupPeriodKey("daily", new Date(2026, 6, 25)),
  "2026-07-25"
);
assert.equal(
  getBackupPeriodKey("monthly", new Date(2026, 6, 25)),
  "2026-07"
);
assert.equal(
  getBackupPeriodKey("weekly", new Date(2026, 6, 25)),
  "2026-W30"
);

const records = [
  ...Array.from({ length: 8 }, (_, index) => record("daily", index)),
  ...Array.from({ length: 5 }, (_, index) => record("weekly", index)),
  ...Array.from({ length: 7 }, (_, index) => record("monthly", index)),
  ...Array.from({ length: 6 }, (_, index) => record("safety", index)),
];
const expired = getExpiredBackupIds(records);

assert.equal(expired.includes("daily-0"), true);
assert.equal(expired.includes("weekly-0"), true);
assert.equal(expired.includes("monthly-0"), true);
assert.equal(expired.includes("safety-0"), true);
assert.equal(expired.length, 4);

const local = record("manual", 1);
const cloud = { ...local, updatedAt: "2026-07-25T10:00:00.000Z" };
const merged = mergeBackupRecords([local], [cloud]);

assert.equal(merged.length, 1);
assert.equal(merged[0].location, "both");
assert.equal(merged[0].updatedAt, cloud.updatedAt);

console.log("Backup model tests passed.");
