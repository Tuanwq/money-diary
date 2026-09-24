import type { ProcessedPhoto } from "./photoImageProcessor.ts";
import { retryPhotoOperation } from "./photoFinanceErrors.ts";

type Upload = (path: string, bytes: ArrayBuffer) =>
  PromiseLike<{ error: unknown }>;

/** Upload small JPEGs in order. Stable paths and upsert make network retries idempotent. */
export async function uploadProcessedPhotoImages(
  image: ProcessedPhoto,
  storagePath: string,
  thumbnailPath: string,
  upload: Upload,
) {
  for (const [path, blob] of [
    [storagePath, image.display],
    [thumbnailPath, image.thumbnail],
  ] as const) {
    const bytes = await blob.arrayBuffer();
    await retryPhotoOperation(async () => {
      const result = await upload(path, bytes);
      if (result.error) throw result.error;
    }, 2);
  }
}
