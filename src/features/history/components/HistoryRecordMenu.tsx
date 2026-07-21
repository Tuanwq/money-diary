import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { MouseEvent } from "react";

type HistoryRecordMenuProps = {
  label: string;
  onDelete: () => void;
  onEdit: () => void;
  onView: () => void;
};

export function HistoryRecordMenu({ label, onDelete, onEdit, onView }: HistoryRecordMenuProps) {
  function runAction(event: MouseEvent<HTMLButtonElement>, action: () => void) {
    event.currentTarget.closest("details")?.removeAttribute("open");
    action();
  }

  return (
    <details
      className="history-record-menu"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.currentTarget.removeAttribute("open");
        event.currentTarget.querySelector<HTMLElement>("summary")?.focus();
      }}
    >
      <summary aria-label={`Mở thao tác cho ${label}`}>
        <MoreHorizontal aria-hidden="true" size={21} />
      </summary>
      <div className="history-record-menu__content">
        <button type="button" onClick={(event) => runAction(event, onView)}>
          <Eye aria-hidden="true" size={16} /> Xem chi tiết
        </button>
        <button type="button" onClick={(event) => runAction(event, onEdit)}>
          <Pencil aria-hidden="true" size={16} /> Chỉnh sửa
        </button>
        <span aria-hidden="true" />
        <button type="button" className="is-danger" onClick={(event) => runAction(event, onDelete)}>
          <Trash2 aria-hidden="true" size={16} /> Xóa
        </button>
      </div>
    </details>
  );
}
