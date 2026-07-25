import type {
  AppChangeLog,
  BalanceCheckEntry,
  CompletedGoal,
  DailyEntry,
  ExpenseEntry,
  Goals,
} from "../../types";
import type {
  HubChangeLog,
  HubEntry,
  HubSettings,
} from "../../types/hub";
import type {
  AccountTransaction,
  FinancialAccount,
} from "../account-ledger/accountLedgerModel";
import type {
  AutomationRule,
  AutomationRunLog,
} from "../automation/automationModel";
import type { CashFlowPlan } from "../cash-flow/cashFlowForecastModel";

export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_FILE_FORMAT = "money-diary-backup";

export type BackupSection =
  | "journal"
  | "goals"
  | "hub"
  | "accounts"
  | "automation"
  | "cashFlow";

export type BackupKind =
  | "daily"
  | "weekly"
  | "monthly"
  | "manual"
  | "imported"
  | "safety";

export type BackupJournalData = {
  appChangeLogs: AppChangeLog[];
  balanceChecks: BalanceCheckEntry[];
  entries: DailyEntry[];
  expenses: ExpenseEntry[];
  otherExpenseLabels: string[];
};

export type BackupGoalData = {
  completedGoals: CompletedGoal[];
  goals: Goals;
};

export type BackupHubData = {
  calculator: Record<string, unknown>;
  changeLogs: HubChangeLog[];
  entries: HubEntry[];
  settings: HubSettings;
};

export type BackupSourceData = {
  accounts: {
    accounts: FinancialAccount[];
    transactions: AccountTransaction[];
  };
  automation: {
    logs: AutomationRunLog[];
    processedKeys: string[];
    rules: AutomationRule[];
  };
  cashFlow: {
    plans: CashFlowPlan[];
  };
  goals: BackupGoalData;
  hub: BackupHubData;
  journal: BackupJournalData;
};

export type BackupSummary = {
  accountTransactions: number;
  automationRules: number;
  automationRuns: number;
  balanceChecks: number;
  cashFlowPlans: number;
  completedGoals: number;
  expenses: number;
  hubShifts: number;
  journalEntries: number;
  financialAccounts: number;
  subGoals: number;
};

export type BackupSnapshot = {
  appVersion: string;
  createdAt: string;
  data: BackupSourceData;
  format: typeof BACKUP_FILE_FORMAT;
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
};

export type BackupRecord = {
  createdAt: string;
  id: string;
  kind: BackupKind;
  label: string;
  ownerId: string;
  periodKey: string | null;
  snapshot: BackupSnapshot;
  summary: BackupSummary;
  updatedAt: string;
};

export type BackupStorageLocation = "both" | "cloud" | "device";

export type BackupListItem = BackupRecord & {
  location: BackupStorageLocation;
};

export type BackupExportEnvelope = {
  backup: BackupRecord;
  exportedAt: string;
  format: "money-diary-backup-export";
};

const RETENTION_LIMITS: Record<BackupKind, number> = {
  daily: 7,
  weekly: 4,
  monthly: 6,
  manual: 20,
  imported: 10,
  safety: 5,
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function getIsoWeekKey(date: Date) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  return `${copy.getUTCFullYear()}-W${pad(week)}`;
}

export function getBackupPeriodKey(kind: BackupKind, date: Date) {
  if (kind === "daily") return getLocalDateKey(date);
  if (kind === "weekly") return getIsoWeekKey(date);
  if (kind === "monthly") {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  }

  return null;
}

export function getBackupKindLabel(kind: BackupKind) {
  const labels: Record<BackupKind, string> = {
    daily: "Bản ngày",
    weekly: "Bản tuần",
    monthly: "Bản tháng",
    manual: "Backup thủ công",
    imported: "Backup đã nhập",
    safety: "Trước khi khôi phục",
  };

  return labels[kind];
}

export function getBackupSummary(data: BackupSourceData): BackupSummary {
  return {
    accountTransactions: data.accounts.transactions.length,
    automationRules: data.automation.rules.length,
    automationRuns: data.automation.logs.length,
    balanceChecks: data.journal.balanceChecks.length,
    cashFlowPlans: data.cashFlow?.plans?.length ?? 0,
    completedGoals: data.goals.completedGoals.length,
    expenses: data.journal.expenses.length,
    hubShifts: data.hub.entries.length,
    journalEntries: data.journal.entries.length,
    financialAccounts: data.accounts.accounts.length,
    subGoals: data.goals.goals.subGoals?.length ?? 0,
  };
}

export function createBackupSnapshot(
  source: BackupSourceData,
  createdAt = new Date()
): BackupSnapshot {
  return {
    appVersion:
      typeof __APP_BUILD_INFO__ === "undefined"
        ? "1.0.0"
        : __APP_BUILD_INFO__.version,
    createdAt: createdAt.toISOString(),
    data: cloneJson(source),
    format: BACKUP_FILE_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
  };
}

export function createBackupRecord({
  kind,
  ownerId,
  snapshot,
}: {
  kind: BackupKind;
  ownerId: string;
  snapshot: BackupSnapshot;
}): BackupRecord {
  const date = new Date(snapshot.createdAt);
  const periodKey = getBackupPeriodKey(kind, date);
  const suffix = periodKey ?? crypto.randomUUID();
  const id = `${ownerId}:${kind}:${suffix}`;

  return {
    createdAt: snapshot.createdAt,
    id,
    kind,
    label: getBackupKindLabel(kind),
    ownerId,
    periodKey,
    snapshot,
    summary: getBackupSummary(snapshot.data),
    updatedAt: snapshot.createdAt,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isSnapshot(value: unknown): value is BackupSnapshot {
  if (!isObject(value)) return false;

  const data = value.data;

  if (
    value.format !== BACKUP_FILE_FORMAT ||
    value.schemaVersion !== BACKUP_SCHEMA_VERSION ||
    typeof value.createdAt !== "string" ||
    !isObject(data) ||
    !isObject(data.journal) ||
    !isObject(data.goals) ||
    !isObject(data.hub)
  ) {
    return false;
  }

  return (
    Array.isArray(data.journal.entries) &&
    Array.isArray(data.journal.expenses) &&
    Array.isArray(data.journal.balanceChecks) &&
    Array.isArray(data.goals.completedGoals) &&
    isObject(data.goals.goals) &&
    Array.isArray(data.hub.entries) &&
    isObject(data.hub.settings)
  );
}

function normalizeSnapshot(snapshot: BackupSnapshot): BackupSnapshot {
  const source = snapshot.data;

  return {
    ...cloneJson(snapshot),
    data: {
      accounts: {
        accounts: Array.isArray(source.accounts?.accounts)
          ? source.accounts.accounts
          : [],
        transactions: Array.isArray(source.accounts?.transactions)
          ? source.accounts.transactions
          : [],
      },
      automation: {
        logs: Array.isArray(source.automation?.logs)
          ? source.automation.logs
          : [],
        processedKeys: Array.isArray(source.automation?.processedKeys)
          ? source.automation.processedKeys
          : [],
        rules: Array.isArray(source.automation?.rules)
          ? source.automation.rules
          : [],
      },
      cashFlow: {
        plans: Array.isArray(source.cashFlow?.plans)
          ? source.cashFlow.plans
          : [],
      },
      journal: {
        appChangeLogs: Array.isArray(source.journal.appChangeLogs)
          ? source.journal.appChangeLogs
          : [],
        balanceChecks: source.journal.balanceChecks,
        entries: source.journal.entries,
        expenses: source.journal.expenses,
        otherExpenseLabels: Array.isArray(source.journal.otherExpenseLabels)
          ? source.journal.otherExpenseLabels
          : [],
      },
      goals: {
        completedGoals: source.goals.completedGoals,
        goals: source.goals.goals,
      },
      hub: {
        calculator: isObject(source.hub.calculator)
          ? source.hub.calculator
          : {},
        changeLogs: Array.isArray(source.hub.changeLogs)
          ? source.hub.changeLogs
          : [],
        entries: source.hub.entries,
        settings: source.hub.settings,
      },
    },
  };
}

export function parseBackupFile(
  raw: string,
  ownerId: string
): BackupRecord {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("File backup không phải JSON hợp lệ.");
  }

  const candidate =
    isObject(parsed) && parsed.format === "money-diary-backup-export"
      ? parsed.backup
      : parsed;
  const snapshotCandidate =
    isObject(candidate) && "snapshot" in candidate
      ? candidate.snapshot
      : candidate;

  if (!isSnapshot(snapshotCandidate)) {
    throw new Error(
      "File không đúng định dạng backup Money Diary hoặc dùng phiên bản chưa hỗ trợ."
    );
  }

  const snapshot = normalizeSnapshot(snapshotCandidate);

  return createBackupRecord({
    kind: "imported",
    ownerId,
    snapshot: {
      ...snapshot,
      createdAt: new Date().toISOString(),
    },
  });
}

export function createBackupExport(record: BackupRecord): BackupExportEnvelope {
  return {
    backup: cloneJson(record),
    exportedAt: new Date().toISOString(),
    format: "money-diary-backup-export",
  };
}

export function getExpiredBackupIds(records: BackupRecord[]) {
  const expired = new Set<string>();

  (Object.keys(RETENTION_LIMITS) as BackupKind[]).forEach((kind) => {
    records
      .filter((record) => record.kind === kind)
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime()
      )
      .slice(RETENTION_LIMITS[kind])
      .forEach((record) => expired.add(record.id));
  });

  return [...expired];
}

export function mergeBackupRecords(
  deviceRecords: BackupRecord[],
  cloudRecords: BackupRecord[]
): BackupListItem[] {
  const merged = new Map<string, BackupListItem>();

  deviceRecords.forEach((record) => {
    merged.set(record.id, { ...record, location: "device" });
  });

  cloudRecords.forEach((record) => {
    const local = merged.get(record.id);
    const newest =
      local &&
      new Date(local.updatedAt).getTime() > new Date(record.updatedAt).getTime()
        ? local
        : record;

    merged.set(record.id, {
      ...newest,
      location: local ? "both" : "cloud",
    });
  });

  return [...merged.values()].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() -
      new Date(left.updatedAt).getTime()
  );
}
