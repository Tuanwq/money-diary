import { createDefaultAccounts, type AccountLedgerData } from "./accountLedgerModel.ts";

export function isPristineLedger(ledger: AccountLedgerData) {
  if (ledger.transactions.length || ledger.jars.length || ledger.jarActivities.length) return false;
  const defaults = createDefaultAccounts(ledger.updatedAt);
  return ledger.accounts.length === defaults.length && ledger.accounts.every((account, index) =>
    account.id === defaults[index].id && account.name === defaults[index].name &&
    account.type === defaults[index].type && account.openingBalance === 0 && !account.archivedAt);
}

function mergeById<T extends { id: string; updatedAt?: string }>(remote: T[], local: T[]) {
  const merged = new Map(remote.map((item) => [item.id, item]));
  for (const item of local) {
    const previous = merged.get(item.id);
    if (!previous || (item.updatedAt ?? "") > (previous.updatedAt ?? ""))
      merged.set(item.id, item);
  }
  return [...merged.values()];
}

/** Used once when a device has offline jars but the newly migrated cloud row has none. */
export function reconcileJarLedger(local: AccountLedgerData, remote: AccountLedgerData,
  now = new Date().toISOString()): AccountLedgerData {
  if (local.jars.length === 0 && local.jarActivities.length === 0) return remote;
  if (remote.jars.length > 0 || remote.jarActivities.length > 0) return remote;
  return {
    accounts: mergeById(remote.accounts, local.accounts),
    transactions: mergeById(remote.transactions, local.transactions),
    jars: local.jars,
    jarActivities: local.jarActivities,
    updatedAt: now,
  };
}
