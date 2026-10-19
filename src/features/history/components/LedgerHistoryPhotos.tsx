import { useEffect, useState } from "react";
import { createPhotoAttachmentRepository } from "../../photo-finance/services/photoAttachmentRepository.ts";

const repository = createPhotoAttachmentRepository();

export function LedgerHistoryPhotos({ ownerId, transactionId }: { ownerId?: string; transactionId: string }) {
  const [result, setResult] = useState<{ key: string; photos: { thumbnail: string; display: string }[] }>(
    { key: "", photos: [] });
  const key = `${ownerId ?? ""}:${transactionId}`;
  const photos = result.key === key ? result.photos : [];
  useEffect(() => {
    if (!ownerId) return;
    let active = true;
    void repository.listForTransaction(ownerId, transactionId).then(async (items) => {
      const urls = await repository.signedImages(items.flatMap((item) => [item.thumbnailPath, item.storagePath]));
      const photos = items.flatMap((item) => {
        const thumbnail = urls.get(item.thumbnailPath);
        const display = urls.get(item.storagePath);
        return thumbnail && display ? [{ thumbnail, display }] : [];
      });
      if (active) setResult({ key, photos });
    }).catch(() => { if (active) setResult({ key, photos: [] }); });
    return () => { active = false; };
  }, [ownerId, transactionId, key]);
  if (!photos.length) return null;
  return <section className="history-detail-text"><h3>Ảnh liên quan</h3>
    <div className="ledger-history-photos">{photos.map((photo, index) =>
      <a href={photo.display} key={photo.display} rel="noreferrer" target="_blank">
        <img alt={`Ảnh giao dịch ${index + 1}`} loading="lazy" src={photo.thumbnail} /></a>)}</div>
  </section>;
}
