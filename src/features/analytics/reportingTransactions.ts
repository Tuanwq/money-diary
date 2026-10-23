import { isSavingsTransfer, type AccountTransaction } from "../account-ledger/accountLedgerModel.ts";

/** Legacy diary amounts may already be represented by older, untagged ledger rows.
 * Only rows with an explicit, independent write source can safely join reports. */
export function isIndependentReportingTransaction(transaction: AccountTransaction) {
  if (isSavingsTransfer(transaction)) return false;
  return transaction.source === "photo_finance" ||
    transaction.source === "spending_jar" ||
    transaction.source === "manual";
}

export function getReportingTransactions(transactions: AccountTransaction[]) {
  return transactions.filter(isIndependentReportingTransaction);
}
