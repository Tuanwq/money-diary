import { Pencil, X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

type HistoryDetailDrawerProps = {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  subtitle?: string;
  title: string;
};

export function HistoryDetailDrawer({ children, isOpen, onClose, onEdit, subtitle, title }: HistoryDetailDrawerProps) {
  const titleId = useId();
  const drawerRef = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("button")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])"
        )
      );
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
    <div className="history-drawer-layer" role="presentation">
      <button type="button" className="history-drawer-backdrop" aria-label="Đóng chi tiết" onClick={onClose} />
      <aside ref={drawerRef} className="history-detail-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header>
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" aria-label="Đóng" onClick={onClose}>
            <X aria-hidden="true" size={20} />
          </button>
        </header>
        <div className="history-detail-drawer__content">{children}</div>
        {onEdit && (
          <footer>
            <button type="button" onClick={onEdit}>
              <Pencil aria-hidden="true" size={17} /> Chỉnh sửa
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
