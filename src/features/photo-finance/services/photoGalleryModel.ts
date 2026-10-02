import type { AccountTransaction } from "../../account-ledger/accountLedgerModel.ts";
import type { PhotoAttachment } from "../types/photoFinance.ts";

export type PhotoGalleryItem = {
  attachment: PhotoAttachment;
  transaction: AccountTransaction;
};

/** Every tile references its existing transaction; image rows never own money. */
export function buildPhotoGalleryItems(
  attachments: PhotoAttachment[],
  transactions: AccountTransaction[]
): PhotoGalleryItem[] {
  const transactionsById = new Map(transactions.map((transaction) => [transaction.id, transaction]));
  return attachments.flatMap((attachment) => {
    if (attachment.sourceType !== "account_transaction") return [];
    const transaction = transactionsById.get(attachment.sourceId);
    return transaction ? [{ attachment, transaction }] : [];
  }).sort((left, right) =>
    right.attachment.createdAt.localeCompare(left.attachment.createdAt) ||
    right.attachment.id.localeCompare(left.attachment.id));
}

export function getPhotoMoneyLabel(transaction: AccountTransaction): string {
  const amount = new Intl.NumberFormat("vi-VN").format(transaction.amount);
  return transaction.type === "income" ? `+${amount}đ`
    : transaction.type === "expense" ? `−${amount}đ` : `↔ ${amount}đ`;
}
