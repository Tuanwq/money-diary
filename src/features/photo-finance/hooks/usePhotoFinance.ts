import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PhotoAttachment } from "../types/photoFinance.ts";
import { createPhotoAttachmentRepository } from "../services/photoAttachmentRepository.ts";
import { photoFinanceErrorMessage } from "../services/photoFinanceErrors.ts";

export function usePhotoFinance(ownerId?: string) {
  const repository = useMemo(() => createPhotoAttachmentRepository(), []);
  const [data, setData] = useState<{ ownerId?: string; items: PhotoAttachment[] }>({ items: [] });
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "needs-login">("loading");
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const live = useRef(false);
  const recentlySaved = useRef(new Map<string, PhotoAttachment>());

  const refresh = useCallback(async () => {
    if (!live.current) return;
    recentlySaved.current.clear();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    if (!ownerId) {
      setData({ items: [] });
      setError("");
      setStatus("needs-login");
      return;
    }
    setStatus((current) => current === "ready" ? current : "loading");
    try {
      const items = await repository.list(ownerId, controller.signal);
      if (controller.signal.aborted) return;
      const merged = new Map(items.map((item) => [item.id, item]));
      for (const item of recentlySaved.current.values()) {
        if (item.ownerId === ownerId) merged.set(item.id, item);
      }
      setData({ ownerId, items: [...merged.values()] });
      setError("");
      setStatus("ready");
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(photoFinanceErrorMessage(cause, "Không tải được ảnh."));
      setStatus("error");
    }
  }, [ownerId, repository]);

  const acceptAttachment = useCallback((attachment: PhotoAttachment) => {
    if (!live.current || attachment.ownerId !== ownerId) return;
    recentlySaved.current.set(attachment.id, attachment);
    setData((current) => ({ ownerId, items: [attachment,
      ...(current.ownerId === ownerId ? current.items : []).filter((item) => item.id !== attachment.id)] }));
    setStatus("ready");
    setError("");
  }, [ownerId]);

  useEffect(() => {
    live.current = true;
    const timer = window.setTimeout(() => void refresh(), 0);
    // File cleanup must not block the first calendar render.
    const cleanup = window.setTimeout(() => {
      if (ownerId) void repository.retryPendingDeletes(ownerId).catch(() => undefined);
    }, 2500);
    return () => {
      live.current = false;
      window.clearTimeout(timer);
      window.clearTimeout(cleanup);
      request.current?.abort();
    };
  }, [refresh, ownerId, repository]);

  return { attachments: data.ownerId === ownerId ? data.items : EMPTY_ATTACHMENTS,
    status, error, refresh, repository, acceptAttachment };
}

const EMPTY_ATTACHMENTS: PhotoAttachment[] = [];
