import { createDefaultAccounts, type AccountLedgerData } from "./accountLedgerModel.ts";
import type { AccountExternalEntry } from "./accountExternalModel.ts";

function externalSignature(entry: AccountExternalEntry) {
  return JSON.stringify([entry.updatedAt, entry.amount, entry.type, entry.note,
    entry.relatedPerson, entry.date, entry.expectedReturnDate, entry.deletedAt,
    (entry.recoveries ?? []).map((recovery) => [recovery.id, recovery.amount,
      recovery.date, recovery.createdAt])]);
}

export type LedgerLoadDecision = "cloud" | "pending" | "conflict" | "empty" | "upload";

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalJson(item)]));
  return value;
}

/** A changed row revision alone is not a financial conflict. */
export function areLedgerContentsEqual(local: AccountLedgerData, cloud: AccountLedgerData) {
  const content = ({ accounts, transactions, jars, jarActivities }: AccountLedgerData) =>
    JSON.stringify(canonicalJson({ accounts, transactions, jars, jarActivities }));
  return content(local) === content(cloud);
}

export function isPristineLedger(ledger: AccountLedgerData) {
  if (ledger.transactions.length || ledger.jars.length || ledger.jarActivities.length) return false;
  if (ledger.accounts.some((account) => account.externalEntries?.length)) return false;
  const defaults = createDefaultAccounts(ledger.updatedAt);
  return ledger.accounts.length === defaults.length && ledger.accounts.every((account, index) =>
    account.id === defaults[index].id && account.name === defaults[index].name &&
    account.type === defaults[index].type && account.openingBalance === 0 && !account.archivedAt);
}

export function nextLedgerTimestamp(previous: string, now = Date.now()) {
  const previousTime = Date.parse(previous);
  return new Date(Math.max(now, Number.isFinite(previousTime) ? previousTime + 1 : now)).toISOString();
}

export function decideLedgerLoad(local: AccountLedgerData, cloud: AccountLedgerData | null,
  pendingBase: string | null | undefined): LedgerLoadDecision {
  if (pendingBase !== undefined)
    return pendingBase === (cloud?.updatedAt ?? null) ? "pending" : "conflict";
  if (cloud) return "cloud";
  return isPristineLedger(local) ? "empty" : "upload";
}

export function hasLocalOnlyRecords(local: AccountLedgerData, remote: AccountLedgerData) {
  const remoteJarIds = new Set(remote.jars.map((item) => item.id));
  const remoteTransactionIds = new Set(remote.transactions.map((item) => item.id));
  const remoteExternal = new Map(remote.accounts.flatMap((account) =>
    (account.externalEntries ?? []).map((entry) => [entry.id, externalSignature(entry)] as const)));
  return local.jars.some((item) => !remoteJarIds.has(item.id)) ||
    local.transactions.some((item) => !remoteTransactionIds.has(item.id)) ||
    local.accounts.some((account) => (account.externalEntries ?? []).some((entry) =>
      remoteExternal.get(entry.id) !== externalSignature(entry)));
}
