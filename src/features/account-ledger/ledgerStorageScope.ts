import { ACCOUNT_LEDGER_STORAGE_KEY } from "./accountLedgerModel.ts";
import type { ExpenseBudget } from "../../types.ts";

export const PENDING_LEDGER_KEY = `${ACCOUNT_LEDGER_STORAGE_KEY}:pending`;

export function ledgerKey(userId?: string) {
  return userId ? `${ACCOUNT_LEDGER_STORAGE_KEY}:user:${userId}` : ACCOUNT_LEDGER_STORAGE_KEY;
}

export function pendingKey(userId?: string) {
  return userId ? `${PENDING_LEDGER_KEY}:user:${userId}` : PENDING_LEDGER_KEY;
}

/** An unscoped legacy cache may be recovered only for its recorded pending owner. */
export function selectLocalLedgerValue(userId: string | undefined, scoped: string | null,
  legacy: string | null, pendingOwner: string | null) {
  if (scoped !== null) return scoped;
  return userId && pendingOwner === userId ? legacy : null;
}

export function selectTrustedLegacyBudgets(userId: string | undefined, cloudEnabled: boolean,
  remote: { userId: string; budgets: ExpenseBudget[] } | null, local: ExpenseBudget[] | undefined) {
  if (!cloudEnabled) return local;
  return userId && remote?.userId === userId ? remote.budgets : undefined;
}
