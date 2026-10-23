import type { AccountLedgerData } from "../../account-ledger/accountLedgerModel.ts";
import type { SavingsAllocation } from "./savingsModel.ts";

type SavingsBalanceLedger = Pick<AccountLedgerData, "savingsAllocations" | "transactions">;

export function isSavedSavingsResult(item: SavingsAllocation) {
  return item.status === "allocated" || item.status === "transferred" ||
    (item.status === "needs_recalculation" &&
      (item.previousStatus === "allocated" || item.previousStatus === "transferred"));
}

/** The visible deduction belongs to the source for a reserve, or the destination for a transfer. */
export function getSavingsHeldByAccount(ledger: SavingsBalanceLedger) {
  const transfers = new Map(ledger.transactions.map((item) => [item.id, item]));
  const held = new Map<string, number>();
  for (const item of ledger.savingsAllocations ?? []) {
    if (!isSavedSavingsResult(item)) continue;
    let accountId = item.sourceAccountId;
    if (item.destination.kind === "transfer") {
      const transfer = item.transactionId ? transfers.get(item.transactionId) : undefined;
      if (transfer?.type !== "transfer" || !transfer.toAccountId) continue;
      accountId = transfer.toAccountId;
    }
    held.set(accountId, (held.get(accountId) ?? 0) + item.amount);
  }
  return held;
}

/** Display projection only; the underlying account transactions and assets stay unchanged. */
export function getSavingsHeldAmount(ledger: SavingsBalanceLedger) {
  return [...getSavingsHeldByAccount(ledger).values()].reduce((sum, amount) => sum + amount, 0);
}
