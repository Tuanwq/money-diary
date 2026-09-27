import type { AccountTransaction } from "../account-ledger/accountLedgerModel";

/** Legacy diary amounts may already be represented by older, untagged ledger rows.
 * Only rows with an explicit, independent write source can safely join reports. */
export function isIndependentReportingTransaction(transaction: AccountTransaction) {
  return transaction.source === "photo_finance" ||
    transaction.source === "spending_jar" ||
    transaction.source === "manual";
}

export function getReportingTransactions(transactions: AccountTransaction[]) {
  return transactions.filter(isIndependentReportingTransaction);
}
