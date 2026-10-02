import type { FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import type { PhotoGalleryItem } from "./photoGalleryModel.ts";
import { getPhotoMoneyLabel } from "./photoGalleryModel.ts";

export function buildLatestPhotoWidgetDetails(item: PhotoGalleryItem, accounts: FinancialAccount[]) {
  const { attachment, transaction } = item;
  const names = new Map(accounts.map((account) => [account.id, account.name]));
  const accountName = names.get(transaction.accountId) ?? "Tài khoản";
  const destination = transaction.toAccountId
    ? names.get(transaction.toAccountId) ?? "Tài khoản" : "";
  const time = transaction.occurredAt
    ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" })
      .format(new Date(transaction.occurredAt)) : transaction.date.slice(5).split("-").reverse().join("/");
  return {
    attachmentId: attachment.id,
    transactionId: transaction.id,
    amountLabel: getPhotoMoneyLabel(transaction),
    type: transaction.type,
    title: transaction.note || transaction.category || (transaction.type === "transfer" ? "Chuyển nội bộ" : "Giao dịch"),
    detail: transaction.type === "transfer" ? `${accountName} ↔ ${destination} · ${time}` : `${accountName} · ${time}`,
  };
}
