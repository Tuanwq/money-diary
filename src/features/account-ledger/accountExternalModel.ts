import { calculateAccountBalance, type AccountLedgerData, type FinancialAccount } from "./accountLedgerModel.ts";

export type AccountExternalType = "loaned" | "receivable" | "held_elsewhere" | "unavailable" | "other";
export const ACCOUNT_EXTERNAL_LABELS: Record<AccountExternalType, string> = {
  loaned: "Cho vay", receivable: "Cho nợ", held_elsewhere: "Tạm ở ngoài",
  unavailable: "Chưa dùng được", other: "Khác",
};

export type AccountExternalRecovery = { id: string; amount: number; date: string; createdAt: string };
export type AccountExternalEntry = {
  id: string;
  accountId: string;
  amount: number;
  type: AccountExternalType;
  note: string;
  relatedPerson?: string;
  date: string;
  expectedReturnDate?: string;
  recoveries: AccountExternalRecovery[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type AccountExternalFields = Pick<AccountExternalEntry,
  "amount" | "type" | "note" | "relatedPerson" | "date" | "expectedReturnDate">;

export type AccountExternalCommand =
  | { kind: "create"; accountId: string; id: string; now: string; fields: AccountExternalFields }
  | { kind: "update"; accountId: string; id: string; now: string; fields: AccountExternalFields }
  | { kind: "recover"; accountId: string; id: string; recoveryId: string; amount: number; date: string; now: string }
  | { kind: "delete"; accountId: string; id: string; now: string };

export function getExternalEntries(account: FinancialAccount): AccountExternalEntry[] {
  return (account.externalEntries ?? []).filter((entry) => !entry.deletedAt);
}

export function getReturnedAmount(entry: AccountExternalEntry): number {
  return (entry.recoveries ?? []).reduce((sum, recovery) => sum + recovery.amount, 0);
}

export function getExternalOutstanding(entry: AccountExternalEntry): number {
  return entry.deletedAt ? 0 : Math.max(0, entry.amount - getReturnedAmount(entry));
}

export function getExternalStatus(entry: AccountExternalEntry): "active" | "partial_returned" | "returned" {
  const returned = getReturnedAmount(entry);
  return returned >= entry.amount ? "returned" : returned > 0 ? "partial_returned" : "active";
}

export function calculateAccountExternalAmount(account: FinancialAccount): number {
  return getExternalEntries(account).reduce((sum, entry) => sum + getExternalOutstanding(entry), 0);
}

export function calculateAccountActualAvailable(account: FinancialAccount,
  transactions: AccountLedgerData["transactions"]): number {
  return Math.max(0, calculateAccountBalance(account, transactions) - calculateAccountExternalAmount(account));
}

export function calculateTotalBalance(ledger: AccountLedgerData): number {
  return ledger.accounts.filter((account) => !account.archivedAt)
    .reduce((sum, account) => sum + calculateAccountBalance(account, ledger.transactions), 0);
}

export function calculateTotalExternalAmount(ledger: AccountLedgerData): number {
  return ledger.accounts.filter((account) => !account.archivedAt)
    .reduce((sum, account) => sum + calculateAccountExternalAmount(account), 0);
}

export function calculateActualAvailableBalance(ledger: AccountLedgerData): number {
  return Math.max(0, calculateTotalBalance(ledger) - calculateTotalExternalAmount(ledger));
}

/** Existing inconsistent data stays readable, but new writes cannot deepen a shortfall. */
export function assertExternalCoverageAfterLedgerChange(before: AccountLedgerData, after: AccountLedgerData): void {
  for (const account of after.accounts) {
    const outstanding = calculateAccountExternalAmount(account);
    if (!outstanding) continue;
    const oldAccount = before.accounts.find((item) => item.id === account.id);
    const oldShortfall = oldAccount ? Math.max(0,
      calculateAccountExternalAmount(oldAccount) - calculateAccountBalance(oldAccount, before.transactions)) : 0;
    const newShortfall = Math.max(0, outstanding - calculateAccountBalance(account, after.transactions));
    if (newShortfall > oldShortfall)
      throw new Error(`Tài khoản ${account.name} không đủ tiền thực có vì còn ${outstanding.toLocaleString("vi-VN")}đ đang ở ngoài.`);
  }
}

function validateFields(fields: AccountExternalFields) {
  if (!Number.isSafeInteger(fields.amount) || fields.amount <= 0)
    throw new Error("Số tiền ở ngoài phải lớn hơn 0.");
  if (!Object.hasOwn(ACCOUNT_EXTERNAL_LABELS, fields.type)) throw new Error("Loại khoản tiền không hợp lệ.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.date) ||
    (fields.expectedReturnDate && (!/^\d{4}-\d{2}-\d{2}$/.test(fields.expectedReturnDate) || fields.expectedReturnDate < fields.date)))
    throw new Error("Ngày hoặc hạn thu hồi không hợp lệ.");
}

function assertCoverage(ledger: AccountLedgerData, account: FinancialAccount, proposed: number, previous: number, excludedId?: string) {
  const other = getExternalEntries(account).filter((entry) => entry.id !== excludedId)
    .reduce((sum, entry) => sum + getExternalOutstanding(entry), 0);
  const available = Math.max(0, calculateAccountBalance(account, ledger.transactions) - other);
  if (proposed > available && proposed > previous)
    throw new Error("Khoản ở ngoài vượt tiền còn có thể đánh dấu trong tài khoản.");
}

export function applyAccountExternalCommand(ledger: AccountLedgerData, command: AccountExternalCommand): AccountLedgerData {
  const account = ledger.accounts.find((item) => item.id === command.accountId);
  if (!account || account.archivedAt) throw new Error("Tài khoản không còn hoạt động.");
  const entries = account.externalEntries ?? [];
  const existing = entries.find((entry) => entry.id === command.id && !entry.deletedAt);
  let nextEntries: AccountExternalEntry[];
  if (command.kind === "create") {
    if (entries.some((entry) => entry.id === command.id)) return ledger;
    validateFields(command.fields);
    assertCoverage(ledger, account, command.fields.amount, 0);
    nextEntries = [...entries, { id: command.id, accountId: account.id, ...command.fields,
      note: command.fields.note.trim(), relatedPerson: command.fields.relatedPerson?.trim() || undefined,
      recoveries: [], createdAt: command.now, updatedAt: command.now }];
  } else {
    if (command.kind === "delete" && entries.some((entry) => entry.id === command.id && entry.deletedAt)) return ledger;
    if (!existing) throw new Error("Không tìm thấy khoản tiền đang ở ngoài.");
    if (command.kind === "update") {
      validateFields(command.fields);
      const returned = getReturnedAmount(existing);
      if (command.fields.amount < returned) throw new Error("Số tiền không thể nhỏ hơn phần đã thu hồi.");
      if ((existing.recoveries ?? []).some((recovery) => recovery.date < command.fields.date))
        throw new Error("Ngày đánh dấu không thể sau ngày đã thu hồi.");
      assertCoverage(ledger, account, command.fields.amount - returned, getExternalOutstanding(existing), existing.id);
      nextEntries = entries.map((entry) => entry.id === existing.id ? {
        ...entry, ...command.fields, note: command.fields.note.trim(),
        relatedPerson: command.fields.relatedPerson?.trim() || undefined, updatedAt: command.now,
      } : entry);
    } else if (command.kind === "recover") {
      if ((existing.recoveries ?? []).some((recovery) => recovery.id === command.recoveryId)) return ledger;
      if (!Number.isSafeInteger(command.amount) || command.amount <= 0 || command.amount > getExternalOutstanding(existing))
        throw new Error("Số tiền thu hồi phải lớn hơn 0 và không vượt khoản còn ở ngoài.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(command.date) || command.date < existing.date)
        throw new Error("Ngày thu hồi không thể trước ngày đánh dấu.");
      nextEntries = entries.map((entry) => entry.id === existing.id ? { ...entry,
        recoveries: [...(entry.recoveries ?? []), { id: command.recoveryId, amount: command.amount,
          date: command.date, createdAt: command.now }], updatedAt: command.now } : entry);
    } else {
      nextEntries = entries.map((entry) => entry.id === existing.id
        ? { ...entry, deletedAt: command.now, updatedAt: command.now } : entry);
    }
  }
  return { ...ledger, accounts: ledger.accounts.map((item) => item.id === account.id
    ? { ...item, externalEntries: nextEntries, updatedAt: command.now } : item) };
}
