export type ProcessedPhoto = {
  display: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
};

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export function isIosPhotoEnvironment(userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent,
  touchPoints = typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints) {
  return /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && touchPoints > 1);
}

export function photoProcessingProfile(ios: boolean) {
  return ios
    ? { displayEdge: 1440, thumbnailEdge: 256, displayQuality: 0.72, thumbnailQuality: 0.6 }
    : { displayEdge: 1600, thumbnailEdge: 320, displayQuality: 0.78, thumbnailQuality: 0.65 };
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Không thể xử lý ảnh.")),
      "image/jpeg", quality);
  });
}

function renderImage(image: ImageBitmap | HTMLImageElement | HTMLCanvasElement, maxEdge: number) {
  const sourceWidth = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const sourceHeight = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Thiết bị không hỗ trợ xử lý ảnh.");
  context.fillStyle = "white";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return { canvas, width, height };
}

async function decodePhoto(file: File, preferBitmap: boolean): Promise<{ image: ImageBitmap | HTMLImageElement; dispose: () => void }> {
  if (preferBitmap && typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { image: bitmap, dispose: () => bitmap.close() };
    } catch { /* Fallback for browsers/codecs without createImageBitmap support. */ }
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Không đọc được ảnh. Hãy thử JPG hoặc chọn ảnh khác."));
      image.src = url;
    });
    return { image, dispose: () => URL.revokeObjectURL(url) };
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}

/** Re-encodes into two small files; no money/category/note is painted on pixels. */
export async function processPhoto(file: File, signal?: AbortSignal): Promise<ProcessedPhoto> {
  if (!ACCEPTED_TYPES.has(file.type))
    throw new Error("Chỉ nhận ảnh JPG, PNG, WebP hoặc HEIC/HEIF.");
  if (file.size === 0 || file.size > MAX_INPUT_BYTES)
    throw new Error("Ảnh trống hoặc lớn hơn 25 MB. Hãy chọn ảnh khác.");
  signal?.throwIfAborted();
  const ios = isIosPhotoEnvironment();
  const profile = photoProcessingProfile(ios);
  // Safari can expose OffscreenCanvas without a reliable worker decoder.
  // Avoid a timeout followed by decoding the same large camera image again.
  if (!ios && typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined") {
    try { return await processInWorker(file, signal); }
    catch { signal?.throwIfAborted(); /* Use canvas for unsupported browsers/codecs. */ }
  }
  const decoded = await decodePhoto(file, !ios);
  const canvases: HTMLCanvasElement[] = [];
  let disposed = false;
  try {
    signal?.throwIfAborted();
    const display = renderImage(decoded.image, profile.displayEdge);
    canvases.push(display.canvas);
    const thumbnail = renderImage(display.canvas, profile.thumbnailEdge);
    canvases.push(thumbnail.canvas);
    decoded.dispose();
    disposed = true;
    // Sequential encoding reduces peak memory on iOS camera photos.
    const thumbnailBlob = await canvasBlob(thumbnail.canvas, profile.thumbnailQuality);
    thumbnail.canvas.width = 0;
    thumbnail.canvas.height = 0;
    signal?.throwIfAborted();
    const displayBlob = await canvasBlob(display.canvas, profile.displayQuality);
    signal?.throwIfAborted();
    return { display: displayBlob, thumbnail: thumbnailBlob,
      width: display.width, height: display.height };
  } finally {
    if (!disposed) decoded.dispose();
    for (const canvas of canvases) { canvas.width = 0; canvas.height = 0; }
  }
}

function processInWorker(file: File, signal?: AbortSignal): Promise<ProcessedPhoto> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./photoImageWorker.ts", import.meta.url), { type: "module" });
    const cleanup = () => {
      worker.terminate();
      signal?.removeEventListener("abort", abort);
      clearTimeout(timeout);
    };
    const abort = () => { cleanup(); reject(new DOMException("Aborted", "AbortError")); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error("Image worker timed out")); }, 20_000);
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = (event: MessageEvent<{ result?: ProcessedPhoto }>) => {
      cleanup();
      if (event.data.result) resolve(event.data.result);
      else reject(new Error("Image worker unavailable"));
    };
    worker.onerror = () => { cleanup(); reject(new Error("Image worker unavailable")); };
    try { worker.postMessage(file); }
    catch (cause) { cleanup(); reject(cause); }
  });
}
