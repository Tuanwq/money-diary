import { useCallback, useEffect, useMemo, useState } from "react";
import type { PhotoAttachment } from "../types/photoFinance.ts";
import { createPhotoAttachmentRepository } from "../services/photoAttachmentRepository.ts";

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
    setStatus("loading");
    try {
      await repository.retryPendingDeletes(ownerId);
      const items = await repository.list(ownerId);
      const signed = await Promise.allSettled(items.map((item) =>
        repository.signedImage(item.thumbnailPath)));
      const urls: Record<string, string> = {};
      signed.forEach((result, index) => {
        if (result.status === "fulfilled") urls[items[index].id] = result.value;
      });
      setAttachments(items);
      setThumbnailUrls(urls);
      setError(signed.some((result) => result.status === "rejected")
        ? "Một số ảnh chưa tải được. Bấm thử lại." : "");
      setStatus("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được ảnh.");
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
