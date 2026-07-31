import type {
  BalanceCheckEntry,
  CompletedGoal,
  DailyEntry,
  ExpenseBudget,
  ExpenseEntry,
  Goals,
  SubGoal,
} from "../../types";

export type MoneySyncSnapshot = {
  balanceChecks: BalanceCheckEntry[];
  completedGoals: CompletedGoal[];
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  goals: Goals;
};

export type MoneySyncMergeResult = {
  conflicts: number;
  snapshot: MoneySyncSnapshot;
};

function isEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getRecordTime(record: unknown) {
  if (!record || typeof record !== "object") return 0;

  const value = record as {
    completedAt?: string;
    createdAt?: string;
    updatedAt?: string;
  };

  return new Date(
    value.updatedAt ??
      value.completedAt ??
      value.createdAt ??
      "1970-01-01T00:00:00.000Z"
  ).getTime();
}

function mergeValue<T>(
  base: T,
  local: T,
  remote: T,
  onConflict: () => void
) {
  if (isEqual(local, remote)) return local;
  if (isEqual(local, base)) return remote;
  if (isEqual(remote, base)) return local;

  onConflict();
  return local;
}

function mergeRecord<T>(
  base: T | undefined,
  local: T | undefined,
  remote: T | undefined,
  onConflict: () => void
) {
  if (isEqual(local, remote)) return local;
  if (isEqual(local, base)) return remote;
  if (isEqual(remote, base)) return local;

  onConflict();

  // Không xóa một bản ghi vừa được thiết bị khác cập nhật. Ngược lại, thay đổi
  // local vẫn được giữ nếu cloud chỉ xóa phiên bản cũ.
  if (!local && remote) return remote;
  if (local && !remote) return local;
  if (!local || !remote) return local ?? remote;

  return getRecordTime(local) >= getRecordTime(remote) ? local : remote;
}

function mergeRecordArray<T>(
  baseItems: T[],
  localItems: T[],
  remoteItems: T[],
  getKey: (item: T) => string,
  onConflict: () => void
) {
  const base = new Map(baseItems.map((item) => [getKey(item), item]));
  const local = new Map(localItems.map((item) => [getKey(item), item]));
  const remote = new Map(remoteItems.map((item) => [getKey(item), item]));
  const keys = new Set([...base.keys(), ...local.keys(), ...remote.keys()]);
  const merged: T[] = [];

  keys.forEach((key) => {
    const record = mergeRecord(
      base.get(key),
      local.get(key),
      remote.get(key),
      onConflict
    );

    if (record) merged.push(record);
  });

  return merged;
}

function mergeGoals(
  base: Goals,
  local: Goals,
  remote: Goals,
  onConflict: () => void
) {
  const scalarKeys: Array<Exclude<keyof Goals, "subGoals" | "expenseBudgets">> = [
    "dailyIncome",
    "dailyHours",
    "weeklyIncome",
    "weeklyHours",
    "monthlyIncome",
    "monthlyHours",
    "bigGoalName",
    "bigGoalTarget",
    "bigGoalSaved",
    "bigGoalDeadline",
    "bigGoalStartDate",
  ];
  const merged = { ...local };

  scalarKeys.forEach((key) => {
    merged[key] = mergeValue(
      base[key],
      local[key],
      remote[key],
      onConflict
    ) as never;
  });

  merged.subGoals = mergeRecordArray<SubGoal>(
    base.subGoals ?? [],
    local.subGoals ?? [],
    remote.subGoals ?? [],
    (goal) => goal.id,
    onConflict
  );
  merged.expenseBudgets = mergeRecordArray<ExpenseBudget>(
    base.expenseBudgets ?? [],
    local.expenseBudgets ?? [],
    remote.expenseBudgets ?? [],
    (budget) => budget.id,
    onConflict
  );

  return merged;
}

export function areMoneySyncSnapshotsEqual(
  left: MoneySyncSnapshot,
  right: MoneySyncSnapshot
) {
  return isEqual(left, right);
}

export function mergeMoneySyncSnapshots(
  base: MoneySyncSnapshot,
  local: MoneySyncSnapshot,
  remote: MoneySyncSnapshot
): MoneySyncMergeResult {
  let conflicts = 0;
  const markConflict = () => {
    conflicts += 1;
  };
  const snapshot: MoneySyncSnapshot = {
    entries: mergeRecordArray(
      base.entries,
      local.entries,
      remote.entries,
      (entry) => entry.date,
      markConflict
    ).sort((a, b) => b.date.localeCompare(a.date)),
    expenses: mergeRecordArray(
      base.expenses,
      local.expenses,
      remote.expenses,
      (expense) => expense.date,
      markConflict
    ).sort((a, b) => b.date.localeCompare(a.date)),
    balanceChecks: mergeRecordArray(
      base.balanceChecks,
      local.balanceChecks,
      remote.balanceChecks,
      (check) => check.date,
      markConflict
    ).sort((a, b) => b.date.localeCompare(a.date)),
    completedGoals: mergeRecordArray(
      base.completedGoals,
      local.completedGoals,
      remote.completedGoals,
      (goal) => goal.id,
      markConflict
    ),
    goals: mergeGoals(base.goals, local.goals, remote.goals, markConflict),
  };

  return {
    conflicts,
    snapshot,
  };
}
