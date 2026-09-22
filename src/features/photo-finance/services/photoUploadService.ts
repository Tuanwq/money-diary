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
  const displayBytes = await image.display.arrayBuffer();
  const thumbnailBytes = await image.thumbnail.arrayBuffer();
  for (const [path, bytes] of [
    [storagePath, displayBytes],
    [thumbnailPath, thumbnailBytes],
  ] as const) {
    await retryPhotoOperation(async () => {
      const result = await upload(path, bytes);
      if (result.error) throw result.error;
    }, 2);
  }
}
