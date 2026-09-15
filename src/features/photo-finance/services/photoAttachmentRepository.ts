import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase.ts";
import { PHOTO_FINANCE_BUCKET, PHOTO_FINANCE_SOURCE_TYPE,
  type PhotoAttachment } from "../types/photoFinance.ts";
import { processPhoto } from "./photoImageProcessor.ts";

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
  const { data, error } = await client.auth.getUser();
  if (error || data.user?.id !== ownerId)
    throw new Error("Cần đăng nhập đúng tài khoản để lưu ảnh riêng tư.");
}

export function createPhotoAttachmentRepository(client: SupabaseClient = supabase) {
  return {
    async list(ownerId: string): Promise<PhotoAttachment[]> {
      await requireOwner(client, ownerId);
      const { data, error } = await client.from("money_diary_financial_attachments")
        .select("id,owner_id,source_type,source_id,storage_path,thumbnail_path,is_cover,width,height,created_at")
        .eq("owner_id", ownerId).order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as AttachmentRow[]).map(fromRow);
    },

    async signedImage(path: string) {
      const { data, error } = await client.storage.from(PHOTO_FINANCE_BUCKET)
        .createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) throw error ?? new Error("Không tải được ảnh riêng tư.");
      return data.signedUrl;
    },

    async upload(ownerId: string, transactionId: string, file: File, isCover: boolean): Promise<PhotoAttachment> {
      await requireOwner(client, ownerId);
      if (!transactionId.trim()) throw new Error("Giao dịch chưa được lưu.");
      const image = await processPhoto(file);
      const id = crypto.randomUUID();
      const storagePath = `${ownerId}/${id}/display.jpg`;
      const thumbnailPath = `${ownerId}/${id}/thumbnail.jpg`;
      const storage = client.storage.from(PHOTO_FINANCE_BUCKET);
      const display = await storage.upload(storagePath, image.display,
        { contentType: "image/jpeg", upsert: false });
      if (display.error) throw display.error;
      try {
        const thumb = await storage.upload(thumbnailPath, image.thumbnail,
          { contentType: "image/jpeg", upsert: false });
        if (thumb.error) throw thumb.error;
        const { data, error } = await client.from("money_diary_financial_attachments")
          .insert({ id, owner_id: ownerId, source_type: PHOTO_FINANCE_SOURCE_TYPE,
            source_id: transactionId, storage_path: storagePath,
            thumbnail_path: thumbnailPath, is_cover: isCover,
            width: image.width, height: image.height })
          .select("id,owner_id,source_type,source_id,storage_path,thumbnail_path,is_cover,width,height,created_at")
          .single();
        if (error || !data) throw error ?? new Error("Không liên kết được ảnh.");
        return fromRow(data as AttachmentRow);
      } catch (error) {
        await storage.remove([storagePath, thumbnailPath]);
        throw error;
      }
    },

    async delete(ownerId: string, attachment: PhotoAttachment) {
      await requireOwner(client, ownerId);
      if (attachment.ownerId !== ownerId) throw new Error("Ảnh không thuộc tài khoản này.");
      const { error } = await client.from("money_diary_financial_attachments")
        .delete().eq("id", attachment.id).eq("owner_id", ownerId);
      if (error) throw error;
      const removed = await client.storage.from(PHOTO_FINANCE_BUCKET)
        .remove([attachment.storagePath, attachment.thumbnailPath]);
      if (removed.error) throw removed.error;
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
