import { useEffect, useState } from "react";
import type { PhotoAttachment } from "../types/photoFinance.ts";
import type { createPhotoAttachmentRepository } from "../services/photoAttachmentRepository.ts";

export function usePhotoThumbnails(items: PhotoAttachment[], repository: ReturnType<typeof createPhotoAttachmentRepository>) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const signed = await repository.signedImages(items.map((item) => item.thumbnailPath));
        if (!active) return;
        setUrls(Object.fromEntries(items.flatMap((item) => {
          const url = signed.get(item.thumbnailPath);
          return url ? [[item.id, url]] : [];
        })));
        setError(signed.size < items.length ? "Một số ảnh chưa tải được. Bấm thử lại." : "");
      } catch { if (active) setError("Không tải được ảnh. Bấm thử lại."); }
    }
    void load();
    const renew = window.setInterval(() => void load(), 50 * 60 * 1000);
    return () => { active = false; window.clearInterval(renew); };
  }, [items, repository, attempt]);
  return { urls, error, retry: () => setAttempt((value) => value + 1) };
}
