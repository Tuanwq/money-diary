import { Capacitor, registerPlugin } from "@capacitor/core";
import type { FinancialAccount } from "../../account-ledger/accountLedgerModel.ts";
import type { PhotoGalleryItem } from "./photoGalleryModel.ts";
import { buildLatestPhotoWidgetDetails } from "./photoWidgetModel.ts";
import type { createPhotoAttachmentRepository } from "./photoAttachmentRepository.ts";

type NativePhotoWidget = {
  updateLatest(options: {
    ownerId: string;
    attachmentId: string;
    transactionId: string;
    amountLabel: string;
    type: string;
    title: string;
    detail: string;
    thumbnailUrl: string;
  }): Promise<void>;
  clear(): Promise<void>;
};

const nativeWidget = registerPlugin<NativePhotoWidget>("LatestPhotoWidget");
let generation = 0;

export function isAndroidPhotoWidgetAvailable() {
  return Capacitor.getPlatform() === "android";
}

export async function clearAndroidPhotoWidget() {
  if (!isAndroidPhotoWidgetAvailable()) return;
  generation += 1;
  await nativeWidget.clear();
}

/** The Android widget caches a thumbnail only; all money still comes from the ledger transaction. */
export async function updateAndroidPhotoWidget(
  ownerId: string,
  latest: PhotoGalleryItem | undefined,
  accounts: FinancialAccount[],
  repository: ReturnType<typeof createPhotoAttachmentRepository>
) {
  if (!isAndroidPhotoWidgetAvailable()) return;
  const request = ++generation;
  if (!latest) {
    await nativeWidget.clear();
    return;
  }

  const details = buildLatestPhotoWidgetDetails(latest, accounts);
  const thumbnailUrl = await repository.signedImage(latest.attachment.thumbnailPath);
  if (request !== generation) return;
  await nativeWidget.updateLatest({
    ownerId,
    ...details,
    thumbnailUrl,
  });
}
