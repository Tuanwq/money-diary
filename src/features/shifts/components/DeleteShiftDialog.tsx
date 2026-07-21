import { AlertTriangle, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { HUB_TYPE_LABEL } from "../../../constants/hanoiHub";
import type { HubEntry } from "../../../types/hub";
import { formatReportDate } from "../../../utils/date";

type DeleteShiftDialogProps = {
  entry: HubEntry | null;
  error?: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteShiftDialog({
  entry,
  error,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteShiftDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!entry) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeleting) onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [entry, isDeleting, onCancel]);

  if (!entry) return null;

  return (
    <div className="delete-shift-dialog" role="presentation">
      <button
        type="button"
        className="delete-shift-dialog__backdrop"
        aria-label="Đóng hộp thoại"
        disabled={isDeleting}
        onClick={onCancel}
      />
      <section
        className="delete-shift-dialog__panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="delete-shift-dialog__icon" aria-hidden="true">
          <AlertTriangle size={24} />
        </div>
        <button
          type="button"
          className="delete-shift-dialog__close"
          aria-label="Đóng"
          disabled={isDeleting}
          onClick={onCancel}
        >
          <X aria-hidden="true" size={19} />
        </button>
        <h2 id={titleId}>Xóa ca làm?</h2>
        <p id={descriptionId}>
          Bạn sắp xóa ca ngày <strong>{formatReportDate(entry.date)}</strong>, {HUB_TYPE_LABEL[entry.hubType]}, khung giờ <strong>{entry.shiftName || "chưa nhập"}</strong>. Thao tác này sẽ cập nhật lại tiền trong nhật ký.
        </p>
        {error && (
          <p className="delete-shift-dialog__error" role="alert">
            {error}
          </p>
        )}
        <div className="delete-shift-dialog__actions">
          <button ref={cancelButtonRef} type="button" disabled={isDeleting} onClick={onCancel}>
            Hủy
          </button>
          <button type="button" className="is-danger" disabled={isDeleting} onClick={onConfirm}>
            {isDeleting ? "Đang xóa..." : "Xóa ca"}
          </button>
        </div>
      </section>
    </div>
  );
}
