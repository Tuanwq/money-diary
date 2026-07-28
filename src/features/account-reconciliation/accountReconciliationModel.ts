import type {
  AccountTransaction,
  FinancialAccount,
} from "../account-ledger/accountLedgerModel";

export const ACCOUNT_RECONCILIATION_STORAGE_KEY =
  "money_diary_account_reconciliations";

export type ReconciliationReason =
  | "unrecorded_income"
  | "refund_bonus"
  | "internal_transfer"
  | "cash_movement"
  | "driver_pending"
  | "missing_expense"
  | "duplicate_transaction"
  | "unknown";

export type AccountReconciliationLine = {
  accountId: string;
  accountName: string;
  actualBalance: number;
  adjustmentTransactionId?: string;
  adjustedAt?: string;
  difference: number;
  expectedBalance: number;
  note: string;
  reason: ReconciliationReason;
};

export type AccountReconciliation = {
  createdAt: string;
  date: string;
  id: string;
  lines: AccountReconciliationLine[];
  note: string;
  updatedAt: string;
};

export type AccountReconciliationData = {
  checks: AccountReconciliation[];
  updatedAt: string;
};

export const RECONCILIATION_REASON_LABELS: Record<
  ReconciliationReason,
  string
> = {
  unrecorded_income: "Thu nhập chưa ghi",
  refund_bonus: "Hoàn tiền hoặc tiền cộng thêm",
  internal_transfer: "Chuyển tiền giữa các tài khoản",
  cash_movement: "Nạp hoặc rút tiền mặt",
  driver_pending: "Ví Driver đang chờ đối soát",
  missing_expense: "Chi tiêu chưa ghi",
  duplicate_transaction: "Giao dịch bị ghi trùng",
  unknown: "Chưa rõ nguyên nhân",
};

export function createDefaultReconciliationData(): AccountReconciliationData {
  return {
    checks: [],
    updatedAt: new Date().toISOString(),
  };
}

export function calculateReconciliationDifference(
  actualBalance: number,
  expectedBalance: number
) {
  return actualBalance - expectedBalance;
}

export function getReconciliationStatus(difference: number) {
  if (difference > 0) return "surplus" as const;
  if (difference < 0) return "shortage" as const;
  return "balanced" as const;
}

export function buildReconciliationLine({
  account,
  actualBalance,
  expectedBalance,
  note = "",
  reason = "unknown",
}: {
  account: FinancialAccount;
  actualBalance: number;
  expectedBalance: number;
  note?: string;
  reason?: ReconciliationReason;
}): AccountReconciliationLine {
  return {
    accountId: account.id,
    accountName: account.name,
    actualBalance,
    difference: calculateReconciliationDifference(
      actualBalance,
      expectedBalance
    ),
    expectedBalance,
    note: note.trim(),
    reason,
  };
}

export function canCreateReconciliationAdjustment(
  line: AccountReconciliationLine
) {
  return (
    line.difference !== 0 &&
    !line.adjustmentTransactionId &&
    line.reason !== "unknown" &&
    line.reason !== "internal_transfer"
  );
}

export function createReconciliationAdjustmentTransaction(
  check: AccountReconciliation,
  line: AccountReconciliationLine,
  now = new Date().toISOString()
): AccountTransaction | null {
  if (!canCreateReconciliationAdjustment(line)) return null;

  return {
    accountId: line.accountId,
    amount: Math.abs(line.difference),
    category: "Điều chỉnh kiểm kê",
    createdAt: now,
    date: check.date,
    id: `reconciliation:${check.id}:${line.accountId}`,
    note: [
      RECONCILIATION_REASON_LABELS[line.reason],
      line.note,
      `Kiểm kê ${check.date}`,
    ]
      .filter(Boolean)
      .join(" · "),
    type: line.difference > 0 ? "income" : "expense",
    updatedAt: now,
  };
}

export function getReconciliationTotals(lines: AccountReconciliationLine[]) {
  return lines.reduce(
    (summary, line) => ({
      actual: summary.actual + line.actualBalance,
      difference: summary.difference + line.difference,
      expected: summary.expected + line.expectedBalance,
      unresolved:
        summary.unresolved +
        (line.difference !== 0 && !line.adjustmentTransactionId ? 1 : 0),
    }),
    { actual: 0, difference: 0, expected: 0, unresolved: 0 }
  );
}

export function isAccountReconciliationData(
  value: unknown
): value is AccountReconciliationData {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<AccountReconciliationData>;

  return Array.isArray(candidate.checks) && typeof candidate.updatedAt === "string";
}
