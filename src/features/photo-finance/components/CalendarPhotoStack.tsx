import type { PhotoAttachment } from "../types/photoFinance.ts";
import { getCalendarPhotoStack } from "../services/photoFinanceModel.ts";

export function CalendarPhotoStack({ attachments, thumbnailUrls }: {
  attachments: PhotoAttachment[]; thumbnailUrls: Record<string, string>;
}) {
  const { visible, extraCount } = getCalendarPhotoStack(attachments);
  if (visible.length === 0) return <span className="photo-finance-empty-cell" aria-hidden="true" />;
  return <span className="photo-finance-stack" aria-label={`${attachments.length} ảnh trong ngày`}>
    {visible.map((attachment, index) => thumbnailUrls[attachment.id]
      ? <img alt="" className={`photo-finance-stack-image is-${index}`} key={attachment.id}
        loading="lazy" src={thumbnailUrls[attachment.id]} />
      : <span className={`photo-finance-stack-image is-${index} is-unavailable`} key={attachment.id} />)}
    {extraCount > 0 && <span className="photo-finance-stack-extra">+{extraCount}</span>}
  </span>;
}
