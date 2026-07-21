import { AlertTriangle, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

type DeleteHistoryRecordDialogProps = {
  description: string;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
};

export function DeleteHistoryRecordDialog({ description, isOpen, onCancel, onConfirm, title }: DeleteHistoryRecordDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!isOpen) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancelRef.current();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="history-delete-layer" role="presentation">
      <button type="button" className="history-delete-backdrop" aria-label="Đóng xác nhận" onClick={onCancel} />
      <section ref={dialogRef} className="history-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <span aria-hidden="true"><AlertTriangle size={23} /></span>
        <button type="button" className="history-delete-dialog__close" aria-label="Đóng" onClick={onCancel}>
          <X aria-hidden="true" size={19} />
        </button>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        <div>
          <button ref={cancelRef} type="button" onClick={onCancel}>Hủy</button>
          <button type="button" className="is-danger" onClick={onConfirm}>Xóa</button>
        </div>
      </section>
    </div>
  );
}
