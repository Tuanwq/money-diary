import { Camera, ImageOff, Plus } from "lucide-react";
import { useState } from "react";
import type { PhotoGalleryItem } from "../services/photoGalleryModel.ts";
import { getPhotoMoneyLabel } from "../services/photoGalleryModel.ts";
import "./photoGalleryGrid.css";

function PhotoTile({ item, url, onOpen }: { item: PhotoGalleryItem; url?: string; onOpen: () => void }) {
  const [failedUrl, setFailedUrl] = useState("");
  const { transaction } = item;
  const money = getPhotoMoneyLabel(transaction);
  const visibleUrl = url && url !== failedUrl ? url : undefined;
  return <button type="button" className="photo-gallery-tile"
    aria-label={`${money}, ${transaction.category || transaction.note || "Giao dịch"}, ngày ${transaction.date}`}
    onClick={onOpen}>
    {visibleUrl
      ? <img src={visibleUrl} alt="" loading="lazy" decoding="async" onError={() => setFailedUrl(visibleUrl)} />
      : <span className="photo-gallery-placeholder"><ImageOff size={23} aria-hidden="true" /></span>}
    <span className={`photo-gallery-money is-${transaction.type}`}>{money}</span>
  </button>;
}

export function PhotoGalleryGrid({ items, urls, loading, onCapture, onOpenPhoto, onShowMore, hasMore }: {
  items: PhotoGalleryItem[];
  urls: Record<string, string>;
  loading: boolean;
  onCapture: () => void;
  onOpenPhoto: (item: PhotoGalleryItem) => void;
  onShowMore: () => void;
  hasMore: boolean;
}) {
  return <section className="photo-gallery" aria-label="Ảnh giao dịch">
    <div className="photo-gallery-header">
      <div><span><Camera size={15} aria-hidden="true" /> Ký ức tài chính</span>
        <h2>Ảnh</h2><p>Ảnh mới nhất lên trước · Chạm vào ảnh để xem câu chuyện.</p></div>
      <button className="photo-gallery-capture" type="button" onClick={onCapture}>
        <Plus size={17} aria-hidden="true" /> Ghi ảnh
      </button>
    </div>
    {items.length ? <>
      <div className="photo-gallery-grid">
        {items.map((item) => <PhotoTile item={item} key={item.attachment.id}
          url={urls[item.attachment.id]} onOpen={() => onOpenPhoto(item)} />)}
      </div>
      {hasMore && <button type="button" className="photo-gallery-more" onClick={onShowMore}>Xem thêm ảnh</button>}
    </> : loading ? <div className="photo-gallery-empty" role="status">Đang tải ảnh riêng tư...</div>
    : <div className="photo-gallery-empty"><Camera size={28} aria-hidden="true" />
      <strong>Chưa có ảnh tài chính</strong><p>Ảnh đã gắn với giao dịch sẽ xuất hiện ở đây.</p>
      <button type="button" onClick={onCapture}>Ghi ảnh đầu tiên</button></div>}
  </section>;
}
