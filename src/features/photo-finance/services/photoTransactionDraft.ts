import {
  getDefaultTransactionPurpose, TRANSACTION_CATEGORIES,
  type AccountTransaction, type AccountTransactionType,
  type FinancialAccount, type TransactionPurpose,
} from "../../account-ledger/accountLedgerModel.ts";
import { vietnamOccurredAt } from "./photoFinanceModel.ts";

/** One ledger record owns both sides of a transfer and all its photo attachments. */
export function buildPhotoTransaction(input: {
  id: string;
  accounts: FinancialAccount[];
  existing?: AccountTransaction;
  type: AccountTransactionType;
  amount: number;
  accountId: string;
  toAccountId?: string;
  category: string;
  purpose: TransactionPurpose;
  date: string;
  time: string;
  note: string;
  now: string;
}): AccountTransaction {
  const activeAccount = (id?: string) => input.accounts.some(
    (account) => account.id === id && !account.archivedAt
  );
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0)
    throw new Error("Số tiền phải là số nguyên dương.");
  if (!activeAccount(input.accountId))
    throw new Error("Hãy chọn tài khoản nhận hoặc trả tiền.");
  if (input.type === "transfer") {
    if (!activeAccount(input.toAccountId))
      throw new Error("Hãy chọn tài khoản nhận tiền đang hoạt động.");
    if (input.accountId === input.toAccountId)
      throw new Error("Tài khoản nhận phải khác tài khoản chuyển.");
  }
  if (!TRANSACTION_CATEGORIES[input.type].includes(input.category))
    throw new Error("Danh mục không hợp lệ.");

  return {
    ...input.existing,
    id: input.id,
    accountId: input.accountId,
    toAccountId: input.type === "transfer" ? input.toAccountId : undefined,
    amount: input.amount,
    category: input.category,
    type: input.type,
    purpose: input.type === "expense" && input.purpose === "goal_allocation"
      ? "goal_allocation" : getDefaultTransactionPurpose(input.type),
    date: input.date,
    occurredAt: vietnamOccurredAt(input.date, input.time),
    note: input.note.trim(),
    source: input.existing ? input.existing.source : "photo_finance",
    createdAt: input.existing?.createdAt ?? input.now,
    updatedAt: input.now,
  };
}
