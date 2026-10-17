import type { ProcessedPhoto } from "./photoImageProcessor.ts";
import { retryPhotoOperation } from "./photoFinanceErrors.ts";

type Upload = (path: string, bytes: ArrayBuffer) =>
  PromiseLike<{ error: unknown }>;

type UploadMode = "sequential" | "parallel";

/** Stable paths and upsert make network retries safe in either upload mode. */
export async function uploadProcessedPhotoImages(
  image: ProcessedPhoto,
  storagePath: string,
  thumbnailPath: string,
  upload: Upload,
  mode: UploadMode = "sequential",
) {
  const files = [
    [storagePath, image.display],
    [thumbnailPath, image.thumbnail],
  ] as const;
  const uploadOne = async (path: string, blob: Blob) => {
    const bytes = await blob.arrayBuffer();
    await retryPhotoOperation(async () => {
      const result = await upload(path, bytes);
      if (result.error) throw result.error;
    }, 2);
  };

  if (mode === "parallel") {
    // Wait for both requests, including a failing one, before the caller may
    // retry the same paths. This avoids overlapping upserts on a slow device.
    const results = await Promise.allSettled(files.map(([path, blob]) => uploadOne(path, blob)));
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    return;
  }
  for (const [path, blob] of files) await uploadOne(path, blob);
}
