import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

type GoalSheetProps = {
  children: ReactNode;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
};

export function GoalSheet({
  children,
  description,
  isOpen,
  onClose,
  title,
}: GoalSheetProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="goal-sheet" role="presentation">
      <button
        type="button"
        className="goal-sheet__backdrop"
        aria-label="Đóng biểu mẫu"
        onClick={onClose}
      />
      <section
        className="goal-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="goal-sheet__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="goal-sheet__close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>
        <div className="goal-sheet__body">{children}</div>
      </section>
    </div>
  );
}
