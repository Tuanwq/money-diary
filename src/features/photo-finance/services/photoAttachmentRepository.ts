import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase.ts";
import { PHOTO_FINANCE_BUCKET, PHOTO_FINANCE_SOURCE_TYPE,
  type PhotoAttachment } from "../types/photoFinance.ts";
import { processPhoto, type ProcessedPhoto } from "./photoImageProcessor.ts";
import { photoFinanceErrorMessage, retryPhotoOperation } from "./photoFinanceErrors.ts";
import { createSignedPhotoCache } from "./signedPhotoCache.ts";
import { uploadProcessedPhotoImages } from "./photoUploadService.ts";

type AttachmentRow = {
  id: string; owner_id: string; source_type: string; source_id: string;
  storage_path: string; thumbnail_path: string; is_cover: boolean;
  width: number; height: number; created_at: string;
};

function fromRow(row: AttachmentRow): PhotoAttachment {
  return { id: row.id, ownerId: row.owner_id, sourceType: row.source_type,
    sourceId: row.source_id, storagePath: row.storage_path,
    thumbnailPath: row.thumbnail_path, isCover: row.is_cover,
    width: row.width, height: row.height, createdAt: row.created_at };
}

async function requireOwner(client: SupabaseClient, ownerId: string) {
  const { data, error } = await client.auth.getSession();
  if (error || data.session?.user.id !== ownerId)
    throw new Error("Cần đăng nhập đúng tài khoản để lưu ảnh riêng tư.");
}

async function unwrap<T>(operation: () => PromiseLike<{ data: T; error: unknown }>, retries = 1) {
  return retryPhotoOperation(async () => {
    const result = await operation();
    if (result.error) throw result.error;
    return result.data;
  }, retries);
}

export function createPhotoAttachmentRepository(client: SupabaseClient = supabase) {
  let readyOwner = "";
  let readyUntil = 0;
  let preparing: { ownerId: string; promise: Promise<void> } | null = null;
  const images = createSignedPhotoCache(async (paths) => {
    const { data, error } = await client.storage.from(PHOTO_FINANCE_BUCKET)
      .createSignedUrls(paths, 3600);
    if (error) throw new Error(photoFinanceErrorMessage(error, "Không tải được ảnh riêng tư."));
    const urls = new Map<string, string>();
    for (const item of data ?? []) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    return urls;
  });
  return {
    async prepare(ownerId: string) {
      await requireOwner(client, ownerId);
      if (readyOwner === ownerId && Date.now() < readyUntil) return;
      if (preparing?.ownerId === ownerId) return preparing.promise;
      const promise = (async () => {
        try {
          await unwrap(() => client.from("money_diary_financial_attachments")
            .select("id").eq("owner_id", ownerId).limit(1));
          readyOwner = ownerId;
          readyUntil = Date.now() + 5 * 60 * 1000;
        } catch (cause) { throw new Error(photoFinanceErrorMessage(cause), { cause }); }
      })();
      preparing = { ownerId, promise };
      try {
        await promise;
      } finally {
        if (preparing?.promise === promise) preparing = null;
      }
    },

    async list(ownerId: string, signal?: AbortSignal): Promise<PhotoAttachment[]> {
      await requireOwner(client, ownerId);
      try {
        const data = await unwrap(() => {
          const query = client.from("money_diary_financial_attachments")
          .select("id,owner_id,source_type,source_id,storage_path,thumbnail_path,is_cover,width,height,created_at")
          .eq("owner_id", ownerId).is("deleted_at", null)
          .order("created_at", { ascending: false });
          return signal ? query.abortSignal(signal) : query;
        });
        readyOwner = ownerId;
        readyUntil = Date.now() + 5 * 60 * 1000;
        return ((data ?? []) as AttachmentRow[]).map(fromRow);
      } catch (cause) {
        throw new Error(photoFinanceErrorMessage(cause, "Không tải được danh sách ảnh."), { cause });
      }
    },

    async signedImage(path: string) {
      const url = (await images.get([path])).get(path);
      if (!url) throw new Error("Không tải được ảnh riêng tư.");
      return url;
    },

    signedImages: images.get,
    invalidateImage: images.invalidate,

    async upload(ownerId: string, transactionId: string, file: File, isCover: boolean,
      attachmentId?: string, preparedImage?: ProcessedPhoto): Promise<PhotoAttachment> {
      await requireOwner(client, ownerId);
      if (!transactionId.trim()) throw new Error("Giao dịch chưa được lưu.");
      const image = preparedImage ?? await processPhoto(file);
      const id = attachmentId ?? crypto.randomUUID();
      const storagePath = `${ownerId}/${id}/display.jpg`;
      const thumbnailPath = `${ownerId}/${id}/thumbnail.jpg`;
      const storage = client.storage.from(PHOTO_FINANCE_BUCKET);
      try {
        // Safari on unstable mobile networks may reject a Blob upload with
        // "Load failed" after the request starts. Small ArrayBuffers avoid the
        // multipart Blob path; sequential requests also reduce memory/network
        // pressure. Stable paths make every retry safe to repeat.
        await uploadProcessedPhotoImages(image, storagePath, thumbnailPath,
          (path, bytes) => storage.upload(path, bytes,
            { contentType: "image/jpeg", upsert: true }));
        const data = await unwrap(() => client.from("money_diary_financial_attachments")
          .upsert({ id, owner_id: ownerId, source_type: PHOTO_FINANCE_SOURCE_TYPE,
            source_id: transactionId, storage_path: storagePath,
            thumbnail_path: thumbnailPath, is_cover: isCover,
            width: image.width, height: image.height }, { onConflict: "id" })
          .select("id,owner_id,source_type,source_id,storage_path,thumbnail_path,is_cover,width,height,created_at")
          .single(), 2);
        if (!data) throw new Error("Không liên kết được ảnh.");
        images.invalidate(storagePath);
        images.invalidate(thumbnailPath);
        return fromRow(data as AttachmentRow);
      } catch (error) {
        // A timeout can follow a successful metadata commit. Preserve these files;
        // retrying with the same attachment ID safely reuses the same paths.
        throw new Error(photoFinanceErrorMessage(error), { cause: error });
      }
    },

    async delete(ownerId: string, attachment: PhotoAttachment) {
      await requireOwner(client, ownerId);
      if (attachment.ownerId !== ownerId) throw new Error("Ảnh không thuộc tài khoản này.");
      const { error } = await client.from("money_diary_financial_attachments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", attachment.id).eq("owner_id", ownerId);
      if (error) throw error;
      const removed = await client.storage.from(PHOTO_FINANCE_BUCKET)
        .remove([attachment.storagePath, attachment.thumbnailPath]);
      if (removed.error) throw new Error("Ảnh đã ẩn; dọn file sẽ được thử lại khi tải dữ liệu.");
      const deleted = await client.from("money_diary_financial_attachments")
        .delete().eq("id", attachment.id).eq("owner_id", ownerId);
      if (deleted.error) throw deleted.error;
    },

    async retryPendingDeletes(ownerId: string) {
      await requireOwner(client, ownerId);
      const { data, error } = await client.from("money_diary_financial_attachments")
        .select("id,storage_path,thumbnail_path")
        .eq("owner_id", ownerId).not("deleted_at", "is", null);
      if (error) return;
      for (const item of data ?? []) {
        const removed = await client.storage.from(PHOTO_FINANCE_BUCKET)
          .remove([item.storage_path, item.thumbnail_path]);
        if (!removed.error) await client.from("money_diary_financial_attachments")
          .delete().eq("id", item.id).eq("owner_id", ownerId);
      }
    },

    async deleteForTransaction(ownerId: string, transactionId: string) {
      const items = (await this.list(ownerId)).filter((item) =>
        item.sourceType === PHOTO_FINANCE_SOURCE_TYPE && item.sourceId === transactionId);
      for (const item of items) await this.delete(ownerId, item);
    },

    async makeCover(ownerId: string, attachment: PhotoAttachment, dayItems: PhotoAttachment[]) {
      await requireOwner(client, ownerId);
      if (attachment.ownerId !== ownerId) throw new Error("Ảnh không thuộc tài khoản này.");
      const { error: clearError } = await client.from("money_diary_financial_attachments")
        .update({ is_cover: false }).eq("owner_id", ownerId)
        .in("id", dayItems.map((item) => item.id));
      if (clearError) throw clearError;
      const { error } = await client.from("money_diary_financial_attachments")
        .update({ is_cover: true }).eq("owner_id", ownerId).eq("id", attachment.id);
      if (error) throw error;
    },
  };
}
