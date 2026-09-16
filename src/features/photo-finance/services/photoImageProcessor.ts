export type ProcessedPhoto = {
  display: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
};

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Không thể xử lý ảnh.")),
      "image/jpeg", quality);
  });
}

function renderImage(image: ImageBitmap | HTMLImageElement, maxEdge: number) {
  const sourceWidth = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const sourceHeight = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Thiết bị không hỗ trợ xử lý ảnh.");
  context.fillStyle = "white";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return { canvas, width, height };
}

async function decodePhoto(file: File): Promise<{ image: ImageBitmap | HTMLImageElement; dispose: () => void }> {
  if (typeof createImageBitmap === "function") {
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
export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  if (!ACCEPTED_TYPES.has(file.type))
    throw new Error("Chỉ nhận ảnh JPG, PNG hoặc WebP.");
  if (file.size === 0 || file.size > MAX_INPUT_BYTES)
    throw new Error("Ảnh trống hoặc lớn hơn 25 MB. Hãy chọn ảnh khác.");
  const decoded = await decodePhoto(file);
  try {
    const display = renderImage(decoded.image, 1600);
    const thumbnail = renderImage(decoded.image, 320);
    return { display: await canvasBlob(display.canvas, 0.82),
      thumbnail: await canvasBlob(thumbnail.canvas, 0.68),
      width: display.width, height: display.height };
  } finally { decoded.dispose(); }
}
