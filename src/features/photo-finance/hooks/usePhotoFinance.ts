import { useCallback, useEffect, useMemo, useState } from "react";
import type { PhotoAttachment } from "../types/photoFinance.ts";
import { createPhotoAttachmentRepository } from "../services/photoAttachmentRepository.ts";
import { photoFinanceErrorMessage } from "../services/photoFinanceErrors.ts";

export function usePhotoFinance(ownerId?: string) {
  const repository = useMemo(() => createPhotoAttachmentRepository(), []);
  const [attachments, setAttachments] = useState<PhotoAttachment[]>([]);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "needs-login">("loading");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!ownerId) {
      setAttachments([]);
      setThumbnailUrls({});
      setStatus("needs-login");
      return;
    }
    setStatus((current) => current === "ready" ? current : "loading");
    try {
      await repository.retryPendingDeletes(ownerId).catch(() => undefined);
      const items = await repository.list(ownerId);
      const signed = await repository.signedImages(items.map((item) => item.thumbnailPath));
      const urls: Record<string, string> = {};
      items.forEach((item) => {
        const url = signed.get(item.thumbnailPath);
        if (url) urls[item.id] = url;
      });
      setAttachments(items);
      setThumbnailUrls(urls);
      setError(Object.keys(urls).length < items.length
        ? "Một số ảnh chưa tải được. Bấm thử lại." : "");
      setStatus("ready");
    } catch (cause) {
      setError(photoFinanceErrorMessage(cause, "Không tải được ảnh."));
      setStatus("error");
    }
  }, [ownerId, repository]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    const renew = window.setInterval(() => void refresh(), 50 * 60 * 1000);
    return () => { window.clearTimeout(timer); window.clearInterval(renew); };
  }, [refresh]);

  return { attachments, thumbnailUrls, status, error, refresh, repository };
}
