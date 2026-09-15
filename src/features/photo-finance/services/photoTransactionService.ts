import { createPhotoAttachmentRepository } from "./photoAttachmentRepository.ts";

/** Money deletion remains with Account Ledger; images are independent attachments. */
export async function deleteAccountTransactionWithPhotos(
  transactionId: string,
  ownerId: string | undefined,
  deleteTransaction: (transactionId: string) => void
) {
  deleteTransaction(transactionId);
  if (ownerId) await createPhotoAttachmentRepository().deleteForTransaction(ownerId, transactionId);
}
