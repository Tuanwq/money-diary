import type { ProcessedPhoto } from "./photoImageProcessor.ts";

// Decoding/resizing camera images happens off the UI thread when supported.
globalThis.onmessage = async (event: MessageEvent<File>) => {
  let image: ImageBitmap | undefined;
  try {
    image = await createImageBitmap(event.data);
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const display = new OffscreenCanvas(width, height);
    const context = display.getContext("2d");
    if (!context) throw new Error("No canvas context");
    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    image.close();
    image = undefined;
    const thumbScale = Math.min(1, 320 / Math.max(width, height));
    const thumbnail = new OffscreenCanvas(Math.max(1, Math.round(width * thumbScale)),
      Math.max(1, Math.round(height * thumbScale)));
    const thumbnailContext = thumbnail.getContext("2d");
    if (!thumbnailContext) throw new Error("No thumbnail context");
    thumbnailContext.drawImage(display, 0, 0, thumbnail.width, thumbnail.height);
    const [displayBlob, thumbnailBlob] = await Promise.all([
      display.convertToBlob({ type: "image/jpeg", quality: 0.78 }),
      thumbnail.convertToBlob({ type: "image/jpeg", quality: 0.65 }),
    ]);
    const result: ProcessedPhoto = { display: displayBlob, thumbnail: thumbnailBlob, width, height };
    globalThis.postMessage({ result });
  } catch {
    globalThis.postMessage({ error: true });
  } finally { image?.close(); }
};
