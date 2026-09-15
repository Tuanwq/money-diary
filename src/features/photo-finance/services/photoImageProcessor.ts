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

function renderImage(bitmap: ImageBitmap, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Thiết bị không hỗ trợ xử lý ảnh.");
  context.fillStyle = "white";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  return { canvas, width, height };
}

/** Re-encodes into two small files; no money/category/note is painted on pixels. */
export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  if (!ACCEPTED_TYPES.has(file.type))
    throw new Error("Chỉ nhận ảnh JPG, PNG hoặc WebP.");
  if (file.size === 0 || file.size > MAX_INPUT_BYTES)
    throw new Error("Ảnh trống hoặc lớn hơn 25 MB. Hãy chọn ảnh khác.");
  if (typeof createImageBitmap !== "function")
    throw new Error("Thiết bị chưa hỗ trợ đọc ảnh này. Hãy chọn ảnh từ thư viện.");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("Không đọc được ảnh. Hãy thử JPG hoặc chọn ảnh khác."); }
  try {
    const display = renderImage(bitmap, 1600);
    const thumbnail = renderImage(bitmap, 320);
    return { display: await canvasBlob(display.canvas, 0.82),
      thumbnail: await canvasBlob(thumbnail.canvas, 0.68),
      width: display.width, height: display.height };
  } finally { bitmap.close(); }
}
