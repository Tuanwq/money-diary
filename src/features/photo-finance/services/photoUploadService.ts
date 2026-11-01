import type { ProcessedPhoto } from "./photoImageProcessor.ts";
import { retryPhotoOperation } from "./photoFinanceErrors.ts";
import type { PhotoSaveTrace, PhotoSaveStage } from "./photoSaveTrace.ts";

type Upload = (path: string, bytes: ArrayBuffer) =>
  PromiseLike<{ error: unknown }>;

type UploadMode = "sequential" | "parallel";

// Most compressed camera images fit under this limit. Two short requests can
// overlap without making Safari hold multiple large uploads in memory.
export function photoUploadModeForSize(totalBytes: number): UploadMode {
  return totalBytes <= 2_000_000 ? "parallel" : "sequential";
}

/** Stable paths and upsert make network retries safe in either upload mode. */
export async function uploadProcessedPhotoImages(
  image: ProcessedPhoto,
  storagePath: string,
  thumbnailPath: string,
  upload: Upload,
  mode: UploadMode = "sequential",
  trace?: PhotoSaveTrace,
  completedPaths?: Set<string>,
) {
  const files = [
    [storagePath, image.display, "display"],
    [thumbnailPath, image.thumbnail, "thumbnail"],
  ] as const;
  const uploadOne = async (path: string, blob: Blob, stage: PhotoSaveStage) => {
    if (completedPaths?.has(path)) return;
    let bytes: ArrayBuffer | undefined;
    await retryPhotoOperation(async () => {
      const attempt = async () => {
        bytes ??= await blob.arrayBuffer();
        const result = await upload(path, bytes);
        if (result.error) throw result.error;
      };
      if (trace) await trace.measure(stage, attempt, blob.size);
      else await attempt();
    }, 2);
    completedPaths?.add(path);
  };

  if (mode === "parallel") {
    // Wait for both requests, including a failing one, before the caller may
    // retry the same paths. This avoids overlapping upserts on a slow device.
    const results = await Promise.allSettled(files.map(([path, blob, stage]) => uploadOne(path, blob, stage)));
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    return;
  }
  for (const [path, blob, stage] of files) await uploadOne(path, blob, stage);
}
