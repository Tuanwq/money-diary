import assert from "node:assert/strict";
import { mergeMoneySyncSnapshots } from "../src/features/offline-sync/offlineSyncModel.ts";

const goals = {
  dailyIncome: 400000,
  dailyHours: 6,
  weeklyIncome: 2500000,
  weeklyHours: 36,
  monthlyIncome: 12000000,
  monthlyHours: 150,
  bigGoalName: "Quỹ dự phòng",
  bigGoalTarget: 30000000,
  bigGoalSaved: 10000000,
  bigGoalDeadline: "2026-12-31",
  bigGoalStartDate: "2026-01-01",
  subGoals: [],
};

const entry = {
  id: "entry-1",
  date: "2026-08-01",
  diary: "Ca sáng",
  income: 100000,
  receivedMoney: 0,
  bonusMoney: 0,
  orderCount: 5,
  workHours: 2,
  mood: "normal",
  note: "",
  createdAt: "2026-08-01T01:00:00.000Z",
  updatedAt: "2026-08-01T01:00:00.000Z",
};

const base = {
  balanceChecks: [],
  completedGoals: [],
  entries: [entry],
  expenses: [],
  goals,
};

const deletedLocally = mergeMoneySyncSnapshots(
  base,
  { ...base, entries: [] },
  base
);
assert.deepEqual(deletedLocally.snapshot.entries, []);
assert.equal(deletedLocally.conflicts, 0);

const localEdit = {
  ...entry,
  income: 150000,
  updatedAt: "2026-08-01T03:00:00.000Z",
};
const remoteEdit = {
  ...entry,
  income: 120000,
  updatedAt: "2026-08-01T02:00:00.000Z",
};
const concurrentEdit = mergeMoneySyncSnapshots(
  base,
  { ...base, entries: [localEdit] },
  { ...base, entries: [remoteEdit] }
);
assert.equal(concurrentEdit.snapshot.entries[0]?.income, 150000);
assert.equal(concurrentEdit.conflicts, 1);

const remoteOnlyGoalChange = mergeMoneySyncSnapshots(
  base,
  base,
  { ...base, goals: { ...goals, bigGoalSaved: 11000000 } }
);
assert.equal(remoteOnlyGoalChange.snapshot.goals.bigGoalSaved, 11000000);

console.log("Offline sync merge tests passed.");
