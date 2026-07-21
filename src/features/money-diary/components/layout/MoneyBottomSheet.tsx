import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { X } from "lucide-react";

type MoneyBottomSheetProps = {
  children: ReactNode;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
  title: string;
};

export function MoneyBottomSheet({
  children,
  description,
  isOpen,
  onClose,
  returnFocusRef,
  title,
}: MoneyBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const returnFocusElement = returnFocusRef?.current;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      sheetRef.current
        ?.querySelector<HTMLElement>(
          "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])"
        )
        ?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !sheetRef.current) return;

      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
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
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusElement?.focus();
    };
  }, [isOpen, onClose, returnFocusRef]);

  if (!isOpen) return null;

  return (
    <div className="money-sheet-layer" role="presentation">
      <button
        type="button"
        className="money-sheet-backdrop"
        aria-label="Đóng bảng chọn"
        onClick={onClose}
      />

      <div
        ref={sheetRef}
        className="money-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="money-sheet-title"
        aria-describedby={description ? "money-sheet-description" : undefined}
      >
        <div className="money-sheet-handle" aria-hidden="true" />
        <header className="money-sheet-header">
          <div className="money-sheet-heading">
            <h2 id="money-sheet-title">{title}</h2>
            {description && (
              <p id="money-sheet-description">{description}</p>
            )}
          </div>
          <button
            type="button"
            className="money-icon-button"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="money-sheet-content">{children}</div>
      </div>
    </div>
  );
}
